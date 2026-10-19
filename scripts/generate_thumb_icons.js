import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';

function createPng(width, height, getAlpha) {
  // 8x8 supersampling for pristine antialiasing
  const rgba = Buffer.alloc(width * height * 4);
  const SAMPLES = 8;
  const step = 1 / SAMPLES;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let hits = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const subX = x + (sx + 0.5) * step;
          const subY = y + (sy + 0.5) * step;
          if (getAlpha(subX, subY)) hits++;
        }
      }
      const alpha = Math.round((hits / (SAMPLES * SAMPLES)) * 255);
      const idx = (y * width + x) * 4;
      rgba[idx] = 255;       // R
      rgba[idx + 1] = 255;   // G
      rgba[idx + 2] = 255;   // B
      rgba[idx + 3] = alpha; // A
    }
  }

  // Raw scanlines with filter byte 0 (None)
  const rawData = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    rawData[y * (width * 4 + 1)] = 0; // Filter None
    rgba.copy(rawData, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(rawData);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    
    // CRC-32 over type + data
    let crc = 0xFFFFFFFF;
    const combined = Buffer.concat([typeBuf, data]);
    for (let i = 0; i < combined.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ combined[i]) & 0xFF];
    }
    crc = (crc ^ 0xFFFFFFFF) >>> 0;
    crcBuf.writeUInt32BE(crc, 0);

    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    header,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

// Precompute CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

const W = 48;
const H = 48;

function sdRoundedBox(x, y, cx, cy, halfW, halfH, r) {
  const dx = Math.abs(x - cx) - (halfW - r);
  const dy = Math.abs(y - cy) - (halfH - r);
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  const inside = Math.min(Math.max(dx, dy), 0);
  return outside + inside - r;
}

function pointInTriangle(px, py, x1, y1, x2, y2, x3, y3) {
  const d1 = (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
  const d2 = (px - x3) * (y2 - y3) - (x2 - x3) * (py - y3);
  const d3 = (px - x1) * (y3 - y1) - (x3 - x1) * (py - y1);
  const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
  const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
  return !(hasNeg && hasPos);
}

// 1. Play: Centered, aesthetically balanced right-facing triangle
// Height 26px (from y=11 to y=37), Width 22px (from x=15 to x=37)
// Visual center is slightly offset to account for triangle mass
const playPng = createPng(W, H, (x, y) => {
  return pointInTriangle(x, y, 16.0, 11.0, 16.0, 37.0, 37.0, 24.0);
});

// 2. Pause: Two clean vertical bars with rounded caps
// Height 26px (from y=11 to y=37), width 5.5px each, gap 9px
const pausePng = createPng(W, H, (x, y) => {
  const b1 = sdRoundedBox(x, y, 17.5, 24.0, 2.75, 13.0, 2.0);
  const b2 = sdRoundedBox(x, y, 30.5, 24.0, 2.75, 13.0, 2.0);
  return b1 <= 0 || b2 <= 0;
});

// 3. Prev: Left vertical bar with rounded caps + Left-pointing triangle
const prevPng = createPng(W, H, (x, y) => {
  const bar = sdRoundedBox(x, y, 12.5, 24.0, 2.25, 13.0, 1.8);
  if (bar <= 0) return true;
  return pointInTriangle(x, y, 36.5, 11.5, 36.5, 36.5, 17.5, 24.0);
});

// 4. Next: Right-pointing triangle + Right vertical bar with rounded caps
const nextPng = createPng(W, H, (x, y) => {
  const bar = sdRoundedBox(x, y, 35.5, 24.0, 2.25, 13.0, 1.8);
  if (bar <= 0) return true;
  return pointInTriangle(x, y, 11.5, 11.5, 11.5, 36.5, 30.5, 24.0);
});

const outDir = path.resolve('src-tauri/icons');
fs.writeFileSync(path.join(outDir, 'thumb_play.png'), playPng);
fs.writeFileSync(path.join(outDir, 'thumb_pause.png'), pausePng);
fs.writeFileSync(path.join(outDir, 'thumb_prev.png'), prevPng);
fs.writeFileSync(path.join(outDir, 'thumb_next.png'), nextPng);
console.log('Successfully generated beautiful 48x48 high-DPI antialiased icons in src-tauri/icons/');
