/**
 * Contrast Limited Adaptive Histogram Equalization (CLAHE) on RGBA canvas data.
 *
 * Classic Zuiderveld CLAHE: the image is split into a grid of tiles, each tile
 * gets a clipped-histogram equalization lookup table, and every pixel is mapped
 * by bilinear interpolation between the four nearest tile tables (avoids tile
 * seams).
 *
 * Works in place on ImageData from a 2D canvas. Pure-black pixels (value 0) are
 * treated as background: left unchanged and excluded from histograms, so the
 * empty area around a zoomed-out image does not turn grey.
 */
export type ClaheParams = {
  /** Contrast limit. 1 = no enhancement; typical 2–4. */
  clipLimit: number;
  /** Number of tiles along the longer image side (e.g. 8). */
  tiles: number;
};

export function applyClahe(imageData: ImageData, { clipLimit, tiles }: ClaheParams) {
  const { data, width: w, height: h } = imageData;
  if (!w || !h) {
    return;
  }

  // Tile grid proportional to aspect ratio.
  const tx = Math.max(1, Math.round(w >= h ? tiles : (tiles * w) / h));
  const ty = Math.max(1, Math.round(h >= w ? tiles : (tiles * h) / w));
  const tileW = w / tx;
  const tileH = h / ty;

  // Luminance (grayscale images have R=G=B, so this is exact for X-ray).
  const n = w * h;
  const lum = new Uint8Array(n);
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    lum[i] = (data[p] * 77 + data[p + 1] * 150 + data[p + 2] * 29) >> 8;
  }

  // 1. Per-tile clipped-histogram equalization lookup tables.
  const luts = new Uint8Array(tx * ty * 256);
  const hist = new Uint32Array(256);
  for (let ty_i = 0; ty_i < ty; ty_i++) {
    const y0 = Math.floor(ty_i * tileH);
    const y1 = Math.min(h, Math.floor((ty_i + 1) * tileH));
    for (let tx_i = 0; tx_i < tx; tx_i++) {
      const x0 = Math.floor(tx_i * tileW);
      const x1 = Math.min(w, Math.floor((tx_i + 1) * tileW));
      hist.fill(0);
      let count = 0;
      for (let y = y0; y < y1; y++) {
        let i = y * w + x0;
        for (let x = x0; x < x1; x++, i++) {
          const v = lum[i];
          if (v !== 0) {
            hist[v]++;
            count++;
          }
        }
      }

      const lut = luts.subarray((ty_i * tx + tx_i) * 256, (ty_i * tx + tx_i + 1) * 256);
      if (count === 0) {
        for (let v = 0; v < 256; v++) {
          lut[v] = v;
        }
        continue;
      }

      // Clip the histogram and redistribute the excess evenly.
      const limit = Math.max(1, Math.floor((clipLimit * count) / 255));
      let excess = 0;
      for (let v = 1; v < 256; v++) {
        if (hist[v] > limit) {
          excess += hist[v] - limit;
          hist[v] = limit;
        }
      }
      const add = Math.floor(excess / 255);
      let rest = excess - add * 255;
      for (let v = 1; v < 256; v++) {
        hist[v] += add;
      }
      for (let v = 1; rest > 0 && v < 256; v++) {
        if (hist[v] < limit) {
          hist[v]++;
          rest--;
        }
      }

      // Cumulative distribution -> lookup table (background 0 stays 0).
      let cdf = 0;
      lut[0] = 0;
      const scale = 254 / count;
      for (let v = 1; v < 256; v++) {
        cdf += hist[v];
        lut[v] = 1 + Math.min(254, Math.round(cdf * scale));
      }
    }
  }

  // 2. Map each pixel by bilinear interpolation between the 4 nearest tiles.
  const colA = new Int32Array(w);
  const colB = new Int32Array(w);
  const colW = new Float32Array(w);
  for (let x = 0; x < w; x++) {
    const g = (x + 0.5) / tileW - 0.5;
    const a = Math.max(0, Math.min(tx - 1, Math.floor(g)));
    colA[x] = a;
    colB[x] = Math.min(tx - 1, a + 1);
    colW[x] = Math.max(0, Math.min(1, g - a));
  }

  for (let y = 0; y < h; y++) {
    const g = (y + 0.5) / tileH - 0.5;
    const ra = Math.max(0, Math.min(ty - 1, Math.floor(g)));
    const rb = Math.min(ty - 1, ra + 1);
    const wy = Math.max(0, Math.min(1, g - ra));
    const rowA = ra * tx;
    const rowB = rb * tx;
    let i = y * w;
    let p = i * 4;
    for (let x = 0; x < w; x++, i++, p += 4) {
      const v = lum[i];
      if (v === 0) {
        continue;
      }
      const a = colA[x];
      const b = colB[x];
      const wx = colW[x];
      const top = luts[(rowA + a) * 256 + v] * (1 - wx) + luts[(rowA + b) * 256 + v] * wx;
      const bot = luts[(rowB + a) * 256 + v] * (1 - wx) + luts[(rowB + b) * 256 + v] * wx;
      const out = top * (1 - wy) + bot * wy;

      if (data[p] === data[p + 1] && data[p + 1] === data[p + 2]) {
        const o = out + 0.5;
        data[p] = data[p + 1] = data[p + 2] = o;
      } else {
        // Colour pixel: scale RGB by the luminance change.
        const f = out / v;
        data[p] = Math.min(255, data[p] * f);
        data[p + 1] = Math.min(255, data[p + 1] * f);
        data[p + 2] = Math.min(255, data[p + 2] * f);
      }
    }
  }
}
