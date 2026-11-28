/**
 * Repeatable "random" helpers: the same content always prints the same way (on screen, in print and
 * in the answer key), so a mixed-up column or a word-search grid never jumps around between renders.
 */

/** A small whole number from any text (FNV-1a). */
export function hashText(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Numbers in [0, 1) that follow from the seed (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * An order for n items where, from 2 items up, nothing stays in its own place (so no answer sits
 * straight across from its match). order[k] is the index of the item printed in place k.
 */
export function mixedOrder(n: number, seedText: string): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  if (n < 2) return order;
  const rand = seededRandom(hashText(seedText));
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  // Swap any item still in its own place with its neighbour; this never puts another one back home.
  for (let k = 0; k < n; k++) {
    if (order[k] === k) {
      const other = k === n - 1 ? k - 1 : k + 1;
      [order[k], order[other]] = [order[other], order[k]];
    }
  }
  return order;
}
