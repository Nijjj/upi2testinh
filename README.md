# UPI Assistant (Fast & Minimal)

A lightweight, mobile-ready UPI assistant with QR scanning and automatic call triggering.

## ✨ Features
- **📸 QR Scanner**: Camera-based QR parsing for instant payments.
- **⚡ Fast Dialing**: Automatically triggers `tel:` strings with IVR delays.
- **🧠 Smart Fallback**: Uses **Mobile Number** (priority) or **UPI ID** (fallback).
- **🎨 Modern UI**: Smooth animations, dark mode, and responsive layout.
- **📜 History**: Persistent local storage for transactions.

## 🚀 Getting Started

### Prerequisites
- Node.js installed (Termux or PC)

### Installation
```sh
npm install
node server.js
```

### Usage
1. Open `http://localhost:3000` in your browser.
2. Go to **Settings** and set your IVR phone number.
3. Use **Scan QR** or manually enter details.
4. Tap **Pay Now** to trigger the automated call.

## 📱 Android App Conversion

### Option 1: Capacitor (Recommended)
This converts the web app into a native Android container.

1. Install Capacitor:
   ```sh
   npm install @capacitor/core @capacitor/cli @capacitor/android
   ```
2. Initialize Capacitor:
   ```sh
   npx cap init
   ```
3. Build and Copy:
   ```sh
   # Assuming public/ is your web directory
   npx cap add android
   npx cap copy
   ```
4. Open in Android Studio:
   ```sh
   npx cap open android
   ```
5. Build APK/Bundle from Android Studio.

### Option 2: Progressive Web App (PWA)
1. Ensure you have a `manifest.json` and a service worker (for offline support).
2. Open in Chrome on Android.
3. Tap **Menu (⋮) → Add to Home screen**.

## 🛠 Tech Stack
- **Frontend**: Vanilla JS + React (UMD), CSS Transitions.
- **Backend**: Node.js + Express.
- **Storage**: JSON-based local storage.

## 📄 License
MIT
