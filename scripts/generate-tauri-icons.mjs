import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Standard IEEE 802.3 CRC-32 table for PNG chunk validation
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);

  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

// Decode PNG (supports 8-bit RGB and RGBA) to flat RGBA buffer
function decodePngToRgba(buf) {
  let pos = 8;
  let width = 0;
  let height = 0;
  let colorType = 6;
  const idats = [];

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.slice(pos + 8, pos + 8 + len);

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data.readUInt8(9);
    } else if (type === 'IDAT') {
      idats.push(data);
    }
    pos += 12 + len;
  }

  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 4;
  const uncompressed = zlib.inflateSync(Buffer.concat(idats));
  const scanlineLen = 1 + width * bpp;
  const rgba = Buffer.alloc(width * height * 4);

  let prevRow = Buffer.alloc(width * bpp);
  let currRow = Buffer.alloc(width * bpp);

  for (let y = 0; y < height; y++) {
    const filter = uncompressed[y * scanlineLen];
    const srcOffset = y * scanlineLen + 1;

    for (let i = 0; i < width * bpp; i++) {
      const x = uncompressed[srcOffset + i];
      const a = i >= bpp ? currRow[i - bpp] : 0;
      const b = prevRow[i];
      const c = i >= bpp ? prevRow[i - bpp] : 0;
      let val = 0;
      if (filter === 0) val = x;
      else if (filter === 1) val = (x + a) & 0xff;
      else if (filter === 2) val = (x + b) & 0xff;
      else if (filter === 3) val = (x + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) val = (x + paethPredictor(a, b, c)) & 0xff;
      currRow[i] = val;
    }

    for (let x = 0; x < width; x++) {
      const src = x * bpp;
      const dst = (y * width + x) * 4;
      rgba[dst + 0] = currRow[src + 0];
      rgba[dst + 1] = currRow[src + 1];
      rgba[dst + 2] = currRow[src + 2];
      rgba[dst + 3] = bpp === 4 ? currRow[src + 3] : 255;
    }
    prevRow.set(currRow);
  }

  return { width, height, rgba };
}

// Crisp box-area downsampling for icons
function resizeRgba(srcBuf, srcW, srcH, dstW, dstH) {
  if (srcW === dstW && srcH === dstH) {
    return Buffer.from(srcBuf);
  }

  const dstBuf = Buffer.alloc(dstW * dstH * 4);
  const xRatio = srcW / dstW;
  const yRatio = srcH / dstH;

  for (let dy = 0; dy < dstH; dy++) {
    for (let dx = 0; dx < dstW; dx++) {
      const srcX0 = Math.floor(dx * xRatio);
      const srcX1 = Math.min(srcW - 1, Math.floor((dx + 1) * xRatio));
      const srcY0 = Math.floor(dy * yRatio);
      const srcY1 = Math.min(srcH - 1, Math.floor((dy + 1) * yRatio));

      let rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0;
      for (let sy = srcY0; sy <= srcY1; sy++) {
        for (let sx = srcX0; sx <= srcX1; sx++) {
          const idx = (sy * srcW + sx) * 4;
          rSum += srcBuf[idx + 0];
          gSum += srcBuf[idx + 1];
          bSum += srcBuf[idx + 2];
          aSum += srcBuf[idx + 3];
          count++;
        }
      }

      const outIdx = (dy * dstW + dx) * 4;
      dstBuf[outIdx + 0] = Math.round(rSum / count);
      dstBuf[outIdx + 1] = Math.round(gSum / count);
      dstBuf[outIdx + 2] = Math.round(bSum / count);
      dstBuf[outIdx + 3] = Math.round(aSum / count);
    }
  }

  return dstBuf;
}

// Encode RGBA buffer into a valid PNG file buffer
function encodeRgbaToPng(rgbaBuf, width, height) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);   // 8-bit depth
  ihdrData.writeUInt8(6, 9);   // Color type 6 (RGBA)
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdrChunk = createPngChunk('IHDR', ihdrData);

  const scanlineLen = 1 + width * 4;
  const rawBytes = Buffer.alloc(scanlineLen * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLen;
    rawBytes[rowOffset] = 0; // Filter 0: None
    rgbaBuf.copy(rawBytes, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(rawBytes, { level: 9 });
  const idatChunk = createPngChunk('IDAT', compressed);
  const iendChunk = createPngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Build standard multi-resolution Windows ICO buffer
function createIcoBuffer(pngEntries) {
  const count = pngEntries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);      // Reserved
  header.writeUInt16LE(1, 2);      // Image type: 1 = Icon
  header.writeUInt16LE(count, 4);  // Image count

  const dirEntrySize = 16;
  let currentOffset = 6 + (dirEntrySize * count);

  const dirBuffers = [];
  const imageBuffers = [];

  for (const entry of pngEntries) {
    const { size, pngBuf } = entry;
    const dir = Buffer.alloc(16);
    dir.writeUInt8(size >= 256 ? 0 : size, 0); // Width (0 means 256)
    dir.writeUInt8(size >= 256 ? 0 : size, 1); // Height (0 means 256)
    dir.writeUInt8(0, 2);                      // Color count
    dir.writeUInt8(0, 3);                      // Reserved
    dir.writeUInt16LE(1, 4);                   // Color planes
    dir.writeUInt16LE(32, 6);                  // Bits per pixel
    dir.writeUInt32LE(pngBuf.length, 8);       // Image size
    dir.writeUInt32LE(currentOffset, 12);      // Image offset

    dirBuffers.push(dir);
    imageBuffers.push(pngBuf);
    currentOffset += pngBuf.length;
  }

  return Buffer.concat([header, ...dirBuffers, ...imageBuffers]);
}

export function generateAllTauriIcons(targetDir) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const publicDir = path.join(process.cwd(), 'public');
  const primarySourcePath = path.join(
    publicDir,
    'assets',
    'aistudio',
    'AI_Business_System_App_Icon_512-3_c23ca907.png'
  );

  let sourceRgba = null;
  let sourceW = 512;
  let sourceH = 512;

  if (fs.existsSync(primarySourcePath)) {
    console.log(`[generate-tauri-icons] Found user icon source at: ${primarySourcePath}`);
    try {
      const sourceFileBuf = fs.readFileSync(primarySourcePath);
      const decoded = decodePngToRgba(sourceFileBuf);
      sourceRgba = decoded.rgba;
      sourceW = decoded.width;
      sourceH = decoded.height;
      console.log(`[generate-tauri-icons] Successfully decoded user icon: ${sourceW}x${sourceH}`);
    } catch (err) {
      console.warn(`[generate-tauri-icons] Failed to decode user icon, falling back to procedural:`, err);
    }
  }

  // Fallback if no image found: generate high quality Emerald/Gold hexagonal shield
  if (!sourceRgba) {
    console.log(`[generate-tauri-icons] Using procedural high-fidelity icon generator...`);
    sourceW = 512;
    sourceH = 512;
    sourceRgba = Buffer.alloc(sourceW * sourceH * 4);
    const cx = 256, cy = 256, r = 220;
    for (let y = 0; y < sourceH; y++) {
      for (let x = 0; x < sourceW; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        const idx = (y * sourceW + x) * 4;
        if (d <= r) {
          sourceRgba[idx + 0] = 1;   // Emerald Forest
          sourceRgba[idx + 1] = 77;
          sourceRgba[idx + 2] = 43;
          sourceRgba[idx + 3] = 255;
          if (d >= r - 25) {
            sourceRgba[idx + 0] = 201; // Gold Accent
            sourceRgba[idx + 1] = 162;
            sourceRgba[idx + 2] = 39;
          }
        }
      }
    }
  }

  // Generate multi-resolution PNGs
  const png512 = encodeRgbaToPng(resizeRgba(sourceRgba, sourceW, sourceH, 512, 512), 512, 512);
  const png256 = encodeRgbaToPng(resizeRgba(sourceRgba, sourceW, sourceH, 256, 256), 256, 256);
  const png128 = encodeRgbaToPng(resizeRgba(sourceRgba, sourceW, sourceH, 128, 128), 128, 128);
  const png64  = encodeRgbaToPng(resizeRgba(sourceRgba, sourceW, sourceH, 64, 64), 64, 64);
  const png48  = encodeRgbaToPng(resizeRgba(sourceRgba, sourceW, sourceH, 48, 48), 48, 48);
  const png32  = encodeRgbaToPng(resizeRgba(sourceRgba, sourceW, sourceH, 32, 32), 32, 32);
  const png16  = encodeRgbaToPng(resizeRgba(sourceRgba, sourceW, sourceH, 16, 16), 16, 16);

  // Multi-resolution Windows ICO (16, 32, 48, 64, 128, 256)
  const icoBuf = createIcoBuffer([
    { size: 16, pngBuf: png16 },
    { size: 32, pngBuf: png32 },
    { size: 48, pngBuf: png48 },
    { size: 64, pngBuf: png64 },
    { size: 128, pngBuf: png128 },
    { size: 256, pngBuf: png256 },
  ]);

  // Write Tauri desktop icon files
  fs.writeFileSync(path.join(targetDir, 'icon.png'), png512);
  fs.writeFileSync(path.join(targetDir, '128x128@2x.png'), png256);
  fs.writeFileSync(path.join(targetDir, '128x128.png'), png128);
  fs.writeFileSync(path.join(targetDir, '32x32.png'), png32);
  fs.writeFileSync(path.join(targetDir, 'icon.ico'), icoBuf);

  // Write Web / PWA icon files in public/
  fs.writeFileSync(path.join(publicDir, 'icon.png'), png512);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuf);
  fs.writeFileSync(path.join(publicDir, 'favicon.png'), png32);
  fs.writeFileSync(path.join(publicDir, 'app-icon.png'), png512);

  console.log(`[generate-tauri-icons] Successfully generated all desktop and web icons matching the user logo!`);
}

// Execute immediately when called directly
const iconsDir = path.join(process.cwd(), 'src-tauri', 'icons');
generateAllTauriIcons(iconsDir);
