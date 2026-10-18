/**
 * Encodes and decodes custom scene JSON inside PNG tEXt chunks.
 * This allows saved figure PNGs to be re-opened in the Figure Studio with full vector editability.
 */

// CRC32 lookup table
const crcTable: Uint32Array = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

export function crc32(buf: Uint8Array, offset = 0, length = buf.length - offset): number {
  let c = 0xffffffff;
  const end = offset + length;
  for (let i = offset; i < end; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const PNG_SIG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function isPng(bytes: Uint8Array): boolean {
  if (bytes.length < 8) return false;
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== PNG_SIG[i]) return false;
  }
  return true;
}

export const PNG_KEYWORD = "examfig";

/**
 * Creates a tEXt chunk containing `keyword\0text`.
 */
export function makeTextChunk(keyword: string, text: string): Uint8Array {
  const enc = new TextEncoder();
  const kwBytes = enc.encode(keyword);
  const textBytes = enc.encode(text);
  const dataLen = kwBytes.length + 1 + textBytes.length; // 1 for null terminator

  const chunk = new Uint8Array(4 + 4 + dataLen + 4);
  const view = new DataView(chunk.buffer);

  // 1. Length (4 bytes)
  view.setUint32(0, dataLen);

  // 2. Type "tEXt" (4 bytes)
  chunk[4] = 0x74; // 't'
  chunk[5] = 0x45; // 'E'
  chunk[6] = 0x58; // 'X'
  chunk[7] = 0x74; // 't'

  // 3. Data: keyword + null byte + text
  chunk.set(kwBytes, 8);
  chunk[8 + kwBytes.length] = 0; // null separator
  chunk.set(textBytes, 8 + kwBytes.length + 1);

  // 4. CRC32 over Type + Data (4 + dataLen bytes)
  const crc = crc32(chunk, 4, 4 + dataLen);
  view.setUint32(8 + dataLen, crc);

  return chunk;
}

/**
 * Embeds scene JSON into a PNG blob right before the IDAT or IEND chunk.
 */
export async function embedSceneInPng(pngBlob: Blob, sceneJson: string): Promise<Blob> {
  const buf = await pngBlob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  if (!isPng(bytes)) return pngBlob;

  // Don't embed if JSON is excessively large (> 1.2 MB)
  if (sceneJson.length > 1200000) return pngBlob;

  const tExtChunk = makeTextChunk(PNG_KEYWORD, sceneJson);

  // Locate insertion point: right after IHDR chunk (typically around offset 33)
  const view = new DataView(buf);
  let offset = 8;
  let insertAt = -1;

  while (offset + 8 <= bytes.length) {
    const chunkLen = view.getUint32(offset);
    const typeStr = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7],
    );

    if (typeStr === "IHDR") {
      insertAt = offset + 12 + chunkLen;
      break;
    }
    offset += 12 + chunkLen;
  }

  if (insertAt < 0) insertAt = 8; // fallback after signature

  const newBytes = new Uint8Array(bytes.length + tExtChunk.length);
  newBytes.set(bytes.subarray(0, insertAt), 0);
  newBytes.set(tExtChunk, insertAt);
  newBytes.set(bytes.subarray(insertAt), insertAt + tExtChunk.length);

  return new Blob([newBytes], { type: "image/png" });
}

/**
 * Extracts embedded scene JSON from a PNG ArrayBuffer if present.
 */
export function extractSceneFromPng(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer);
  if (!isPng(bytes)) return null;

  const view = new DataView(buffer);
  let offset = 8;

  while (offset + 8 <= bytes.length) {
    const chunkLen = view.getUint32(offset);
    const type = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7],
    );

    if (type === "tEXt") {
      const dataStart = offset + 8;
      const dataEnd = dataStart + chunkLen;
      const data = bytes.subarray(dataStart, dataEnd);

      // find null separator
      let nullIdx = -1;
      for (let i = 0; i < data.length; i++) {
        if (data[i] === 0) {
          nullIdx = i;
          break;
        }
      }

      if (nullIdx > 0) {
        const dec = new TextDecoder();
        const kw = dec.decode(data.subarray(0, nullIdx));
        if (kw === PNG_KEYWORD) {
          return dec.decode(data.subarray(nullIdx + 1));
        }
      }
    }

    offset += 12 + chunkLen;
  }

  return null;
}
