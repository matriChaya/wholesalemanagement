import fs from 'fs';
import zlib from 'zlib';
import path from 'path';

// Standard CRC32 table for PNG chunks
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[i] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function createPng(width, height, getPixelRgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // RGBA color type
  ihdr.writeUInt8(0, 10); // Deflate compression
  ihdr.writeUInt8(0, 11); // Filter method
  ihdr.writeUInt8(0, 12); // Interlace off
  const ihdrChunk = createChunk('IHDR', ihdr);

  // Scanlines with filter byte 0 (None)
  const rawData = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixelRgba(x, y, width, height);
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Draw Matrichhaya Telecom Icon
function generateIcon(width, height, isMaskable = false) {
  const center = width / 2;
  const outerRadius = isMaskable ? width * 0.48 : width * 0.44;

  return createPng(width, height, (x, y) => {
    // Normalization
    const nx = (x - center) / center; // -1 to 1
    const ny = (y - center) / center; // -1 to 1
    const distSq = nx * nx + ny * ny;

    if (isMaskable) {
      // Full bleed emerald background with smooth subtle gradient
      const grad = 0.5 + 0.5 * (nx * 0.3 + ny * 0.7);
      const bgR = Math.round(5 + 10 * grad);
      const bgG = Math.round(150 + 40 * grad);
      const bgB = Math.round(105 + 20 * grad);

      // Inner card
      const cnx = Math.abs(nx) * 1.5;
      const cny = Math.abs(ny) * 1.5;
      const isCard = cnx < 0.65 && cny < 0.65;

      if (isCard) {
        // High contrast dark blue-slate core
        // Telecom stylized M / antenna symbol
        const inM = Math.abs(nx) < 0.35 && Math.abs(ny) < 0.35;
        if (inM && (Math.abs(nx - ny * 0.5) < 0.08 || Math.abs(nx + ny * 0.5) < 0.08 || Math.abs(nx) < 0.08)) {
          return [255, 255, 255, 255]; // Crisp white icon
        }
        return [15, 23, 42, 255]; // Slate 900
      }

      return [bgR, bgG, bgB, 255];
    } else {
      // Rounded icon for standard display
      const cornerR = 0.22;
      const qx = Math.max(0, Math.abs(nx) - (1 - cornerR * 2));
      const qy = Math.max(0, Math.abs(ny) - (1 - cornerR * 2));
      const cornerDist = Math.sqrt(qx * qx + qy * qy);
      const isInsideRoundedRect = Math.abs(nx) <= 0.92 && Math.abs(ny) <= 0.92 && cornerDist <= cornerR * 2;

      if (!isInsideRoundedRect) {
        return [0, 0, 0, 0]; // Transparent outside
      }

      // Emerald gradient
      const grad = 0.5 + 0.5 * (nx * 0.3 + ny * 0.7);
      const r = Math.round(4 + 15 * grad);
      const g = Math.round(150 + 40 * grad);
      const b = Math.round(105 + 25 * grad);

      // Inner slate shape
      const inBoxX = Math.abs(nx) < 0.55;
      const inBoxY = Math.abs(ny) < 0.55;
      if (inBoxX && inBoxY) {
        // Draw telecom badge / phone / check
        if (Math.abs(nx) < 0.38 && Math.abs(ny) < 0.38) {
          // White symbol
          if (
            (Math.abs(nx) > 0.22 && Math.abs(nx) < 0.32 && ny > -0.25 && ny < 0.25) || // pillars
            (Math.abs(nx - ny) < 0.06 && nx >= -0.22 && nx <= 0.0 && ny <= 0.1) ||
            (Math.abs(nx + ny) < 0.06 && nx <= 0.22 && nx >= 0.0 && ny <= 0.1) ||
            (Math.abs(ny - 0.22) < 0.04 && Math.abs(nx) < 0.25) // base bar
          ) {
            return [255, 255, 255, 255];
          }
          // Cyan signal dot
          const dotDist = Math.hypot(nx - 0.25, ny - (-0.25));
          if (dotDist < 0.08) {
            return [56, 189, 248, 255]; // Sky blue
          }
        }
        return [15, 23, 42, 255]; // Slate-900 core
      }

      return [r, g, b, 255];
    }
  });
}

const publicDir = path.resolve('public');
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generateIcon(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generateIcon(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generateIcon(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generateIcon(180, 180, false));

console.log('Successfully generated all PWA PNG icons!');
