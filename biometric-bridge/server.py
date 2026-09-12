"""
gymos biometric bridge — talks directly to the ESSL/ZKTeco fingerprint terminal
over its native TCP protocol (via pyzk) and exposes a small local HTTP/SSE API
that the gymos frontend calls for enroll / force-open / synchronize / refresh
and live punch events.

Run on any machine that can reach the device on the LAN (the same box that was
running the EasyBio dashboard is fine):

    pip install -r requirements.txt
    ESSL_DEVICE_IP=192.168.1.201 python server.py

Then point gymos Settings > Biometric Bridge at:
    http://<this-machine's-LAN-IP>:8090

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

import json
import os
import queue
import threading
import time
from datetime import datetime

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
                event = {
                    "deviceUserId": str(att.user_id),
                    "personId": person.get("personId"),
                    "personName": person.get("personName") or f"Unknown device ID {att.user_id}",
                    "personType": person.get("personType"),
                    "timestamp": iso_ts,
                    "punch": att.punch,
                    "status": att.status,
                }
                _mark_seen(iso_ts)
                _broadcast(event)
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
        return {
            "firmware": conn.get_firmware_version(),
            "serialNumber": conn.get_serialnumber(),
            "platform": conn.get_platform(),
            "userCount": len(conn.get_users()),
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


@app.route("/api/sync", methods=["POST"])
def sync():
    def fn(conn):
        records = conn.get_attendance() or []
        return [
            {"deviceUserId": str(r.user_id), "timestamp": r.timestamp.isoformat(), "punch": r.punch, "status": r.status}
            for r in records
        ]

    try:
        records = with_device(fn, timeout=20)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 502

    state = load_state()
    cursor = state.get("lastTimestamp")
    new_records = [r for r in records if not cursor or r["timestamp"] > cursor]

    mapping = load_mapping()
    by_device_id = {v.get("deviceUserId"): v for v in mapping.values()}
    enriched = []
    for r in new_records:
        person = by_device_id.get(r["deviceUserId"], {})
        enriched.append({
            **r,
            "personId": person.get("personId"),
            "personName": person.get("personName"),
            "personType": person.get("personType"),
        })
        _mark_seen(r["timestamp"])

    return jsonify({"success": True, "records": enriched, "count": len(enriched), "totalOnDevice": len(records)})


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


if __name__ == "__main__":
    start_live_capture_thread()
    app.run(host="0.0.0.0", port=BRIDGE_PORT, threaded=True)
