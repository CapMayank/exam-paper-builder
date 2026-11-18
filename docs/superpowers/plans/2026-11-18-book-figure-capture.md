# Book Figure Capture & Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable teachers on a laptop/desktop to capture a figure from a physical book (via Phone QR Snap, `Ctrl+V` paste, file upload, or webcam), crop out surrounding text, whiteout stray marks, apply a shadow-removing B&W "Book Scan" filter, and attach it cleanly to any question without breaking existing figure flows.

**Architecture:** Disk-backed single-use capture sessions (`UPLOAD_DIR/.capture-sessions`) bridge a lightweight mobile capture page (`/capture/[token]`) to the desktop `BookFigureModal`, which shares a pure HTML5 Canvas crop/rotate/whiteout/filter pipeline across all input sources and hands the final PNG `Blob` to `QuestionForm`'s existing `attach(blob)` → `/api/uploads` flow.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, HTML5 Canvas, `qrcode` (client-side SVG QR), Vitest.

**Spec:** [2026-11-18-book-figure-capture-design.md](file:///c:/Users/StrawHat/MasterRepo/web_develpoment/exam-paper-builder/docs/superpowers/specs/2026-11-18-book-figure-capture-design.md)

## Global Constraints

- Existing **From library**, **Upload**, and **Draw** flows in `src/components/QuestionForm.tsx` must remain intact and functional.
- Final uploaded figure must respect `POST /api/uploads` limits (`<= 3 MB`, `image/png` or `image/jpeg`).
- Mobile capture endpoint (`POST /api/capture-session/[token]`) must not require login cookies; authorization is the 128-bit single-use token (`10 minute` TTL).
- All image cleanup (crop, rotate, whiteout, Book Scan B&W filter) runs client-side in HTML5 Canvas with no external image-processing services.

## Review Focus

- Expired or already-consumed capture tokens return `404`/`410` cleanly without crashing the mobile page or leaving orphan `.bin` files on disk.
- Path-traversal or malformed token strings (e.g. `../../etc/passwd`) are rejected before touching `UPLOAD_DIR`.
- Shadowed grey book paper in `applyBookScanFilter` normalizes to `#FFFFFF` while thin dark diagram lines stay dark (`<= 40` luminance) and are not washed out.
- Pasting plain text into `MathRichEditor` or `<input>` inside `QuestionForm` is never intercepted by the `Ctrl+V` image paste handler.
- Polling in `BookFigureModal` stops immediately on unmount, tab close, or token consumption so no background timers leak.

---

### Task 1: Capture Session Store & API Routes

**Files:**
- Create: `src/lib/captureSessions.ts`
- Create: `src/app/api/capture-session/route.ts`
- Create: `src/app/api/capture-session/[token]/route.ts`
- Test: `src/lib/captureSessions.test.ts`

**Interfaces:**
- Consumes: `UPLOAD_DIR` from `@/lib/uploads`, `route` and `HttpError` from `@/lib/api`.
- Produces:
  - `createCaptureSession(): Promise<{ token: string; expiresAt: number }>`
  - `getCaptureSessionStatus(token: string): Promise<{ status: "pending" | "ready"; expiresAt: number } | null>`
  - `saveCaptureSessionImage(token: string, buffer: Buffer, mimeType: string): Promise<boolean>`
  - `consumeCaptureSessionImage(token: string): Promise<{ buffer: Buffer; mimeType: string } | null>`

- [ ] **Step 1: Write the failing test**

Create `src/lib/captureSessions.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import {
  consumeCaptureSessionImage,
  createCaptureSession,
  getCaptureSessionStatus,
  isValidCaptureToken,
  saveCaptureSessionImage,
} from "./captureSessions";

describe("captureSessions", () => {
  it("rejects malformed or path-traversal tokens", () => {
    expect(isValidCaptureToken("../etc/passwd")).toBe(false);
    expect(isValidCaptureToken("abc")).toBe(false);
    expect(isValidCaptureToken("a".repeat(32))).toBe(true);
  });

  it("creates, saves, and consumes a single-use session image", async () => {
    const { token, expiresAt } = await createCaptureSession();
    expect(isValidCaptureToken(token)).toBe(true);
    expect(expiresAt).toBeGreaterThan(Date.now());
    expect((await getCaptureSessionStatus(token))?.status).toBe("pending");

    const sample = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const saved = await saveCaptureSessionImage(token, sample, "image/png");
    expect(saved).toBe(true);
    expect((await getCaptureSessionStatus(token))?.status).toBe("ready");

    const consumed = await consumeCaptureSessionImage(token);
    expect(consumed?.mimeType).toBe("image/png");
    expect(consumed?.buffer.equals(sample)).toBe(true);

    // Single-use: second consume returns null
    expect(await consumeCaptureSessionImage(token)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/captureSessions.test.ts`
Expected: FAIL with module not found `./captureSessions`.

- [ ] **Step 3: Implement `src/lib/captureSessions.ts` and the API routes**

Implement `src/lib/captureSessions.ts` storing `.json` metadata and `.bin` image files inside `path.join(UPLOAD_DIR, ".capture-sessions")`, validating tokens with `/^[a-f0-9]{32}$/`, enforcing a `10 * 60 * 1000` ms TTL, and pruning expired files on `createCaptureSession`.
Implement `src/app/api/capture-session/route.ts` (`POST` via `route(...)` with `auth: true`) and `src/app/api/capture-session/[token]/route.ts` (`GET` and `POST` via `route(..., { auth: false })`, validating `image/png|image/jpeg|image/webp` and `<= 5 * 1024 * 1024` bytes).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/captureSessions.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/captureSessions.ts src/lib/captureSessions.test.ts src/app/api/capture-session/
git commit -m "feat: add single-use phone capture session store and API routes"
```

---

### Task 2: Pure Canvas Book-Scan Filter & Sizing Utilities

**Files:**
- Create: `src/lib/bookScanFilter.ts`
- Test: `src/lib/bookScanFilter.test.ts`

**Interfaces:**
- Produces:
  - `export type ScanFilterMode = "bw" | "grayscale" | "original";`
  - `applyBookScanFilter(data: Uint8ClampedArray, width: number, height: number, mode: ScanFilterMode, clarity?: number): Uint8ClampedArray`
  - `computeFitDimensions(srcW: number, srcH: number, maxEdge: number): { width: number; height: number }`

- [ ] **Step 1: Write the failing test**

Create `src/lib/bookScanFilter.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { applyBookScanFilter, computeFitDimensions } from "./bookScanFilter";

describe("bookScanFilter", () => {
  it("normalizes shadowed grey background to pure white while keeping dark ink dark", () => {
    const w = 16;
    const h = 16;
    const pixels = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      // Simulate shadowed grey book paper (150, 148, 142)
      pixels[i * 4] = 150;
      pixels[i * 4 + 1] = 148;
      pixels[i * 4 + 2] = 142;
      pixels[i * 4 + 3] = 255;
    }
    // Draw a dark ink pixel in the center
    const center = (8 * w + 8) * 4;
    pixels[center] = 30;
    pixels[center + 1] = 30;
    pixels[center + 2] = 30;

    const out = applyBookScanFilter(pixels, w, h, "bw", 0.5);
    // Corner paper pixel -> pure white
    expect(out[0]).toBe(255);
    expect(out[1]).toBe(255);
    expect(out[2]).toBe(255);
    // Center ink pixel -> dark
    expect(out[center]).toBeLessThanOrEqual(40);
  });

  it("leaves pixels untouched in original mode and scales dimensions proportionally", () => {
    const src = new Uint8ClampedArray([100, 120, 140, 255]);
    expect(applyBookScanFilter(src, 1, 1, "original")).toEqual(src);
    expect(computeFitDimensions(3200, 1600, 1600)).toEqual({ width: 1600, height: 800 });
    expect(computeFitDimensions(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/bookScanFilter.test.ts`
Expected: FAIL with module not found `./bookScanFilter`.

- [ ] **Step 3: Implement `src/lib/bookScanFilter.ts`**

Implement `applyBookScanFilter` using an integral-image (summed-area table) local mean over a radius proportional to image size (fast $O(W \cdot H)$ even for 1600px images!) to divide/normalize each pixel's luminance against local paper brightness, then apply a smooth S-curve / threshold controlled by `clarity` (`0..1`, default `0.5`) so shadows fade to `255` and ink stays crisp.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/bookScanFilter.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/bookScanFilter.ts src/lib/bookScanFilter.test.ts
git commit -m "feat: add pure canvas book-scan B&W filter and dimension helpers"
```

---

### Task 3: Install `qrcode` & Build Mobile Capture Page (`/capture/[token]`)

**Files:**
- Modify: `package.json` (install `qrcode` and `@types/qrcode`)
- Create: `src/app/capture/[token]/page.tsx`

**Interfaces:**
- Consumes: `GET /api/capture-session/[token]` and `POST /api/capture-session/[token]`.

- [ ] **Step 1: Install `qrcode` and `@types/qrcode`**

Run: `npm install qrcode && npm install -D @types/qrcode`

- [ ] **Step 2: Create `src/app/capture/[token]/page.tsx`**

Build a clean, mobile-first client page that:
1. Checks `GET /api/capture-session/${token}` on mount; if missing/expired, displays a friendly "Link expired — generate a new QR code on your laptop." message.
2. Shows a large **"Take Photo of Book"** button backed by `<input type="file" accept="image/*" capture="environment">`, plus a secondary "Choose from Gallery" input without `capture`.
3. Resizes the selected image on an offscreen `<canvas>` to `max 1800px` (`computeFitDimensions`) and encodes as JPEG (`0.88` quality) so uploads are fast on mobile data/Wi-Fi.
4. `POST`s the `FormData` (`file`) to `/api/capture-session/${token}` and displays **"Sent to your laptop! You can close this tab."** on success.

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: Exit code 0.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/app/capture/
git commit -m "feat: add mobile phone capture page and qrcode dependency"
```

---

### Task 4: Build `BookFigureModal` (4 Inputs + Crop, Rotate, Whiteout Brush & Book Scan Filter)

**Files:**
- Create: `src/components/BookFigureModal.tsx`

**Interfaces:**
- Consumes: `Modal` from `./ui`, `QRCode` from `qrcode`, `applyBookScanFilter` & `computeFitDimensions` from `@/lib/bookScanFilter`.
- Produces:
  ```tsx
  export function BookFigureModal({
    isOpen,
    onClose,
    onComplete,
    initialFile,
    initialImageUrl,
    initialTab = "qr",
  }: {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (blob: Blob) => void | Promise<void>;
    initialFile?: File | Blob | null;
    initialImageUrl?: string | null;
    initialTab?: "qr" | "paste" | "webcam";
  })
  ```

- [ ] **Step 1: Implement Stage 1 (Input Sources)**

Support 3 tabs when no `initialFile`/`initialImageUrl` is provided:
- **Phone (QR):** Calls `POST /api/capture-session`, renders QR SVG via `QRCode.toString(url, { type: "svg" })`, polls `GET /api/capture-session/${token}` every 1500ms, fetches `?image=1` when `status === "ready"`, and loads it into Stage 2. Shows a helpful note if `window.location.hostname === "localhost"` reminding the user to open the app via LAN IP or hosted URL so the phone can reach it.
- **Paste / Upload:** Drag-and-drop zone, `Ctrl+V` listener, and `<input type="file">`.
- **Webcam:** `navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })` with a Capture frame button and clean stream cleanup on tab switch/unmount.

- [ ] **Step 2: Implement Stage 2 (Crop, Rotate, Whiteout Brush & Book Scan Cleanup)**

- Load image into an internal working `<canvas>` (rotated by `0/90/180/270` degrees).
- Render interactive crop box overlay (drag corners/edges to crop out surrounding textbook text).
- Toggle **Whiteout Brush** mode (with Undo stack of stroke snapshots) so users can paint pure `#FFFFFF` over stray captions/text inside the crop box.
- Filter selector (**Book Scan (B&W)** default, **Grayscale**, **Original**) + **Ink Clarity** slider applying `applyBookScanFilter` to a live preview canvas.
- **Use Figure** crops to the selected rectangle, applies the active filter + whiteout strokes, scales to `max 1600px` via `computeFitDimensions`, exports PNG `Blob`, and calls `onComplete(blob)`.

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: Exit code 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/BookFigureModal.tsx
git commit -m "feat: add BookFigureModal with QR snap, paste, webcam, crop, whiteout, and B&W scan filter"
```

---

### Task 5: Integrate `BookFigureModal` into `QuestionForm.tsx`

**Files:**
- Modify: `src/components/QuestionForm.tsx:1376-1421` (and modal state + paste handler)

**Interfaces:**
- Consumes: `BookFigureModal` from `./BookFigureModal`.

- [ ] **Step 1: Wire `BookFigureModal` state and `Ctrl+V` image paste in `QuestionForm.tsx`**

- Add state for `bookModalOpen`, `bookModalInitialFile`, `bookModalInitialUrl`.
- Add an `onPaste` handler on the `QuestionForm` `<form>` element: if `e.clipboardData?.files` (or `items`) contains an `image/*` file, `e.preventDefault()`, set `bookModalInitialFile`, and open `BookFigureModal`. Plain text pastes remain completely untouched.
- In the **More details → Figure** section:
  - Keep **From library**, **Upload**, and **Draw** buttons unchanged.
  - Add **Scan from book** button alongside them (opens `BookFigureModal` on the QR tab).
  - When `imagePath` is already present, add **Crop / Clean** alongside **Edit**, **Replace**, and **Remove** (opens `BookFigureModal` with `initialImageUrl={imageUrl(imagePath)}`).
- On `onComplete(blob)`, call existing `await attach(blob)` and close the modal.

- [ ] **Step 2: Run full test suite and TypeScript type check**

Run: `npm test -- src/lib/captureSessions.test.ts src/lib/bookScanFilter.test.ts src/lib/tableUtils.test.ts && npx tsc --noEmit`
Expected: All tests pass and `tsc --noEmit` exits with code 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/QuestionForm.tsx
git commit -m "feat: integrate Scan from book, Crop/Clean, and Ctrl+V image paste into QuestionForm"
```
