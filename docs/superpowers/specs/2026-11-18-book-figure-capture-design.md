# Book Figure Capture & Cleanup — Design Doc

**Date:** 2026-11-18  
**Status:** Approved

## 1. Intent & Why

Teachers building exam papers on a laptop or desktop often have a **physical textbook** on their desk. Drawing complex figures from scratch in Figure Studio is slow, and getting a photo from a physical book into a question currently requires taking a picture on a phone, sending it to the laptop (WhatsApp/email), downloading it, opening **More details → Figure → Upload**, and accepting whatever grey paper background, shadows, and surrounding textbook text came with the photo.

This feature lets a teacher bring a figure from a physical book into any question in seconds and make it print like a clean black-and-white textbook diagram — while keeping every existing figure option (**From library**, **Upload**, **Draw**) working unchanged.

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **Seamless integration into the current flow:** Keep **From library**, **Upload**, and **Draw** in [QuestionForm.tsx](file:///c:/Users/StrawHat/MasterRepo/web_develpoment/exam-paper-builder/src/components/QuestionForm.tsx) working exactly as they do today.
- **Zero-friction phone-to-laptop transfer:** Let teachers scan a one-time QR code with their phone camera, snap the book page, and receive it directly in the laptop modal.
- **Instant desktop inputs:** Support `Ctrl+V` clipboard image paste, drag-and-drop, file upload, and optional laptop webcam capture into the same cleanup flow.
- **Print-ready "Book Scan" cleanup:** Client-side crop, 90° rotation, and adaptive/contrast B&W filtering that turns grey/shadowed book paper into pure `#FFFFFF` with crisp dark lines.
- **Re-editable existing figures:** Allow opening an already-attached figure in the Crop & Cleanup tool to trim or clean it up.

### Non-Goals
- Converting book photos into editable Figure Studio vector objects (`figureDoc`) or OCR-ing text labels inside diagrams.
- Perspective warp / 4-corner keystone correction in v1 (90° rotation + rectangular crop covers 95% of book photos cleanly without complex UI).
- Multi-page PDF book browsing (user confirmed physical book workflow).

### Anti-Goals
- Breaking or hiding existing **From library**, **Upload**, or **Draw** buttons.
- Requiring the phone browser to log in to the app (the QR token itself authorizes the single-use upload).
- Uploading huge raw 10 MB phone photos directly to `/api/uploads` (the 3 MB limit in `/api/uploads/route.ts` stays; mobile capture resizes/compresses before upload, and canvas export outputs a compact PNG).

## 3. Constraints

- **Existing API & storage:** Question figures are stored as files in `UPLOAD_DIR` via `POST /api/uploads` (3 MB max; PNG/JPEG/WebP/GIF/SVG) and referenced by `question.imagePath`.
- **Desktop/laptop primary, mobile browser secondary:** The main app runs on laptop/desktop; only the tiny `/capture/[token]` page needs to be mobile-first.
- **Local & hosted compatibility:** Phone QR snap works whenever the phone can reach the app's origin (same Wi-Fi / LAN IP in local dev, or public URL when deployed). If running on `localhost`, we should surface a brief note if `window.location.hostname === "localhost"` (or allow LAN IP), while `Ctrl+V` / Upload / Webcam always work offline/locally.

## 4. Approaches Considered

1. **Phone-to-Laptop QR Snap + Crop & Scan Cleanup:** Fastest physical-book workflow, but requires phone-to-server reachability.
2. **`Ctrl+V` Paste / Upload / Webcam + Crop & Scan Cleanup:** 100% local/client-side, but leaves phone-to-laptop transfer to external tools.
3. **Hybrid — Unified Book Figure Modal (`Phone QR` + `Ctrl+V` Paste + `Upload` + `Webcam` → `Crop & Book Scan Cleanup`):** *(Chosen)* Combines zero-friction phone capture with instant desktop paste/upload/webcam, all feeding into one shared crop & B&W shadow-removal editor.

## 5. Architecture & User Flow

### 5.1 Integration in `QuestionForm.tsx`
- Under **More details → Figure** (and without removing or breaking existing buttons):
  - Existing buttons remain: **From library**, **Upload**, **Draw**.
  - Add **Scan from book** button (opens `BookFigureModal`).
  - When `imagePath` is already set, add **Crop / Clean** alongside **Edit** (Figure Studio), **Replace**, and **Remove**, so an uploaded/existing image can be cropped or B&W-cleaned at any time.
- **Global `Ctrl+V` paste in `QuestionForm`:** When the user pastes an image from the clipboard anywhere inside the question modal (outside plain text), intercept the image file and open `BookFigureModal` directly in the Crop & Cleanup stage with that image loaded. (Text paste in `MathRichEditor` and inputs remains untouched.)

### 5.2 `BookFigureModal` (Two-Stage Modal)

#### Stage 1: Get the Image (4 sources)
1. **Phone QR Snap (default tab when opened via "Scan from book"):**
   - Calls `POST /api/capture-session` to create a 10-minute, single-use token.
   - Displays a scannable QR code pointing to `${origin}/capture/${token}` plus a status indicator ("Waiting for photo from phone…").
   - Polls `GET /api/capture-session/${token}` every 1.5s. As soon as the phone uploads the photo, loads it into Stage 2.
2. **Paste / Drop / File:**
   - Drop zone + **Choose file** button + `Ctrl+V` paste listener.
3. **Webcam:**
   - Uses `navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })` with a **Capture** button and clean error fallback if no camera/permission is available.

#### Stage 2: Crop & Book Scan Cleanup (HTML5 Canvas)
- **Crop & Rotate:** Interactive rectangular crop box with drag handles + **Rotate 90°** button to cut out surrounding paragraphs, margins, and nearby questions.
- **Whiteout / Eraser Brush:** Toggleable whiteout brush (with Undo) so any stray caption (e.g., *"Fig. 3.2"*) or unwanted text sitting inside the crop rectangle can be painted out to pure `#FFFFFF`.
- **Filter Mode:**
  - **Book Scan (B&W)** *(default)*: Converts to luminance, applies local/adaptive background normalization (estimates local background brightness so shadows and page curvature fade to `#FFFFFF`) + contrast threshold with a **Clarity / Ink Darkness** slider.
  - **Grayscale**: Clean high-contrast grayscale for shaded illustrations.
  - **Original**: Cropped/rotated color image.
- **Live Preview & Apply:** Shows the cleaned result; clicking **Use Figure** exports the cropped canvas as a PNG (`max 1600px` longest edge), calls `attach(blob)` (existing `/api/uploads` flow), and closes the modal.

### 5.3 Phone Capture Route & Session API
- **`POST /api/capture-session`** (authenticated teacher route):
  - Generates a 128-bit random hex token (`randomBytes(16).toString("hex")`).
  - Stores a session record in `UPLOAD_DIR/.capture-sessions/${token}.json` with `{ createdAt, expiresAt: now + 10m, status: "pending" }`.
  - Returns `{ token, expiresAt }`.
- **`GET /api/capture-session/[token]`**:
  - Used by the laptop modal to poll status (authenticated) and by `/capture/[token]` to verify the token is still valid.
  - If `?image=1` and status is `"ready"`, streams the uploaded image bytes and deletes the temporary session files (single-use cleanup).
- **`POST /api/capture-session/[token]`** (authorized by valid unexpired single-use token):
  - Accepts `multipart/form-data` image (`PNG`/`JPEG`/`WebP`, max 5 MB), saves it to `UPLOAD_DIR/.capture-sessions/${token}.bin`, marks session `"ready"`.
- **`/capture/[token]`** (lightweight mobile page):
  - Clean mobile UI: shows **"Snap Figure from Book"** button (`<input type="file" accept="image/*" capture="environment">`), client-side downscales to `max 1800px` JPEG before uploading so mobile uploads are fast (~200–500 KB), shows a clear **"Sent to your laptop! You can close this tab."** confirmation.

### 5.4 Decisions Made (Defaults)
- **Session storage on disk (`UPLOAD_DIR/.capture-sessions`):** Works reliably across Next.js route workers without needing a new Prisma table or Redis; expired sessions (>10 min) are opportunistically pruned on session creation.
- **Adaptive background normalization in Canvas:** Chosen over a flat global threshold because book photos almost always have uneven lighting or spine shadows; a simple box-blur background division (`pixel / localAvg`) before thresholding handles shadows cleanly in pure JS/Canvas with zero external dependencies.
- **QR code rendering:** Use a lightweight client-side QR generator (`qrcode` npm package or small SVG generator) so no external QR API is called (works offline/LAN).

## 6. Left to the Builder
- Exact box-blur kernel radius and default threshold curve for the **Book Scan (B&W)** filter (tunable via the Clarity slider).
- Exact touch/mouse drag handle ergonomics for the crop overlay.
- Choice of `qrcode` package vs. minimal inline QR SVG module.
