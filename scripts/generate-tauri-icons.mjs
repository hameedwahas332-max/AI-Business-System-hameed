import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Standard IEEE 802.3 CRC-32 table for PNG chunks
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

function generatePngBuffer(width, height) {
  // 1. Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // 2. IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);   // Bit depth: 8 bits per channel
  ihdrData.writeUInt8(6, 9);   // Color type: 6 (RGBA)
  ihdrData.writeUInt8(0, 10);  // Compression method: 0
  ihdrData.writeUInt8(0, 11);  // Filter method: 0
  ihdrData.writeUInt8(0, 12);  // Interlace: 0
  const ihdrChunk = createPngChunk('IHDR', ihdrData);

  // 3. Raw Scanlines (Filter 0 + RGBA pixels)
  // Palette: Emerald (#0F766E), Forest (#064E3B), Gold (#C9A227), White (#FFFFFF)
  const scanlineLength = 1 + width * 4;
  const rawBytes = Buffer.alloc(scanlineLength * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.44;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawBytes[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // Rounded badge background: Emerald (#0F766E -> 15, 118, 110)
        let r = 15;
        let g = 118;
        let b = 110;
        let a = 255;

        // Gold border ring (#C9A227 -> 201, 162, 39)
        if (dist >= radius - (width * 0.08)) {
          r = 201;
          g = 162;
          b = 39;
        } else if (Math.abs(dx) < width * 0.22 && Math.abs(dy) < height * 0.22) {
          // Center Gold/White Emblem
          r = 255;
          g = 255;
          b = 255;
        }

        rawBytes[pxOffset + 0] = r;
        rawBytes[pxOffset + 1] = g;
        rawBytes[pxOffset + 2] = b;
        rawBytes[pxOffset + 3] = a;
      } else {
        // Transparent outside
        rawBytes[pxOffset + 0] = 0;
        rawBytes[pxOffset + 1] = 0;
        rawBytes[pxOffset + 2] = 0;
        rawBytes[pxOffset + 3] = 0;
      }
    }
  }

  // 4. Deflate IDAT Chunk
  const compressed = zlib.deflateSync(rawBytes, { level: 9 });
  const idatChunk = createPngChunk('IDAT', compressed);

  // 5. IEND Chunk
  const iendChunk = createPngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function generateIcoBuffer(png32Buffer, png128Buffer) {
  // ICONDIR header (6 bytes)
  // - 2 bytes reserved (0)
  // - 2 bytes image type (1 for icon)
  // - 2 bytes image count (2 images: 32x32 and 128x128)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(2, 4);

  const dirEntrySize = 16;
  const dataOffset1 = 6 + (dirEntrySize * 2);
  const dataOffset2 = dataOffset1 + png32Buffer.length;

  // ICONDIRENTRY 1 (32x32)
  const entry1 = Buffer.alloc(16);
  entry1.writeUInt8(32, 0);  // width
  entry1.writeUInt8(32, 1);  // height
  entry1.writeUInt8(0, 2);   // color count (0 for 256+)
  entry1.writeUInt8(0, 3);   // reserved
  entry1.writeUInt16LE(1, 4); // color planes
  entry1.writeUInt16LE(32, 6); // bits per pixel
  entry1.writeUInt32LE(png32Buffer.length, 8); // size in bytes
  entry1.writeUInt32LE(dataOffset1, 12); // offset

  // ICONDIRENTRY 2 (128x128)
  const entry2 = Buffer.alloc(16);
  entry2.writeUInt8(128, 0); // width (0 is 256, 128 is 128)
  entry2.writeUInt8(128, 1); // height
  entry2.writeUInt8(0, 2);   // color count
  entry2.writeUInt8(0, 3);   // reserved
  entry2.writeUInt16LE(1, 4); // color planes
  entry2.writeUInt16LE(32, 6); // bits per pixel
  entry2.writeUInt32LE(png128Buffer.length, 8); // size in bytes
  entry2.writeUInt32LE(dataOffset2, 12); // offset

  return Buffer.concat([header, entry1, entry2, png32Buffer, png128Buffer]);
}

export function generateAllTauriIcons(targetDir) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  console.log(`[generate-tauri-icons] Generating icons in: ${targetDir}`);

  const png32 = generatePngBuffer(32, 32);
  const png128 = generatePngBuffer(128, 128);
  const png256 = generatePngBuffer(256, 256);
  const png512 = generatePngBuffer(512, 512);

  const ico = generateIcoBuffer(png32, png128);

  fs.writeFileSync(path.join(targetDir, '32x32.png'), png32);
  fs.writeFileSync(path.join(targetDir, '128x128.png'), png128);
  fs.writeFileSync(path.join(targetDir, '128x128@2x.png'), png256);
  fs.writeFileSync(path.join(targetDir, 'icon.png'), png512);
  fs.writeFileSync(path.join(targetDir, 'icon.ico'), ico);

  console.log(`[generate-tauri-icons] Successfully generated 32x32.png, 128x128.png, icon.png, and icon.ico!`);
}

// Execute when run as script
const iconsDir = path.join(process.cwd(), 'src-tauri', 'icons');
generateAllTauriIcons(iconsDir);
