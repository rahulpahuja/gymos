# gymos biometric bridge

Replaces the EasyBio dashboard as gymos's own connection to the ESSL fingerprint
terminal. It talks to the device directly over its native TCP protocol (port
`4370`, via `pyzk`) and exposes a small local HTTP + Server-Sent-Events API that
the gymos Settings page and attendance flow call.

## Set it up once, forget it (Windows, recommended)

Requires Python already installed (same requirement EasyBio had — check with
`python --version`). On the machine wired to the fingerprint terminal:

```
cd biometric-bridge
install.bat
```

This one run (it'll ask for admin rights once, via a UAC prompt):
- Installs the Python dependencies.
- Generates the HTTPS certificate and **adds it to Windows' trusted root
  store**, so Chrome/Edge stop showing the "not secure" warning entirely —
  no per-browser click-through needed (see the security note below on why
  this is safe).
- Opens firewall port `8090` so other devices on the LAN can reach it.
- Sets the bridge to **auto-start silently** on every login (a hidden
  shortcut in the Startup folder — no visible console window).
- Starts it immediately too.

After that, nothing else to run manually, ever — reboot the PC and the bridge
is already there. In gymos → Settings → Biometric Scanner & Turnstile Bridge,
set the bridge URL to:

```
https://<this machine's LAN IP>:8090
```

Find that IP with `ipconfig`.

### Manual run (any OS, or for troubleshooting)

```bash
cd biometric-bridge
pip install -r requirements.txt
ESSL_DEVICE_IP=192.168.1.201 ESSL_DEVICE_PORT=4370 python server.py
```

or double-click `start-bridge.bat` on Windows — this shows a console window
so you can see errors, but doesn't set up trust/firewall/auto-start for you.
It serves HTTPS using the same self-signed cert (generated once, reused after
that — `bridge_cert.pem`/`bridge_key.pem`, gitignored, don't copy between
machines). Without running `install.bat`, each browser/device needs one
manual step: open `https://<this machine's LAN IP>:8090/api/status` directly
in a new tab and click through the "not secure" warning once. Skipping this
makes gymos's own calls to the bridge silently fail with a generic network
error — that's the browser blocking an untrusted cert, not a bug.

Environment variables (all optional, shown with defaults):

| Var                  | Default        | Meaning                                   |
|----------------------|----------------|--------------------------------------------|
| `ESSL_DEVICE_IP`     | `192.168.1.201`| The fingerprint terminal's own LAN IP       |
| `ESSL_DEVICE_PORT`   | `4370`         | ZK protocol port on the terminal            |
| `ESSL_DEVICE_PASSWORD`| `0`           | Comm key/password, if one was set on device |
| `BRIDGE_PORT`        | `8090`         | Port this bridge listens on                 |

## What it does

- `GET  /api/status` — connects, reads firmware/serial/user count.
- `POST /api/refresh` — same as status; re-reads device info.
- `POST /api/enroll` — `{personId, personName, personType}`. Creates the user on
  the device and starts on-device fingerprint capture. **This call blocks**
  while the person places the same finger on the sensor (up to 3 times) as the
  terminal prompts — that's the device's own enrollment flow, not something the
  bridge can skip.
- `DELETE /api/enroll/<personId>` — removes the person from the device entirely
  (deletes their fingerprint template too).
- `GET  /api/users` — lists every user already on the device, including ones
  enrolled long before this bridge existed (e.g. via EasyBio's history), each
  showing whether it's already linked to a gymos person.
- `POST /api/link` — `{uid, personId, personName, personType}`. Links an
  **already-enrolled** device user to a gymos person. No device interaction,
  no new fingerprint capture — their template already exists on the device,
  this just records who it belongs to.
- `POST /api/sync` — pulls attendance logs from the device and returns any
  punches not already delivered (tracked in `state.json`), enriched with the
  person's name/type from `enrollments.json`.
- `POST /api/force-open` — `{seconds}`. Pulses the door relay. **Only works if
  this specific terminal model has a wired relay/aux output and firmware that
  supports the unlock command.** If it doesn't, you'll get a clear error, not a
  fake success — that's a hardware limitation of pure time-attendance terminals,
  not a bug here.
- `GET /api/stream` — Server-Sent Events feed of real-time punches as they
  happen on the device, so gymos can show the same instant popup (ID, name,
  time) that EasyBio showed.

## Why this exists instead of talking to the EasyBio dashboard directly

The EasyBio app's own backend API is private/unknown from outside its process.
This bridge talks to the terminal using the documented ZK protocol instead, so
gymos owns the integration end-to-end rather than depending on reverse-engineering
someone else's undocumented HTTP calls. EasyBio can keep running independently;
this bridge just needs its own exclusive window on the device's single TCP
session when it runs a command (it pauses/resumes live capture automatically,
but two *separate processes* — EasyBio and this bridge — both talking to the
device at once will still collide, since the terminal only accepts one active
connection at a time).

## Browser HTTPS trust note

Because the bridge serves HTTPS with a self-signed cert (not one signed by a
public authority), browsers won't trust it automatically — that's a real
security boundary, no code can bypass it silently. `install.bat` resolves this
properly instead of routing around it: it adds *this specific* certificate to
Windows' trusted root store, so Chrome/Edge (which read that store) trust
exactly this one keypair — not a general-purpose CA that could sign other
certs, just this one bridge's identity. That's the standard, safe way to do
this for a local-only HTTPS service (the same approach tools like `mkcert`
use). Firefox keeps its own separate certificate store, so it would still
show a one-time warning even after `install.bat` — not a bridge limitation,
just how Firefox works.

## One thing `install.bat` can't do for you

If EasyBio's old server is still set to auto-start (Startup folder, Task
Scheduler, or a Windows service), it'll compete with this bridge for the
device's single connection on the next reboot. `install.bat` only sets *this*
bridge to auto-start — it doesn't know how EasyBio was configured to launch,
so disabling that is still a manual one-time check (Task Manager → find it →
trace back to what's relaunching it, as covered earlier in the setup
conversation).
