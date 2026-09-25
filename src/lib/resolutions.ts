export const DEVICE_GROUPS = ["Mac", "Monitor", "iPhone", "Android", "Tablet", "Redes y otros"] as const;
export type DeviceGroup = (typeof DEVICE_GROUPS)[number];

export interface Resolution {
  id: string;
  label: string;
  group: DeviceGroup;
  width: number;
  height: number;
}

export const RESOLUTIONS: Resolution[] = [
  { id: "mba13", label: 'MacBook Air 13"', group: "Mac", width: 2560, height: 1664 },
  { id: "mba15", label: 'MacBook Air 15"', group: "Mac", width: 2880, height: 1864 },
  { id: "mbp14", label: 'MacBook Pro 14"', group: "Mac", width: 3024, height: 1964 },
  { id: "mbp16", label: 'MacBook Pro 16"', group: "Mac", width: 3456, height: 2234 },
  { id: "imac24", label: 'iMac 24"', group: "Mac", width: 4480, height: 2520 },
  { id: "5k", label: "Studio Display 5K", group: "Mac", width: 5120, height: 2880 },
  { id: "6k", label: "Pro Display XDR 6K", group: "Mac", width: 6016, height: 3384 },

  { id: "fhd", label: "Full HD", group: "Monitor", width: 1920, height: 1080 },
  { id: "qhd", label: "QHD 2K", group: "Monitor", width: 2560, height: 1440 },
  { id: "4k", label: "4K UHD", group: "Monitor", width: 3840, height: 2160 },
  { id: "8k", label: "8K UHD", group: "Monitor", width: 7680, height: 4320 },
  { id: "wqhd-uw", label: "Ultrawide 21:9 (1440p)", group: "Monitor", width: 3440, height: 1440 },
  { id: "5k2k", label: "Ultrawide 5K2K", group: "Monitor", width: 5120, height: 2160 },
  { id: "suw", label: "Super ultrawide 32:9", group: "Monitor", width: 5120, height: 1440 },
  { id: "dual4k", label: "Doble 4K (panorámico)", group: "Monitor", width: 7680, height: 2160 },

  { id: "iphone-se", label: "iPhone SE", group: "iPhone", width: 750, height: 1334 },
  { id: "iphone", label: "iPhone 15 / 16", group: "iPhone", width: 1179, height: 2556 },
  { id: "iphone-plus", label: "iPhone 15 / 16 Plus", group: "iPhone", width: 1290, height: 2796 },
  { id: "iphone-pro", label: "iPhone 16 Pro / 17", group: "iPhone", width: 1206, height: 2622 },
  { id: "iphone-air", label: "iPhone Air", group: "iPhone", width: 1260, height: 2736 },
  { id: "iphone-max", label: "iPhone 16 / 17 Pro Max", group: "iPhone", width: 1320, height: 2868 },

  { id: "pixel9", label: "Pixel 9", group: "Android", width: 1080, height: 2424 },
  { id: "pixel9pro", label: "Pixel 9 Pro", group: "Android", width: 1280, height: 2856 },
  { id: "s24u", label: "Galaxy S24 Ultra", group: "Android", width: 1440, height: 3120 },
  { id: "android-fhd", label: "Android FHD+ (genérico)", group: "Android", width: 1080, height: 2400 },
  { id: "android-qhd", label: "Android QHD+ (genérico)", group: "Android", width: 1440, height: 3200 },

  { id: "ipad-pro13", label: 'iPad Pro 13"', group: "Tablet", width: 2064, height: 2752 },
  { id: "ipad-pro11", label: 'iPad Pro 11"', group: "Tablet", width: 1668, height: 2420 },
  { id: "ipad-air", label: 'iPad Air 11"', group: "Tablet", width: 1640, height: 2360 },
  { id: "ipad-mini", label: "iPad mini", group: "Tablet", width: 1488, height: 2266 },
  { id: "tab-s9", label: "Galaxy Tab S9", group: "Tablet", width: 1600, height: 2560 },

  { id: "square", label: "Cuadrado", group: "Redes y otros", width: 2048, height: 2048 },
  { id: "ig-post", label: "Instagram post 4:5", group: "Redes y otros", width: 1080, height: 1350 },
  { id: "story", label: "Story / Reel 9:16", group: "Redes y otros", width: 1080, height: 1920 },
  { id: "x-header", label: "Header de X", group: "Redes y otros", width: 1500, height: 500 },
  { id: "yt-banner", label: "Banner de YouTube", group: "Redes y otros", width: 2560, height: 1440 },
  { id: "li-banner", label: "Banner de LinkedIn", group: "Redes y otros", width: 1584, height: 396 },
  { id: "steamdeck", label: "Steam Deck", group: "Redes y otros", width: 1280, height: 800 },
  { id: "watch-ultra", label: "Apple Watch Ultra", group: "Redes y otros", width: 410, height: 502 },
];

export function findResolution(w: number, h: number) {
  return RESOLUTIONS.find((r) => r.width === w && r.height === h);
}

export const ASPECT_RATIOS: { label: string; w: number; h: number; hint: string }[] = [
  { label: "16:9", w: 16, h: 9, hint: "Monitores, TV" },
  { label: "16:10", w: 16, h: 10, hint: "MacBook, laptops" },
  { label: "3:2", w: 3, h: 2, hint: "Surface, Framework" },
  { label: "4:3", w: 4, h: 3, hint: "iPad horizontal" },
  { label: "21:9", w: 21, h: 9, hint: "Ultrawide" },
  { label: "32:9", w: 32, h: 9, hint: "Super ultrawide" },
  { label: "1:1", w: 1, h: 1, hint: "Cuadrado" },
  { label: "5:4", w: 5, h: 4, hint: "Monitores clásicos" },
  { label: "19.5:9", w: 19.5, h: 9, hint: "iPhone moderno" },
  { label: "20:9", w: 20, h: 9, hint: "Android moderno" },
];

export const LONG_SIDES = [
  { label: "HD", px: 1920 },
  { label: "2K", px: 2560 },
  { label: "4K", px: 3840 },
  { label: "5K", px: 5120 },
  { label: "8K", px: 7680 },
];

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

export function sizeFromRatio(rw: number, rh: number, longSide: number, portrait: boolean) {
  const [a, b] = rw >= rh ? [longSide, even((longSide * rh) / rw)] : [even((longSide * rw) / rh), longSide];
  return portrait ? { width: Math.min(a, b), height: Math.max(a, b) } : { width: Math.max(a, b), height: Math.min(a, b) };
}

export function ratioLabel(w: number, h: number) {
  const r = Math.max(w, h) / Math.min(w, h);
  const match = ASPECT_RATIOS.map((a) => ({ a, d: Math.abs(a.w / a.h - r) }))
    .filter((x) => x.d < 0.03)
    .sort((x, y) => x.d - y.d)[0]?.a;
  if (!match) return w >= h ? `${r.toFixed(2)}:1` : `1:${r.toFixed(2)}`;
  const [x, y] = match.label.split(":");
  return w >= h ? match.label : `${y}:${x}`;
}

/** Safari refuses canvases larger than ~16.7 MP. */
export const SAFARI_MAX_PIXELS = 16_777_216;
