import { test } from 'node:test';
import assert from 'node:assert/strict';

import { rsEncode, encodeQr, qrSvg, maskCondition, formatBits } from '../service/qr.ts';

// Block structure (level M) — mirrors the encoder's table, used here to decode.
const ECC_M: Record<number, { ec: number; blocks: [number, number][] }> = {
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

test('Reed–Solomon matches the canonical HELLO WORLD vector', () => {
  // "HELLO WORLD" alphanumeric, version 1-M — the standard worked example.
  const data = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
  const expected = [196, 35, 39, 119, 235, 215, 231, 226, 93, 23];
  assert.deepEqual(rsEncode(data, 10), expected);
});

test('the symbol carries finder patterns, separators, and the dark module', () => {
  const { size, modules } = encodeQr('https://blueridgepressllc.com/verify');
  // Top-left finder: a solid 7-wide top edge, then a white separator.
  for (let c = 0; c <= 6; c++) assert.equal(modules[0][c], true, `finder col ${c}`);
  assert.equal(modules[0][7], false, 'separator');
  // Finder centre is filled.
  assert.equal(modules[3][3], true);
  // Mandatory dark module.
  assert.equal(modules[size - 8][8], true);
});

test('format information round-trips to the chosen mask at level M', () => {
  const { size, modules, mask } = encodeQr('https://example.com/verify?ref=BRP-2026-ABC123&code=WXYZ-2345');
  // Read the first format-info copy (inverse of the encoder's placement).
  const pos: [number, number][] = [];
  for (let i = 0; i <= 5; i++) pos.push([i, 8]);
  pos.push([7, 8], [8, 8], [8, 7]);
  for (let i = 9; i < 15; i++) pos.push([8, 14 - i]);
  let raw = 0;
  pos.forEach(([r, c], i) => {
    if (modules[r][c]) raw |= 1 << i;
  });
  const data5 = (raw ^ 0x5412) >>> 10; // strip BCH mask, keep the 5 data bits
  assert.equal(data5 >>> 3, 0b00, 'error-correction level M');
  assert.equal(data5 & 0b111, mask, 'mask bits match the chosen mask');
  assert.equal(formatBits(mask) & 0x7fff, raw, 'placed bits equal the computed format word');
  assert.ok(size >= 21);
});

/** Independent decoder: recover the payload straight from the module grid. */
function decode(text: string): string {
  const { version, size, modules, isFunction, mask } = encodeQr(text);

  // 1) Undo the mask on data modules.
  const grid = modules.map((row) => row.slice());
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (!isFunction[y][x] && maskCondition(mask, x, y)) grid[y][x] = !grid[y][x];

  // 2) Walk the zig-zag, collecting data-module bits in placement order.
  const bits: number[] = [];
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const xx = right - j;
        const upward = ((right + 1) & 2) === 0;
        const yy = upward ? size - 1 - vert : vert;
        if (!isFunction[yy][xx]) bits.push(grid[yy][xx] ? 1 : 0);
      }
    }
  }

  // 3) Pack to codewords; take the interleaved data region.
  const stream: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let b = 0;
    for (let k = 0; k < 8; k++) b = (b << 1) | bits[i + k];
    stream.push(b);
  }
  const info = ECC_M[version];
  const dataLens: number[] = [];
  for (const [count, len] of info.blocks) for (let b = 0; b < count; b++) dataLens.push(len);
  const totalData = dataLens.reduce((a, b) => a + b, 0);
  const interleaved = stream.slice(0, totalData);

  // 4) De-interleave into per-block data codewords, then concatenate.
  const blocks: number[][] = dataLens.map(() => []);
  const maxLen = Math.max(...dataLens);
  let idx = 0;
  for (let i = 0; i < maxLen; i++)
    for (let b = 0; b < dataLens.length; b++) if (i < dataLens[b]) blocks[b].push(interleaved[idx++]);
  const codewords = ([] as number[]).concat(...blocks);

  // 5) Parse: mode (0100) + 8-bit length + payload bytes.
  const cwBits: number[] = [];
  for (const cw of codewords) for (let k = 7; k >= 0; k--) cwBits.push((cw >>> k) & 1);
  let p = 0;
  const take = (n: number) => {
    let v = 0;
    for (let k = 0; k < n; k++) v = (v << 1) | cwBits[p++];
    return v;
  };
  assert.equal(take(4), 0b0100, 'byte mode');
  const len = take(8);
  const out: number[] = [];
  for (let i = 0; i < len; i++) out.push(take(8));
  return new TextDecoder().decode(new Uint8Array(out));
}

test('encode → decode round-trips a realistic verify URL', () => {
  const url = 'https://blueridgepressllc.com/verify?ref=BRP-2026-K7Q2ML&code=8ML2-QP34';
  assert.equal(decode(url), url);
});

test('round-trips across sizes: short, medium, and long payloads', () => {
  const cases = [
    'x',
    'https://blueridgepressllc.com/verify',
    'https://blueridgepressllc.com/verify?ref=BRP-2026-ABCDEF&code=WXYZ-2345&extra=padding-to-grow-the-symbol-1234567890',
  ];
  for (const c of cases) assert.equal(decode(c), c, `round-trip: ${c.slice(0, 24)}…`);
});

test('qrSvg renders a self-contained, scalable SVG', () => {
  const svg = qrSvg('https://blueridgepressllc.com/verify?ref=BRP-2026-K7Q2ML&code=8ML2-QP34');
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, /<rect /);
  assert.match(svg, /shape-rendering="crispEdges"/);
  assert.ok(!svg.includes('http://www.w3.org/2000/svg"></svg>')); // not empty
});

test('overly long data is rejected rather than producing a bad symbol', () => {
  assert.throws(() => encodeQr('a'.repeat(400)), /too long/);
});
