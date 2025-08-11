# BBMP Frontend Launcher

> A sleek Nuxt + Electron desktop app for launching **BlueBerry Minecraft Proxy (BBMP)** with one click. Dark UI, theme & font switching, persistent settings, live logs (dev mode), and automatic Java handling.

![Status](https://img.shields.io/badge/status-active-6d28d9)
![Nuxt](https://img.shields.io/badge/Nuxt-3.x-00dc82?logo=nuxtdotjs&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-30.x-47848f?logo=electron&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-737373)

---

## ✨ Features

- **Auto‑download latest BBMP JAR** from GitHub Releases (accepts any `.jar` asset).
- **Custom JAR URL** input to fetch a specific release (e.g. `v0.1` download link).
- **Quick launch controls:** server address, local port, remote port, dev mode.
- **Dev mode logs** (stdout/stderr) shown only when Dev Mode is enabled.
- **Running state UI:** "Running" badge; **Stop** button appears in red only while running.
- **Theme & font switcher** (Purple / Blue / Neon / High Contrast; System / Inter / JetBrains Mono).
- **Persistent settings** (theme, font, server/ports, dev mode, custom URL, Java path, always‑on‑top).
- **Java 17 detection & auto‑install** (Temurin 17 downloaded locally if missing).
- **Window option:** Always on top.
- **Clean visuals:** Global hidden scrollbars; dark, black‑purple aesthetic.

---

## 🧰 Prerequisites

- **Node.js 18+** and **npm**
- **Git**
- **Java 17+** (optional: app can install Temurin 17 in user data if not found)

---

## 🚀 Quick Start

```bash
git clone https://github.com/BlueBerryCodingGroup/BBMP-Frontend.git
cd BBMP-Frontend
npm install
npm run dev
```

This launches the Nuxt dev server and opens the Electron app. Use the **Electron window** (not just the browser tab) for native features like downloads and Java detection.

---

## 🏗️ Production Build

```bash
npm run build
```

- Builds the Nuxt renderer, prepares `dist/renderer`, and packages the app with **electron-builder**.
- Platform installers/artifacts are generated under `dist/` (Windows NSIS, Linux AppImage/deb, macOS app).

> Tip: Don’t commit `node_modules/`, `.nuxt/`, `dist/`, `.output/`. Use a proper `.gitignore` to keep the repo lean.

---

## ⚙️ Settings & Persistence

The launcher automatically saves your selections locally and restores them on next run.

| Setting        | Description                                  |
|----------------|----------------------------------------------|
| Theme & Font   | Visual theme (Purple/Blue/Neon/Contrast) and UI font |
| Dev Mode       | Enables live BBMP logs in the UI             |
| Server Address | Remote server (e.g. `play.hypixel.net`)      |
| Ports          | Local listen port and remote port            |
| Custom JAR URL | Direct link to a `.jar` release              |
| Java Path      | Optional override to a specific Java binary  |
| Always on Top  | Keeps the launcher window above others       |

Settings are stored client‑side (localStorage).

---

## 🖥️ Usage

1. **Download JAR**  
   Click **Download Latest** or paste a **Custom JAR URL** and press **Download from URL**.
2. **Configure**  
   Enter server address, listening port, remote port. Toggle **Dev mode** if you want logs.
3. **Java**  
   If Java 17+ isn’t detected, click **Install Java 17** (Temurin) or choose **Pick Java**.
4. **Launch**  
   Press **Launch BBMP**. The **Stop** button appears (red) while running.
5. **Optional**  
   Toggle **Always on top**; switch **Theme** and **Font** to your liking.

---

## 🧩 Project Structure (high‑level)

```
bbmp-launcher/
├─ electron/
│  ├─ main.js         # Electron main (ESM): IPC, downloads, Java helpers, spawn
│  └─ preload.js      # CJS: exposes safe APIs to the renderer (window.bbmp)
├─ pages/
│  └─ index.vue       # Main UI (themes, persistence, logs, launch/stop)
├─ composables/
│  └─ usePersistedSettings.ts  # localStorage read/write
├─ assets/
│  └─ style.css       # Dark theme, hidden scrollbars, components
├─ resources/icons/   # App icons for packaging
├─ electron-builder.yml
├─ package.json
└─ nuxt.config.ts
```

## 🧾 License

Copyright (c) 2025 **BlueBerryCodingGroup**  
Licensed under the MIT License. See `LICENSE` for details.

---

Made with ❤️ by **BlueBerryCodingGroup**
