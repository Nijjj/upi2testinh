# UPI Assistant (Local)

Lightweight personal UPI helper that runs fully local in Termux.

## Run

```sh
npm install
node server.js
```

Open:

- `http://localhost:3000`

## QR Scanner

- Uses the device camera (`getUserMedia`) + native `BarcodeDetector` (very lightweight).
- If `BarcodeDetector` isn’t available in your browser/WebView, use **Scan → Manual Paste** fallback.

Camera notes:

- `getUserMedia` requires a **secure context**: `https://` or `http://localhost`.
- On Android, prefer Chrome / Chromium-based WebView for best support.

## API

- `POST /save` body: `{ "name": "...", "amount": 12.34, "upiId": "...", "ref": "..." }`
- `GET /history?days=7`

## Android / APK (WebView-friendly)

Two lightweight paths:

### Option A: TWA (Recommended, smallest, best camera support)

Trusted Web Activity packages your web app into an APK that runs in Chrome (great for `getUserMedia`).

High-level steps:

1. Host the app on HTTPS (or use a local LAN HTTPS dev setup).
2. Add a minimal web manifest + icons (optional but recommended for install UX).
3. Use Bubblewrap to generate the Android project + APK.

Commands (on a PC with Android SDK + Java):

```sh
npx @bubblewrap/cli init --manifest=https://YOUR_DOMAIN/manifest.webmanifest
npx @bubblewrap/cli build
```

### Option B: Simple Android WebView wrapper (offline-friendly if you host locally)

- Create an Android app with a `WebView` that loads `http://127.0.0.1:3000`.
- You still need the Node server running on the device (Termux) OR you must replace the server with in-app storage.

WebView camera support depends heavily on the Android System WebView version.
