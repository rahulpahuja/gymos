# gymos biometric bridge

Replaces the EasyBio dashboard as gymos's own connection to the ESSL fingerprint
terminal. It talks to the device directly over its native TCP protocol (port
`4370`, via `pyzk`) and exposes a small local HTTP + Server-Sent-Events API that
the gymos Settings page and attendance flow call.

## Run it (on any machine that can reach the terminal on the LAN)

```bash
cd biometric-bridge
pip install -r requirements.txt
ESSL_DEVICE_IP=192.168.1.201 ESSL_DEVICE_PORT=4370 python server.py
```

It listens on `0.0.0.0:8090`. In gymos → Settings → Biometric Scanner &
Turnstile Bridge, set the bridge URL to:

```
http://<this machine's LAN IP>:8090
```

Find that IP with `ipconfig` (Windows) or `ifconfig`/`ip addr` (Linux/Mac).

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
- `DELETE /api/enroll/<personId>` — removes the person from the device.
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

## Browser mixed-content note

If gymos is deployed over HTTPS (e.g. Netlify), a browser will block `fetch()`
calls from that HTTPS page to this bridge's plain `http://` address (mixed
content). For real hardware use at the front desk, run gymos locally on the same
LAN instead (`npm run dev` / `vite preview --host`), so the page itself is also
served over plain HTTP.
