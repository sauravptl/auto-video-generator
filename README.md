# Auto AI Video Production Tool 🎬

An automated AI video production desktop application built with **Electron**, **Next.js 15**, and **React 19**, integrating **AGY CLI** for intelligent scriptwriting, **Google Flow** (Veo 3.1 & Nano Banana) via **Flow Connector**, **FFmpeg** for multi-format video composition, and **Meta Graph API v26.0** for automatic publishing to Instagram, Facebook, and WhatsApp.

---

## 🌟 Key Features

1. **Meta Suite First-Run Setup (`/setup`)**:
   - One-click OAuth 2.0 loopback login (`http://localhost:54321/auth/callback`)
   - Direct Token input for developer testing
   - Connects **Instagram Business Accounts** (Reels), **Facebook Pages** (Videos/Reels), and **WhatsApp Cloud API**
   - Automatically exchanges short-lived tokens for 60-day Long-Lived Tokens and non-expiring Page Access Tokens.

2. **Google Flow & Flow Connector (`flow-auto`)**:
   - Generates high-fidelity video scenes using Google's **Veo 3.1** and image scenes using **Nano Banana** with zero API cost through your logged-in Google Flow session.
   - Built-in **"Snap Side-by-Side"** feature: using macOS AppleScript, positions the Auto AI Video Generator on the left 50% of the screen and Google Chrome (with your active Google Flow tab) on the right 50% to prevent Chrome from background-throttling generations.
   - Live status indicator displaying Flow Bridge connection, Google Flow tab visibility, and daily quota.

3. **AGY CLI Scriptwriting**:
   - Uses `agy` (Antigravity CLI) to write structured, viral multi-scene video scripts complete with visual prompts, durations, transition effects, on-screen subtitles, and captions.
   - Includes intelligent fallback storyboarding to ensure projects always generate smoothly even when offline.

4. **Multi-Format Video Assembly (FFmpeg 7.1)**:
   - Stitches all scenes into **9:16 Vertical** (optimized for Instagram Reels, Facebook Reels, and WhatsApp Status) and **16:9 Landscape** (for Facebook Page feed and YouTube).
   - Dynamic `xfade` transitions (fade, dissolve, wipeleft).
   - Generates and burns styled `.ass` subtitles with safe margins above mobile UI controls.
   - Embeds custom dual-aspect ratio video player with real-time preview and "Show in Finder" action.

5. **Multi-Platform Automated Publishing**:
   - **Instagram Reels**: Uses Meta's Resumable Upload protocol (`rupload.facebook.com`) to stream local MP4 files directly to Instagram without needing external S3 or cloud hosting.
   - **Facebook**: Uploads directly to Facebook Page Reels and Videos.
   - **WhatsApp**: Sends video messages via WhatsApp Cloud API.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v20 or newer (v22 installed)
- **flow-connector-cli**: Installed globally (`flow-auto`)
- **FFmpeg**: Installed locally (at `/Users/geniussau/.local/bin/ffmpeg`)
- **Google Chrome**: With the Flow Connector extension enabled and https://flow.google.com open and logged in.

### 2. Run in Development Mode
Starts the Next.js dev server and launches the Electron desktop app side-by-side:

```bash
npm run dev
```

### 3. Build & Package for Production
Creates an optimized static bundle and packages a native macOS desktop app (`.dmg` / `.app`):

```bash
npm run package
```

---

## 🖥️ Application Screens

- **`/` (Dashboard)**: Overview of all video projects, stats on published reels, and quick launch CTA.
- **`/setup` (Meta Suite)**: Guided setup wizard to connect Instagram, Facebook, and WhatsApp accounts.
- **`/new` (New Video)**: Topic input, viral inspiration templates, aspect ratio selection (`9:16`, `16:9`, or `both`), and publishing target toggles.
- **`/project?id=...` (Live Pipeline Tracker)**: 4-stage live stepper (Scriptwriting ➔ Flow Generation ➔ Assembly ➔ Publishing), scene storyboard, and dual-aspect preview player.
- **`/settings` (Settings)**: Configure Meta App credentials, FFmpeg binary path, and preferred Google Flow models.

---

## 🧩 Architecture

```
┌────────────────────────────────────────────────────────┐
│             ELECTRON DESKTOP SHELL                     │
│  Main Process: Pipeline Orchestrator + IPC Controller  │
│  Preload: Typed contextBridge (window.electronAPI)     │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│             NEXT.JS RENDERER (App Router)              │
│  Tailwind CSS Dark Theme + Real-Time Status Listeners  │
└───────────────────────────┬────────────────────────────┘
                            │
    ┌───────────────────────┼───────────────────────┐
    ▼                       ▼                       ▼
[ AGY CLI ]          [ Flow Connector ]       [ Meta Graph API ]
AI Scriptwriter      Chrome / Veo 3.1         IG Reels / FB / WA
```
