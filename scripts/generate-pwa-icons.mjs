import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const outputs = [
  { size: 180, file: "public/icons/apple-touch-icon.png", maskable: false },
  { size: 192, file: "public/icons/icon-192.png", maskable: false },
  { size: 512, file: "public/icons/icon-512.png", maskable: false },
  { size: 192, file: "public/icons/maskable-192.png", maskable: true },
  { size: 512, file: "public/icons/maskable-512.png", maskable: true }
];

const colors = {
  burnt: [240, 112, 90, 255],
  burntDark: [201, 74, 54, 255],
  sage: [172, 225, 175, 255],
  ink: [29, 29, 31, 255],
  paper: [255, 255, 255, 255],
  vellum: [251, 247, 242, 255]
};

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([length, typeBytes, data, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function setPixel(buffer, width, x, y, color) {
  if (x < 0 || y < 0 || x >= width || y >= width) return;
  const index = (Math.floor(y) * width + Math.floor(x)) * 4;
  buffer[index] = color[0];
  buffer[index + 1] = color[1];
  buffer[index + 2] = color[2];
  buffer[index + 3] = color[3];
}

function fillRect(buffer, width, x, y, rectWidth, rectHeight, color) {
  for (let yy = Math.floor(y); yy < Math.ceil(y + rectHeight); yy += 1) {
    for (let xx = Math.floor(x); xx < Math.ceil(x + rectWidth); xx += 1) {
      setPixel(buffer, width, xx, yy, color);
    }
  }
}

function fillRoundedRect(buffer, width, x, y, rectWidth, rectHeight, radius, color) {
  const right = x + rectWidth;
  const bottom = y + rectHeight;
  for (let yy = Math.floor(y); yy < Math.ceil(bottom); yy += 1) {
    for (let xx = Math.floor(x); xx < Math.ceil(right); xx += 1) {
      const dx = xx < x + radius ? x + radius - xx : xx > right - radius ? xx - (right - radius) : 0;
      const dy = yy < y + radius ? y + radius - yy : yy > bottom - radius ? yy - (bottom - radius) : 0;
      if (dx * dx + dy * dy <= radius * radius) setPixel(buffer, width, xx, yy, color);
    }
  }
}

function drawIcon(size, maskable) {
  const rgba = Buffer.alloc(size * size * 4);
  fillRect(rgba, size, 0, 0, size, size, maskable ? colors.sage : colors.vellum);

  const outerPad = maskable ? size * 0.12 : size * 0.07;
  const outer = size - outerPad * 2;
  fillRoundedRect(rgba, size, outerPad, outerPad, outer, outer, size * 0.2, colors.burnt);

  const panelPad = size * 0.19;
  const panel = size - panelPad * 2;
  fillRoundedRect(rgba, size, panelPad, panelPad, panel, panel, size * 0.11, colors.ink);

  const cardX = size * 0.27;
  const cardY = size * 0.31;
  const cardW = size * 0.46;
  const cardH = size * 0.38;
  fillRoundedRect(rgba, size, cardX, cardY, cardW, cardH, size * 0.035, colors.paper);
  fillRect(rgba, size, cardX, cardY, cardW, cardH * 0.24, colors.sage);

  const lineY = cardY + cardH * 0.43;
  fillRoundedRect(rgba, size, cardX + cardW * 0.18, lineY, cardW * 0.64, size * 0.045, size * 0.02, colors.ink);
  fillRoundedRect(rgba, size, cardX + cardW * 0.18, cardY + cardH * 0.62, cardW * 0.24, cardH * 0.18, size * 0.015, colors.burntDark);
  fillRoundedRect(rgba, size, cardX + cardW * 0.58, cardY + cardH * 0.62, cardW * 0.24, cardH * 0.18, size * 0.015, colors.burntDark);

  return rgba;
}

for (const output of outputs) {
  const rgba = drawIcon(output.size, output.maskable);
  writeFileSync(output.file, encodePng(output.size, output.size, rgba));
  console.log(`Wrote ${output.file}`);
}
