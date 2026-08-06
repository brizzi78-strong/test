/**
 * A tiny, dependency-free QR Code encoder — just enough to turn a verify URL
 * into a scannable code we can print on a report.
 *
 * Scope, deliberately narrow (keeps the surface small and correct):
 *   - byte mode only (URLs are arbitrary bytes),
 *   - error-correction level M (a solid 15% recovery — good for print),
 *   - versions 1–9 (up to ~150 bytes; our URLs are ~70).
 *
 * The hard, standardized parts — GF(256) arithmetic, Reed–Solomon, the
 * data/mask/format placement — follow ISO/IEC 18004 exactly, so the output is
 * a conformant symbol any reader can scan. Verified two ways in the tests:
 * against the canonical Reed–Solomon vector, and by decoding our own output
 * back to the original string.
 */

// --- GF(256) arithmetic (primitive polynomial 0x11D) ----------------------
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function mul(a: number, b: number): number {
  return a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]];
}

/** Reed–Solomon generator polynomial of the given degree (high term first). */
function rsGenerator(degree: number): number[] {
  let poly = [1];
  for (let d = 0; d < degree; d++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let i = 0; i < poly.length; i++) {
      next[i] ^= poly[i];
      next[i + 1] ^= mul(poly[i], EXP[d]);
    }
    poly = next;
  }
  return poly;
}

/** The `ecLen` error-correction codewords for a block of data codewords. */
export function rsEncode(data: readonly number[], ecLen: number): number[] {
  const gen = rsGenerator(ecLen);
  const res = new Array(ecLen).fill(0);
  for (const coef of data) {
    const factor = coef ^ res[0];
    res.shift();
    res.push(0);
    if (factor !== 0) for (let i = 0; i < ecLen; i++) res[i] ^= mul(gen[i + 1], factor);
  }
  return res;
}

// --- version / error-correction characteristics (level M) -----------------
interface EccInfo {
  ec: number; // EC codewords per block
  blocks: [number, number][]; // [blockCount, dataCodewordsPerBlock]
}
const ECC_M: Record<number, EccInfo> = {
  1: { ec: 10, blocks: [[1, 16]] },
  2: { ec: 16, blocks: [[1, 28]] },
  3: { ec: 26, blocks: [[1, 44]] },
  4: { ec: 18, blocks: [[2, 32]] },
  5: { ec: 24, blocks: [[2, 43]] },
  6: { ec: 16, blocks: [[4, 27]] },
  7: { ec: 18, blocks: [[4, 31]] },
  8: { ec: 22, blocks: [[2, 38], [2, 39]] },
  9: { ec: 22, blocks: [[3, 36], [2, 37]] },
};
// Alignment-pattern centre coordinates per version.
const ALIGN: Record<number, number[]> = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
  6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46],
};

function dataCodewordCount(v: number): number {
  return ECC_M[v].blocks.reduce((n, [count, data]) => n + count * data, 0);
}
/** Usable payload bytes at version v (byte mode: 4-bit mode + 8-bit count). */
function capacityBytes(v: number): number {
  return Math.floor((dataCodewordCount(v) * 8 - 12) / 8);
}
function pickVersion(len: number): number {
  for (let v = 1; v <= 9; v++) if (capacityBytes(v) >= len) return v;
  throw new Error(`data too long for QR versions 1–9 (${len} bytes)`);
}

export interface QrResult {
  version: number;
  size: number;
  modules: boolean[][];
  /** true where a module is a function pattern (finder/timing/format/…). */
  isFunction: boolean[][];
  mask: number;
}

function getBit(x: number, i: number): boolean {
  return ((x >>> i) & 1) !== 0;
}

/** Encode `text` (UTF-8) as a QR symbol. */
export function encodeQr(text: string): QrResult {
  const bytes = utf8(text);
  const version = pickVersion(bytes.length);
  const size = 17 + 4 * version;

  // 1) Build the data bit stream: mode + count + payload + terminator + pad.
  const bits: number[] = [];
  const push = (val: number, n: number) => {
    for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  };
  push(0b0100, 4); // byte mode
  push(bytes.length, 8); // char count (8 bits for versions 1–9)
  for (const b of bytes) push(b, 8);

  const totalData = dataCodewordCount(version);
  const capacityBits = totalData * 8;
  for (let i = 0; i < 4 && bits.length < capacityBits; i++) bits.push(0); // terminator
  while (bits.length % 8 !== 0) bits.push(0); // byte align
  const pad = [0xec, 0x11];
  for (let i = 0; bits.length < capacityBits; i++) push(pad[i % 2], 8);

  const dataCodewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    dataCodewords.push(byte);
  }

  // 2) Split into blocks, add EC, then interleave data then EC.
  const info = ECC_M[version];
  const dataBlocks: number[][] = [];
  const ecBlocks: number[][] = [];
  let offset = 0;
  for (const [count, dataLen] of info.blocks) {
    for (let b = 0; b < count; b++) {
      const block = dataCodewords.slice(offset, offset + dataLen);
      offset += dataLen;
      dataBlocks.push(block);
      ecBlocks.push(rsEncode(block, info.ec));
    }
  }
  const final: number[] = [];
  const maxData = Math.max(...dataBlocks.map((b) => b.length));
  for (let i = 0; i < maxData; i++)
    for (const block of dataBlocks) if (i < block.length) final.push(block[i]);
  for (let i = 0; i < info.ec; i++) for (const block of ecBlocks) final.push(block[i]);

  // 3) Lay out the matrix.
  const modules: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
  const setFn = (r: number, c: number, dark: boolean) => {
    modules[r][c] = dark;
    isFunction[r][c] = true;
  };

  // Finder patterns + separators.
  const finder = (r0: number, c0: number) => {
    for (let dr = -1; dr <= 7; dr++)
      for (let dc = -1; dc <= 7; dc++) {
        const r = r0 + dr;
        const c = c0 + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const ring = (dr >= 0 && dr <= 6 && (dc === 0 || dc === 6)) || (dc >= 0 && dc <= 6 && (dr === 0 || dr === 6));
        const center = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFn(r, c, ring || center);
      }
  };
  finder(0, 0);
  finder(0, size - 7);
  finder(size - 7, 0);

  // Timing patterns.
  for (let i = 8; i < size - 8; i++) {
    const dark = i % 2 === 0;
    setFn(6, i, dark);
    setFn(i, 6, dark);
  }

  // Alignment patterns (skip any overlapping a finder region).
  const centers = ALIGN[version];
  for (const r of centers)
    for (const c of centers) {
      if ((r <= 7 && c <= 7) || (r <= 7 && c >= size - 8) || (r >= size - 8 && c <= 7)) continue;
      for (let dr = -2; dr <= 2; dr++)
        for (let dc = -2; dc <= 2; dc++)
          setFn(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
    }

  // Dark module.
  setFn(size - 8, 8, true);

  // Reserve format-info modules (filled after masking).
  reserveFormat(isFunction, size);
  // Version info (versions ≥ 7).
  if (version >= 7) drawVersion(version, size, setFn);

  // 4) Place data codewords in the zig-zag.
  {
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? size - 1 - vert : vert;
          if (!isFunction[y][x] && i < final.length * 8) {
            modules[y][x] = getBit(final[i >>> 3], 7 - (i & 7));
            i++;
          }
        }
      }
    }
  }

  // 5) Try every mask; keep the lowest-penalty one.
  let bestMask = 0;
  let bestPenalty = Infinity;
  let bestModules = modules;
  for (let mask = 0; mask < 8; mask++) {
    const trial = modules.map((row) => row.slice());
    applyMask(trial, isFunction, mask);
    drawFormat(trial, isFunction, size, mask);
    const p = penalty(trial, size);
    if (p < bestPenalty) {
      bestPenalty = p;
      bestMask = mask;
      bestModules = trial;
    }
  }

  return { version, size, modules: bestModules, isFunction, mask: bestMask };
}

// --- placement helpers -----------------------------------------------------

function reserveFormat(isFunction: boolean[][], size: number): void {
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      isFunction[8][i] = true;
      isFunction[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i++) {
    isFunction[8][size - 1 - i] = true;
    isFunction[size - 1 - i][8] = true;
  }
}

/** The 8 mask conditions from the spec (x = column, y = row). */
export function maskCondition(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    case 7: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
    default: throw new Error('bad mask');
  }
}

function applyMask(modules: boolean[][], isFunction: boolean[][], mask: number): void {
  const size = modules.length;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (!isFunction[y][x] && maskCondition(mask, x, y)) modules[y][x] = !modules[y][x];
}

/** 15-bit format information for level M + mask (BCH, XOR-masked). */
export function formatBits(mask: number): number {
  const data = (0b00 << 3) | mask; // level M = 0b00
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

function drawFormat(modules: boolean[][], isFunction: boolean[][], size: number, mask: number): void {
  const bits = formatBits(mask);
  const set = (r: number, c: number, i: number) => {
    modules[r][c] = getBit(bits, i);
    isFunction[r][c] = true;
  };
  // First copy — the "L" around the top-left finder (skipping timing row/col 6).
  for (let i = 0; i <= 5; i++) set(i, 8, i);
  set(7, 8, 6);
  set(8, 8, 7);
  set(8, 7, 8);
  for (let i = 9; i < 15; i++) set(8, 14 - i, i);
  // Second copy — top-right (row 8) and bottom-left (col 8), by the dark module.
  for (let i = 0; i < 8; i++) set(8, size - 1 - i, i);
  for (let i = 8; i < 15; i++) set(size - 15 + i, 8, i);
}

function drawVersion(version: number, size: number, setFn: (r: number, c: number, dark: boolean) => void): void {
  let rem = version;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  const bits = (version << 12) | rem; // 18 bits
  for (let i = 0; i < 18; i++) {
    const bit = getBit(bits, i);
    const a = size - 11 + (i % 3);
    const b = Math.floor(i / 3);
    setFn(a, b, bit);
    setFn(b, a, bit);
  }
}

// --- mask penalty (ISO/IEC 18004 §8.8.2) ----------------------------------
function penalty(m: boolean[][], size: number): number {
  let score = 0;
  // Rule 1: runs of ≥5 same-coloured modules in each row and column.
  for (let i = 0; i < size; i++) {
    let rowColor = m[i][0], rowRun = 1, colColor = m[0][i], colRun = 1;
    for (let j = 1; j < size; j++) {
      if (m[i][j] === rowColor) rowRun++;
      else {
        if (rowRun >= 5) score += rowRun - 2;
        rowColor = m[i][j];
        rowRun = 1;
      }
      if (m[j][i] === colColor) colRun++;
      else {
        if (colRun >= 5) score += colRun - 2;
        colColor = m[j][i];
        colRun = 1;
      }
    }
    if (rowRun >= 5) score += rowRun - 2;
    if (colRun >= 5) score += colRun - 2;
  }
  // Rule 2: 2×2 blocks of one colour.
  for (let y = 0; y < size - 1; y++)
    for (let x = 0; x < size - 1; x++) {
      const c = m[y][x];
      if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) score += 3;
    }
  // Rule 3: finder-like 1:1:3:1:1 patterns in rows and columns.
  const pat1 = [true, false, true, true, true, false, true, false, false, false, false];
  const pat2 = [false, false, false, false, true, false, true, true, true, false, true];
  const matches = (get: (k: number) => boolean, pat: boolean[]): boolean => {
    for (let k = 0; k < 11; k++) if (get(k) !== pat[k]) return false;
    return true;
  };
  for (let y = 0; y < size; y++)
    for (let x = 0; x <= size - 11; x++) {
      if (matches((k) => m[y][x + k], pat1) || matches((k) => m[y][x + k], pat2)) score += 40;
      if (matches((k) => m[x + k][y], pat1) || matches((k) => m[x + k][y], pat2)) score += 40;
    }
  // Rule 4: deviation of dark-module proportion from 50%.
  let dark = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (m[y][x]) dark++;
  const percent = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;
  return score;
}

// --- rendering -------------------------------------------------------------

export interface SvgOptions {
  scale?: number;
  margin?: number; // quiet-zone modules (spec minimum is 4)
  dark?: string;
  light?: string;
}

/** Render `text` as a self-contained SVG string (crisp, theme-neutral). */
export function qrSvg(text: string, opts: SvgOptions = {}): string {
  const scale = opts.scale ?? 4;
  const margin = opts.margin ?? 4;
  const dark = opts.dark ?? '#111111';
  const light = opts.light ?? '#ffffff';
  const { size, modules } = encodeQr(text);
  const dim = (size + margin * 2) * scale;
  let rects = '';
  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      if (!modules[y][x]) {
        x++;
        continue;
      }
      let run = 1;
      while (x + run < size && modules[y][x + run]) run++;
      const px = (x + margin) * scale;
      const py = (y + margin) * scale;
      rects += `<rect x="${px}" y="${py}" width="${run * scale}" height="${scale}"/>`;
      x += run;
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}" ` +
    `shape-rendering="crispEdges" role="img" aria-label="QR code">` +
    `<rect width="${dim}" height="${dim}" fill="${light}"/>` +
    `<g fill="${dark}">${rects}</g></svg>`
  );
}

function utf8(text: string): number[] {
  return Array.from(new TextEncoder().encode(text));
}
