function hash(x: number, y: number, seed: number) {
  let h = (x * 374761393 + y * 668265263 + seed * 144269504) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

export function valueNoise(x: number, y: number, seed: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = smooth(x - xi);
  const yf = smooth(y - yi);
  const a = hash(xi, yi, seed);
  const b = hash(xi + 1, yi, seed);
  const c = hash(xi, yi + 1, seed);
  const d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}

export function fbm(x: number, y: number, seed: number, octaves = 4) {
  let v = 0;
  let amp = 0.5;
  let f = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    v += valueNoise(x * f, y * f, seed + i * 17) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return v / norm;
}

function hash4(x: number, y: number, z: number, w: number, seed: number) {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177 + w * 2246822519 + seed * 144269504) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = Math.imul(h ^ (h >>> 16), 668265263);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

/** 4D value noise. Walking (z, w) around a circle gives a field that morphs and loops back to the start. */
export function valueNoise4(x: number, y: number, z: number, w: number, seed: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), wi = Math.floor(w);
  const fx = smooth(x - xi), fy = smooth(y - yi), fz = smooth(z - zi), fw = smooth(w - wi);
  // Inlined 16-corner quadrilinear blend (hot path while animating).
  let acc = 0;
  for (let dw = 0; dw < 2; dw++) {
    let accZ = 0;
    for (let dz = 0; dz < 2; dz++) {
      const z1 = zi + dz, w1 = wi + dw;
      const a = hash4(xi, yi, z1, w1, seed), b = hash4(xi + 1, yi, z1, w1, seed);
      const c = hash4(xi, yi + 1, z1, w1, seed), d = hash4(xi + 1, yi + 1, z1, w1, seed);
      const top = a + (b - a) * fx;
      const v = top + (c + (d - c) * fx - top) * fy;
      accZ = dz ? accZ + (v - accZ) * fz : v;
    }
    acc = dw ? acc + (accZ - acc) * fw : accZ;
  }
  return acc;
}

export function fbm4(x: number, y: number, z: number, w: number, seed: number, octaves = 3) {
  let v = 0;
  let amp = 0.5;
  let f = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    v += valueNoise4(x * f, y * f, z * f, w * f, seed + i * 17) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  // More dimensions average out more; stretch back so contours keep their range.
  return 0.5 + (v / norm - 0.5) * 1.35;
}
