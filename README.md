# TRACE // ZERO

**TRACE // ZERO** is an interactive browser hardware fingerprinting and forensic telemetry demonstration tool.

The application challenges users to lock in a "Secret Phrase" in a normal browser session, then attempt to evade detection on the same browser by clearing all cookies/storage, opening an Incognito/Private window, and routing through a VPN—only for the system to re-identify them via deterministic hardware and rendering vectors and reveal their secret phrase alongside a forensic diff of their two visits.

---

## Architecture & Technology Stack

- **Frontend:** React 18, TypeScript (strict mode), Vite, Tailwind CSS.
- **Backend:** Cloudflare Pages Functions (`/functions/api/...`) in TypeScript.
- **Database:** Cloudflare D1 (SQLite) with relational schema and performance indexes.
- **Local Fallback:** In-memory SQLite emulation middleware in Vite so `npm run dev` works 100% offline out-of-the-box.

---

## Telemetry Vectors

1. **Canvas 2D Sub-Pixel Rasterizer:** 280x60 offscreen multi-layer canvas with bezier curves, alpha blend modes, and unicode glyphs.
2. **WebGL Graphics Architecture Probe:** Unmasked GPU vendor/renderer (`WEBGL_debug_renderer_info`), shader precision formats, and hardware limit tables.
3. **Web Audio DSP Silicon Probe:** `OfflineAudioContext` triangle wave fed into `DynamicsCompressorNode`, summing IEEE 754 PCM floating-point decay signatures.
4. **Silicon & Display Metrics:** Native screen resolution, color depth, device pixel ratio, and logical CPU concurrency.
5. **Platform & Locale Architecture:** Platform hints, timezone string, calendar system, and UTC offsets.
6. **System Font Metric Probe:** Subpixel differential metric testing across 30+ distinctive OS typography families.

---

## Development

```bash
# Install dependencies
npm install

# Start local dev server with API middleware
npm run dev

# Build for production
npm run build
```
