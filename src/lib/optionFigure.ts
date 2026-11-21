// A choice option may carry a picture: "[[fig:3f2a….png]] caption". The marker leads the stored option string,
// so text-only options (everything saved before figure options existed) read exactly as they always did.

const FIGURE_MARKER = /^\s*\[\[fig:([A-Za-z0-9._-]+)\]\]\s*/;

export type OptionParts = { figure: string | null; text: string };

/** The option's figure (a file name in data/uploads) and the text beside it; figure is null for a text-only option. */
export function splitOptionFigure(option: string | null | undefined): OptionParts {
  const s = option ?? "";
  // A stray choice label typed before the marker ("(a) [[fig:x.png]]") must not hide it.
  const lead = s.match(/^[\s​]*(\([A-Za-z0-9]{1,4}\)|[A-Za-z0-9][.)])\s*(?=\[\[fig:)/);
  const rest = lead ? s.slice(lead[0].length) : s;
  const m = rest.match(FIGURE_MARKER);
  if (!m) return { figure: null, text: s };
  return { figure: m[1], text: rest.slice(m[0].length) };
}

/** The stored option string for a figure (or none) and its text. */
export function joinOptionFigure(figure: string | null | undefined, text: string): string {
  const t = text ?? "";
  if (!figure) return t;
  return t.trim() ? `[[fig:${figure}]] ${t.trimStart()}` : `[[fig:${figure}]]`;
}

/** The option with any figure marker removed, for places that only show or compare text. */
export function optionTextOnly(option: string | null | undefined): string {
  return splitOptionFigure(option).text;
}

export function hasFigureOptions(options: readonly (string | null | undefined)[] | null | undefined): boolean {
  return Array.isArray(options) && options.some((o) => splitOptionFigure(o).figure !== null);
}

/**
 * Columns for a grid of picture options: four across when there are four or fewer and they carry at most a word
 * or two each, otherwise two across.
 */
export function figureOptionColumns(options: readonly string[], isA5 = false): 2 | 4 {
  const longestCaption = Math.max(0, ...options.map((o) => splitOptionFigure(o).text.trim().length));
  return options.length <= 4 && longestCaption <= (isA5 ? 10 : 18) ? 4 : 2;
}

/** Width × height of a PNG, GIF or JPEG from its bytes, or null for anything else. */
export function imageDimensions(buf: Uint8Array): { width: number; height: number } | null {
  const u16be = (i: number) => (buf[i] << 8) | buf[i + 1];
  const u32be = (i: number) => ((buf[i] << 24) | (buf[i + 1] << 16) | (buf[i + 2] << 8) | buf[i + 3]) >>> 0;
  if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { width: u32be(16), height: u32be(20) };
  }
  if (buf.length >= 10 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    return { width: buf[6] | (buf[7] << 8), height: buf[8] | (buf[9] << 8) };
  }
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) return null;
      const marker = buf[i + 1];
      const len = u16be(i + 2);
      // SOF0–SOF15 except DHT (C4), JPG (C8) and DAC (CC) carry the frame size
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { width: u16be(i + 7), height: u16be(i + 5) };
      }
      i += 2 + len;
    }
  }
  return null;
}

/** Scales width × height to fit a box, keeping the aspect ratio. */
export function fitInBox(dims: { width: number; height: number } | null, boxW: number, boxH: number): { width: number; height: number } {
  if (!dims || dims.width <= 0 || dims.height <= 0) return { width: boxW, height: boxH };
  const k = Math.min(boxW / dims.width, boxH / dims.height);
  return { width: Math.max(1, Math.round(dims.width * k)), height: Math.max(1, Math.round(dims.height * k)) };
}
