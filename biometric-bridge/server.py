"""
gymos biometric bridge — talks directly to the ESSL/ZKTeco fingerprint terminal
over its native TCP protocol (via pyzk) and exposes a small local HTTP/SSE API
that the gymos frontend calls for enroll / force-open / synchronize / refresh
and live punch events.

Run on any machine that can reach the device on the LAN (the same box that was
running the EasyBio dashboard is fine):

    pip install -r requirements.txt
    ESSL_DEVICE_IP=192.168.1.201 python server.py

It serves HTTPS (self-signed cert, auto-generated on first run and reused after
that) so it can be reached from a gymos page loaded over https:// without the
browser blocking it as mixed content. The one unavoidable manual step: the
first time, in a browser on the machine you'll use gymos from, open
    https://<this-machine's-LAN-IP>:8090/api/status
directly and click through the "not secure" warning once — that tells the
browser to trust this specific certificate. After that, gymos's own fetch
calls to the same address work normally. Then point gymos Settings > Biometric
Bridge at:
    https://<this-machine's-LAN-IP>:8090

Notes / real hardware constraints (not hidden — surfaced as errors, not fake success):
  - The device only accepts one active TCP session at a time. Live capture is
    paused automatically whenever a command (enroll/sync/refresh/force-open) needs
    the connection, then resumed.
  - Enrollment happens ON the device: /api/enroll blocks while the person places
    the same finger on the sensor up to 3 times, as prompted by the device itself.
  - Force-open only works if this specific terminal has a wired relay/aux output
    and firmware that exposes the unlock command. If it doesn't, the endpoint
    returns a clear error instead of pretending the door opened.
"""

import ipaddress
import json
import os
import queue
import socket
import subprocess
import threading
import time
from datetime import datetime, timedelta, timezone

from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from zk import ZK, const

DEVICE_IP = os.environ.get("ESSL_DEVICE_IP", "192.168.1.201")
DEVICE_PORT = int(os.environ.get("ESSL_DEVICE_PORT", "4370"))
DEVICE_PASSWORD = int(os.environ.get("ESSL_DEVICE_PASSWORD", "0"))
BRIDGE_PORT = int(os.environ.get("BRIDGE_PORT", "8090"))

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MAPPING_FILE = os.path.join(BASE_DIR, "enrollments.json")
STATE_FILE = os.path.join(BASE_DIR, "state.json")
CERT_FILE = os.path.join(BASE_DIR, "bridge_cert.pem")
KEY_FILE = os.path.join(BASE_DIR, "bridge_key.pem")

app = Flask(__name__)
CORS(app)

_pause_live = threading.Event()
_live_paused_ack = threading.Event()
_live_running = threading.Event()
_live_thread = None
_sse_clients: list = []
_file_lock = threading.Lock()


def load_json(path, default):
    with _file_lock:
        if not os.path.exists(path):
            return default
        with open(path) as f:
            return json.load(f)


def save_json(path, data):
    with _file_lock:
        with open(path, "w") as f:
            json.dump(data, f, indent=2)


def load_mapping():
    return load_json(MAPPING_FILE, {})


def save_mapping(m):
    save_json(MAPPING_FILE, m)


def load_state():
    return load_json(STATE_FILE, {"lastTimestamp": None})


def save_state(s):
    save_json(STATE_FILE, s)


def next_uid(mapping):
    used = {int(v["uid"]) for v in mapping.values()} if mapping else set()
    uid = 1
    while uid in used:
        uid += 1
    return uid


def with_device(fn, timeout=8):
    """Run fn(conn) against a fresh exclusive connection, pausing live capture first."""
    _pause_live.set()
    try:
        if _live_running.is_set():
            _live_paused_ack.wait(timeout=5)
        zk = ZK(DEVICE_IP, port=DEVICE_PORT, timeout=timeout, password=DEVICE_PASSWORD)
        conn = zk.connect()
        try:
            return fn(conn)
        finally:
            try:
                conn.disconnect()
            except Exception:
                pass
    finally:
        _pause_live.clear()
        _live_paused_ack.clear()


def show_windows_toast(title, message):
    """Native OS notification for a live punch — shows even when no browser
    tab has gymos open, matching what EasyBio's toaster.py did. Windows only;
    a no-op elsewhere. Shells out to PowerShell's WinRT toast API instead of
    adding a pip dependency, since powershell.exe ships with every Windows box."""
    if os.name != "nt":
        return
    try:
        safe_title = title.replace('"', "'")
        safe_message = message.replace('"', "'")
        ps_script = (
            "[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, "
            "ContentType=WindowsRuntime] | Out-Null; "
            "[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, "
            "ContentType=WindowsRuntime] | Out-Null; "
            "$xml = New-Object Windows.Data.Xml.Dom.XmlDocument; "
            "$xml.LoadXml('<toast><visual><binding template=\"ToastGeneric\">"
            f"<text>{safe_title}</text><text>{safe_message}</text>"
            "</binding></visual></toast>'); "
            "$toast = New-Object Windows.UI.Notifications.ToastNotification $xml; "
            "[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier"
            "('gymos biometric bridge').Show($toast)"
        )
        subprocess.Popen(
            ["powershell", "-NoProfile", "-WindowStyle", "Hidden", "-Command", ps_script],
            creationflags=subprocess.CREATE_NO_WINDOW,
        )
    except Exception as e:
        print(f"[bridge] Toast notification failed (non-fatal): {e}")


def _mark_seen(iso_timestamp):
    state = load_state()
    if not state.get("lastTimestamp") or iso_timestamp > state["lastTimestamp"]:
        state["lastTimestamp"] = iso_timestamp
        save_state(state)


def _broadcast(event):
    dead = []
    for q in _sse_clients:
        try:
            q.put_nowait(event)
        except Exception:
            dead.append(q)
    for d in dead:
        if d in _sse_clients:
            _sse_clients.remove(d)


def _live_capture_loop():
    while True:
        if _pause_live.is_set():
            _live_paused_ack.set()
            time.sleep(0.2)
            continue
        try:
            zk = ZK(DEVICE_IP, port=DEVICE_PORT, timeout=10, password=DEVICE_PASSWORD)
            conn = zk.connect()
            _live_running.set()
            for att in conn.live_capture(new_timeout=1000):
                if _pause_live.is_set():
                    break
                if att is None:
                    continue
                mapping = load_mapping()
                by_device_id = {v.get("deviceUserId"): v for v in mapping.values()}
                person = by_device_id.get(str(att.user_id), {})
                iso_ts = att.timestamp.isoformat()
                person_name = person.get("personName") or f"Unknown device ID {att.user_id}"
                validity = person.get("validity")
                event = {
                    "deviceUserId": str(att.user_id),
                    "personId": person.get("personId"),
                    "personName": person_name,
                    "personType": person.get("personType"),
                    "timestamp": iso_ts,
                    "punch": att.punch,
                    "status": att.status,
                    "validity": validity,
                }
                _mark_seen(iso_ts)
                _broadcast(event)

                punch_label = "Checked out" if att.punch == 1 else "Checked in"
                toast_lines = [f"{punch_label} at {att.timestamp.strftime('%d %b %Y, %I:%M %p')}"]
                if validity and validity.get("label"):
                    toast_lines.append(str(validity["label"]))
                show_windows_toast(person_name, "\n".join(toast_lines))
            try:
                conn.disconnect()
            except Exception:
                pass
        except Exception:
            time.sleep(3)  # device unreachable / rebooting — back off and retry
        finally:
            _live_running.clear()
        time.sleep(0.2)


def start_live_capture_thread():
    global _live_thread
    if _live_thread is None or not _live_thread.is_alive():
        _live_thread = threading.Thread(target=_live_capture_loop, daemon=True)
        _live_thread.start()


@app.route("/api/status")
def status():
    def fn(conn):
        users = conn.get_users()
        # get_users() calls read_sizes() internally, populating these —
        # exactly what the terminal's own "Device Capacity" screen shows.
        # Attendance punches themselves aren't tagged fingerprint vs. face
        # (the ZK protocol logs a punch as just user + time + direction
        # either way), so every check-in already gets captured regardless
        # of which sensor verified it — this is purely enrollment capacity.
        return {
            "firmware": conn.get_firmware_version(),
            "serialNumber": conn.get_serialnumber(),
            "platform": conn.get_platform(),
            "userCount": len(users),
            "fingerprintsEnrolled": getattr(conn, "fingers", None),
            "fingerprintsCapacity": getattr(conn, "fingers_cap", None),
            "facesEnrolled": getattr(conn, "faces", None),
            "facesCapacity": getattr(conn, "faces_cap", None),
        }

    try:
        data = with_device(fn)
        return jsonify({"success": True, "connected": True, "ip": DEVICE_IP, "port": DEVICE_PORT, **data})
    except Exception as e:
        return jsonify({"success": False, "connected": False, "error": str(e)}), 502


@app.route("/api/refresh", methods=["POST"])
def refresh():
    return status()


@app.route("/api/enroll", methods=["POST"])
def enroll():
    body = request.get_json(force=True) or {}
    person_id = body.get("personId")
    person_name = (body.get("personName") or "").strip()
    person_type = body.get("personType", "trainee")
    if not person_id or not person_name:
        return jsonify({"success": False, "error": "personId and personName are required"}), 400

    mapping = load_mapping()
    existing = mapping.get(person_id)
    uid = existing["uid"] if existing else next_uid(mapping)

    def fn(conn):
        conn.set_user(
            uid=uid,
            name=person_name[:24],
            privilege=const.USER_DEFAULT,
            password="",
            group_id="",
            user_id=str(uid),
        )
        return conn.enroll_user(uid=uid, temp_id=0, user_id=str(uid))

    try:
        ok = with_device(fn, timeout=30)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 502

    if not ok:
        return jsonify({
            "success": False,
            "error": "Device did not confirm enrollment. Ask the person to place the same finger on "
                     "the sensor 3 times when the terminal beeps, then retry.",
        }), 502

    mapping[person_id] = {
        "uid": uid,
        "deviceUserId": str(uid),
        "personId": person_id,
        "personName": person_name,
        "personType": person_type,
        "enrolledAt": datetime.utcnow().isoformat(),
    }
    save_mapping(mapping)
    return jsonify({"success": True, "templateId": f"zk-uid-{uid}", "deviceUserId": str(uid)})


@app.route("/api/enroll/<person_id>", methods=["DELETE"])
def delete_enrollment(person_id):
    mapping = load_mapping()
    entry = mapping.get(person_id)
    if not entry:
        return jsonify({"success": False, "error": "Not enrolled on this device"}), 404

    def fn(conn):
        conn.delete_user(uid=int(entry["uid"]))
        return True

    try:
        with_device(fn)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 502

    del mapping[person_id]
    save_mapping(mapping)
    return jsonify({"success": True})


@app.route("/api/users")
def list_users():
    """Lists every user already registered on the device (including ones enrolled
    long before this bridge existed, e.g. via EasyBio), cross-referenced against
    our own personId mapping so already-linked ones show who they belong to."""
    def fn(conn):
        return conn.get_users()

    try:
        users = with_device(fn, timeout=20)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 502

    mapping = load_mapping()
    by_uid = {str(v["uid"]): v for v in mapping.values()}
    result = []
    for u in users:
        uid = str(u.uid)
        linked = by_uid.get(uid)
        result.append({
            "uid": uid,
            "deviceName": u.name,
            "deviceUserId": str(u.user_id),
            "linked": linked is not None,
            "personId": linked.get("personId") if linked else None,
            "personName": linked.get("personName") if linked else None,
            "personType": linked.get("personType") if linked else None,
            "enrolledAt": linked.get("enrolledAt") if linked else None,
        })
    return jsonify({"success": True, "users": result, "count": len(result)})


@app.route("/api/link", methods=["POST"])
def link_user():
    """Maps an EXISTING device user (already fingerprint-enrolled, e.g. from
    EasyBio's history) to a gymos person — no device interaction, no new
    fingerprint capture, just records which uid belongs to whom."""
    body = request.get_json(force=True) or {}
    uid = body.get("uid")
    person_id = body.get("personId")
    person_name = (body.get("personName") or "").strip()
    person_type = body.get("personType", "trainee")
    if not uid or not person_id or not person_name:
        return jsonify({"success": False, "error": "uid, personId and personName are required"}), 400

    mapping = load_mapping()
    mapping[person_id] = {
        "uid": int(uid),
        "deviceUserId": str(uid),
        "personId": person_id,
        "personName": person_name,
        "personType": person_type,
        "enrolledAt": datetime.utcnow().isoformat(),
    }
    save_mapping(mapping)
    return jsonify({"success": True})


@app.route("/api/validity", methods=["POST"])
def set_validity():
    """gymos pushes a membership-validity snapshot for an enrolled person here
    (e.g. right after enrolling/linking them, and again whenever Synchronize
    runs) so the live-punch toast can show it without the bridge needing its
    own connection to gymos's actual membership data. This is a cached
    snapshot, not a live lookup — it's only as fresh as the last push."""
    body = request.get_json(force=True) or {}
    person_id = body.get("personId")
    validity = body.get("validity")
    if not person_id or not isinstance(validity, dict):
        return jsonify({"success": False, "error": "personId and validity are required"}), 400

    mapping = load_mapping()
    if person_id not in mapping:
        return jsonify({"success": False, "error": "That person isn't enrolled/linked on this bridge yet"}), 404

    mapping[person_id]["validity"] = {
        "status": validity.get("status"),
        "label": validity.get("label"),
    }
    save_mapping(mapping)
    return jsonify({"success": True})


def _read_device_attendance(conn):
    records = conn.get_attendance() or []
    return [
        {"deviceUserId": str(r.user_id), "timestamp": r.timestamp.isoformat(), "punch": r.punch, "status": r.status}
        for r in records
    ]


def _enrich_with_mapping(records):
    mapping = load_mapping()
    by_device_id = {v.get("deviceUserId"): v for v in mapping.values()}
    return [
        {
            **r,
            "personId": by_device_id.get(r["deviceUserId"], {}).get("personId"),
            "personName": by_device_id.get(r["deviceUserId"], {}).get("personName"),
            "personType": by_device_id.get(r["deviceUserId"], {}).get("personType"),
        }
        for r in records
    ]


@app.route("/api/sync", methods=["POST"])
def sync():
    try:
        records = with_device(_read_device_attendance, timeout=20)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 502

    state = load_state()
    cursor = state.get("lastTimestamp")
    new_records = [r for r in records if not cursor or r["timestamp"] > cursor]
    for r in new_records:
        _mark_seen(r["timestamp"])

    enriched = _enrich_with_mapping(new_records)
    return jsonify({"success": True, "records": enriched, "count": len(enriched), "totalOnDevice": len(records)})


@app.route("/api/attendance-log")
def attendance_log():
    """Read-only dump of every punch record the device is holding, enriched
    with whatever personId/personName mapping we have — unlike /api/sync,
    this never advances the "last seen" cursor, so it's safe to call anytime
    just to look at (or audit) the device's full history without affecting
    what the next Synchronize considers new."""
    try:
        records = with_device(_read_device_attendance, timeout=20)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 502

    records.sort(key=lambda r: r["timestamp"], reverse=True)
    enriched = _enrich_with_mapping(records)
    return jsonify({"success": True, "records": enriched, "count": len(enriched)})


@app.route("/api/force-open", methods=["POST"])
def force_open():
    body = request.get_json(silent=True) or {}
    seconds = int(body.get("seconds", 3))

    def fn(conn):
        if not hasattr(conn, "unlock"):
            raise RuntimeError(
                "This terminal's firmware does not expose a relay unlock command over the network protocol."
            )
        return conn.unlock(seconds)

    try:
        ok = with_device(fn, timeout=10)
        return jsonify({"success": bool(ok)})
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"{e} — this ESSL model may not have a wired door relay, or the firmware doesn't support it.",
        }), 502


@app.route("/api/stream")
def stream():
    q = queue.Queue()
    _sse_clients.append(q)

    def gen():
        try:
            yield "retry: 2000\n\n"
            while True:
                event = q.get()
                yield f"data: {json.dumps(event)}\n\n"
        finally:
            if q in _sse_clients:
                _sse_clients.remove(q)

    return Response(gen(), mimetype="text/event-stream")


def ensure_self_signed_cert():
    """Generates a persistent self-signed cert on first run and reuses it after that,
    so browsers only need to be told to trust it once, not on every restart."""
    if os.path.exists(CERT_FILE) and os.path.exists(KEY_FILE):
        return CERT_FILE, KEY_FILE

    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.x509.oid import NameOID

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    subject = issuer = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "gymos-biometric-bridge")])

    san = [x509.DNSName("localhost"), x509.IPAddress(ipaddress.ip_address("127.0.0.1"))]
    try:
        san.append(x509.IPAddress(ipaddress.ip_address(socket.gethostbyname(socket.gethostname()))))
    except Exception:
        pass  # best-effort; the cert still works, browsers just show a hostname-mismatch note pre-trust

    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.now(timezone.utc))
        .not_valid_after(datetime.now(timezone.utc) + timedelta(days=3650))
        .add_extension(x509.SubjectAlternativeName(san), critical=False)
        .sign(key, hashes.SHA256())
    )

    with open(CERT_FILE, "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))
    with open(KEY_FILE, "wb") as f:
        f.write(
            key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.TraditionalOpenSSL,
                encryption_algorithm=serialization.NoEncryption(),
            )
        )
    return CERT_FILE, KEY_FILE


if __name__ == "__main__":
    start_live_capture_thread()
    cert_path, key_path = ensure_self_signed_cert()
    print(f"\nServing HTTPS with a self-signed cert. First time, open this in a browser and trust it:")
    print(f"  https://127.0.0.1:{BRIDGE_PORT}/api/status\n")
    app.run(host="0.0.0.0", port=BRIDGE_PORT, threaded=True, ssl_context=(cert_path, key_path))
