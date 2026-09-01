/** Vygeneruje PWA ikony do public/. Spouštěj po změně značky. */
import { writeFileSync } from "node:fs";
import zlib from "node:zlib";

function png(size: number): Buffer {
  const bg = [26, 29, 36];
  const fg = [122, 162, 247];
  const px = Buffer.alloc(size * size * 3);
  const c = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Stylizovaná činka: středová osa a dvě závaží.
      const bar = Math.abs(y - c) < size * 0.07 && Math.abs(x - c) < size * 0.30;
      const plate =
        Math.abs(y - c) < size * 0.18 &&
        (Math.abs(x - (c - size * 0.26)) < size * 0.06 ||
          Math.abs(x - (c + size * 0.26)) < size * 0.06);
      const color = bar || plate ? fg : bg;
      const i = (y * size + x) * 3;
      px[i] = color[0]; px[i + 1] = color[1]; px[i + 2] = color[2];
    }
  }
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    px.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

let table: number[] | null = null;
function crc32(buf: Buffer): number {
  if (!table) {
    table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return crc ^ 0xffffffff;
}

writeFileSync("public/icon-192.png", png(192));
writeFileSync("public/icon-512.png", png(512));
writeFileSync("public/apple-icon.png", png(180));
console.log("Ikony vygenerovány do public/");
