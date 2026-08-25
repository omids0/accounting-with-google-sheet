import fs from 'fs';
import zlib from 'zlib';

const PRIMARY = { r: 15, g: 118, b: 110 };
const WHITE = { r: 255, g: 255, b: 255 };

function crc32(data) {
  let c = 0xffffffff;
  const table = [];
  for (let n = 0; n < 256; n++) {
    let cv = n;
    for (let k = 0; k < 8; k++) cv = cv & 1 ? 0xedb88320 ^ (cv >>> 1) : cv >>> 1;
    table[n] = cv;
  }
  for (let i = 0; i < data.length; i++) c = table[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function createPNG(size, pixelFn) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const i = y * (size * 4 + 1) + 1 + x * 4;
      const { r, g, b, a = 255 } = pixelFn(x, y, size);
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }
  const compressed = zlib.deflateSync(raw);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function inRoundedRect(x, y, size, rx) {
  const margin = 0;
  const w = size - margin * 2;
  const h = size - margin * 2;
  const left = margin;
  const top = margin;
  const right = left + w;
  const bottom = top + h;
  if (x < left || x >= right || y < top || y >= bottom) return false;
  const r = rx;
  if (x < left + r && y < top + r) {
    const dx = x - (left + r);
    const dy = y - (top + r);
    return dx * dx + dy * dy <= r * r;
  }
  if (x >= right - r && y < top + r) {
    const dx = x - (right - r);
    const dy = y - (top + r);
    return dx * dx + dy * dy <= r * r;
  }
  if (x < left + r && y >= bottom - r) {
    const dx = x - (left + r);
    const dy = y - (bottom - r);
    return dx * dx + dy * dy <= r * r;
  }
  if (x >= right - r && y >= bottom - r) {
    const dx = x - (right - r);
    const dy = y - (bottom - r);
    return dx * dx + dy * dy <= r * r;
  }
  return true;
}

function inRect(x, y, rx, ry, rw, rh, cornerR = 0) {
  if (cornerR > 0) {
    const cx = rx + cornerR;
    const cy = ry + cornerR;
    const cx2 = rx + rw - cornerR;
    const cy2 = ry + rh - cornerR;
    if (x >= rx && x < rx + rw && y >= ry && y < ry + rh) {
      if (x < cx && y < cy) {
        const dx = x - cx;
        const dy = y - cy;
        return dx * dx + dy * dy <= cornerR * cornerR;
      }
      if (x >= cx2 && y < cy) {
        const dx = x - cx2;
        const dy = y - cy;
        return dx * dx + dy * dy <= cornerR * cornerR;
      }
      if (x < cx && y >= cy2) {
        const dx = x - cx;
        const dy = y - cy2;
        return dx * dx + dy * dy <= cornerR * cornerR;
      }
      if (x >= cx2 && y >= cy2) {
        const dx = x - cx2;
        const dy = y - cy2;
        return dx * dx + dy * dy <= cornerR * cornerR;
      }
      return true;
    }
    return false;
  }
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function drawChartIcon(x, y, size, scale, offsetX, offsetY) {
  const s = size * scale;
  const ox = offsetX ?? (size - s) / 2;
  const oy = offsetY ?? (size - s) / 2;

  const mapX = (v) => ox + (v / 100) * s;
  const mapY = (v) => oy + (v / 100) * s;

  const stroke = s * 0.035;
  const axisX1 = mapX(22);
  const axisY1 = mapY(28);
  const axisX2 = mapX(22);
  const axisY2 = mapY(72);
  const axisX3 = mapX(78);
  const axisY3 = mapY(72);

  if (distToSegment(x, y, axisX1, axisY1, axisX2, axisY2) <= stroke) return WHITE;
  if (distToSegment(x, y, axisX2, axisY2, axisX3, axisY3) <= stroke) return WHITE;

  const barR = s * 0.02;
  const bars = [
    { x: 30, y: 48, w: 8, h: 24 },
    { x: 42, y: 36, w: 8, h: 36 },
    { x: 54, y: 52, w: 8, h: 20 },
  ];
  for (const bar of bars) {
    if (
      inRect(
        x,
        y,
        mapX(bar.x),
        mapY(bar.y),
        (bar.w / 100) * s,
        (bar.h / 100) * s,
        barR
      )
    ) {
      return WHITE;
    }
  }
  return null;
}

function createAppIcon(size, { maskable = false } = {}) {
  const cornerRadius = maskable ? 0 : size * 0.22;
  const iconScale = maskable ? 0.62 : 0.72;

  return createPNG(size, (x, y) => {
    const bg = maskable || inRoundedRect(x, y, size, cornerRadius) ? PRIMARY : WHITE;
    const icon = drawChartIcon(x, y, size, iconScale);
    if (icon) return icon;
    return bg;
  });
}

fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/pwa-192x192.png', createAppIcon(192));
fs.writeFileSync('public/pwa-512x512.png', createAppIcon(512));
fs.writeFileSync('public/pwa-maskable-512x512.png', createAppIcon(512, { maskable: true }));
fs.writeFileSync('public/apple-touch-icon.png', createAppIcon(180));
console.log('Icons created');
