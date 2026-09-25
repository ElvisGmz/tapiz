/**
 * Builds macOS dynamic wallpapers (.heic) fully in the browser:
 *  - each image is encoded as a single HEVC keyframe with WebCodecs,
 *  - images are muxed into a HEIF container by hand (ISOBMFF boxes),
 *  - Apple's `apple_desktop:*` XMP metadata tells macOS which image to show
 *    for light/dark appearance or for each time of day.
 */

/* ---------- Binary plist (bplist00) — only what Apple's metadata needs ---------- */

type PlistValue = number | { real: number } | string | PlistValue[] | { [k: string]: PlistValue };

export function encodeBinaryPlist(root: PlistValue): Uint8Array {
  const objects: Uint8Array[] = [];
  const add = (v: PlistValue): number => {
    const idx = objects.length;
    objects.push(new Uint8Array()); // reserve slot so the root is object 0
    objects[idx] = encodeObj(v);
    return idx;
  };
  const refSize = 2; // up to 65k objects – plenty
  const ref = (n: number) => [(n >> 8) & 255, n & 255];
  const lenMarker = (type: number, n: number) => (n < 15 ? [type | n] : [type | 15, ...intBytes(n)]);
  const intBytes = (n: number) => {
    if (n >= 0 && n < 256) return [0x10, n];
    if (n >= 0 && n < 65536) return [0x11, n >> 8, n & 255];
    const b = new DataView(new ArrayBuffer(8));
    b.setBigInt64(0, BigInt(n));
    return [0x13, ...new Uint8Array(b.buffer)];
  };
  function encodeObj(v: PlistValue): Uint8Array {
    if (typeof v === "number") return new Uint8Array(intBytes(v));
    if (typeof v === "string") return new Uint8Array([...lenMarker(0x50, v.length), ...[...v].map((c) => c.charCodeAt(0) & 127)]);
    if (Array.isArray(v)) {
      const refs = v.map(add);
      return new Uint8Array([...lenMarker(0xa0, v.length), ...refs.flatMap(ref)]);
    }
    if ("real" in v && typeof v.real === "number" && Object.keys(v).length === 1) {
      const b = new DataView(new ArrayBuffer(9));
      b.setUint8(0, 0x23);
      b.setFloat64(1, v.real);
      return new Uint8Array(b.buffer);
    }
    const entries = Object.entries(v as Record<string, PlistValue>);
    const keys = entries.map(([k]) => add(k));
    const vals = entries.map(([, x]) => add(x));
    return new Uint8Array([...lenMarker(0xd0, entries.length), ...keys.flatMap(ref), ...vals.flatMap(ref)]);
  }
  add(root);

  const header = new TextEncoder().encode("bplist00");
  const offsets: number[] = [];
  let pos = header.length;
  for (const o of objects) {
    offsets.push(pos);
    pos += o.length;
  }
  const offsetSize = pos < 256 ? 1 : pos < 65536 ? 2 : 4;
  const tableStart = pos;
  const out = new Uint8Array(pos + offsets.length * offsetSize + 32);
  out.set(header, 0);
  let p = header.length;
  for (const o of objects) {
    out.set(o, p);
    p += o.length;
  }
  for (const off of offsets) {
    for (let i = offsetSize - 1; i >= 0; i--) out[p++] = (off >> (8 * i)) & 255;
  }
  const dv = new DataView(out.buffer);
  const t = p;
  dv.setUint8(t + 6, offsetSize);
  dv.setUint8(t + 7, refSize);
  dv.setBigUint64(t + 8, BigInt(objects.length));
  dv.setBigUint64(t + 16, BigInt(0));
  dv.setBigUint64(t + 24, BigInt(tableStart));
  return out;
}

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

export type DynamicMetadata =
  | { kind: "appearance"; light: number; dark: number }
  | { kind: "time"; light: number; dark: number; times: { index: number; hour: number }[] };

export function buildXmp(meta: DynamicMetadata) {
  let tag: string;
  let value: string;
  if (meta.kind === "appearance") {
    tag = "apr";
    value = b64(encodeBinaryPlist({ l: meta.light, d: meta.dark }));
  } else {
    tag = "h24";
    value = b64(
      encodeBinaryPlist({
        ap: { l: meta.light, d: meta.dark },
        ti: meta.times.map((t) => ({ i: t.index, t: { real: (((t.hour % 24) + 24) % 24) / 24 } })),
      }),
    );
  }
  return (
    `<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="XMP Core 6.0.0">` +
    `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">` +
    `<rdf:Description rdf:about="" xmlns:apple_desktop="http://ns.apple.com/namespace/1.0/">` +
    `<apple_desktop:${tag}>${value}</apple_desktop:${tag}>` +
    `</rdf:Description></rdf:RDF></x:xmpmeta>`
  );
}

/* ---------- HEVC encoding via WebCodecs ---------- */

export interface HevcImage {
  width: number;
  height: number;
  hvcC: Uint8Array; // HEVCDecoderConfigurationRecord
  data: Uint8Array; // length-prefixed NAL units
}

const codecFor = (w: number, h: number) => (w * h <= 8_912_896 && Math.max(w, h) <= 8444 ? "hvc1.1.6.L153.B0" : "hvc1.1.6.L186.B0");

export async function canEncodeHeic(width = 3840, height = 2160) {
  if (typeof VideoEncoder === "undefined") return false;
  try {
    const r = await VideoEncoder.isConfigSupported({ codec: codecFor(width, height), width, height, bitrate: 40e6, framerate: 1 });
    return !!r.supported;
  } catch {
    return false;
  }
}

export async function encodeHevcImage(source: CanvasImageSource & { width: number; height: number }, width: number, height: number): Promise<HevcImage> {
  let hvcC: Uint8Array | null = null;
  const parts: Uint8Array[] = [];
  let failure: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      const desc = meta?.decoderConfig?.description;
      if (desc) hvcC = desc instanceof ArrayBuffer ? new Uint8Array(desc.slice(0)) : new Uint8Array((desc as ArrayBufferView).buffer.slice(0));
      const buf = new Uint8Array(chunk.byteLength);
      chunk.copyTo(buf);
      parts.push(buf);
    },
    error: (e) => (failure = e as Error),
  });
  // One intra frame with a generous bit budget ≈ visually lossless.
  const bitrate = Math.min(300e6, Math.max(12e6, width * height * 4));
  encoder.configure({
    codec: codecFor(width, height),
    width,
    height,
    bitrate,
    framerate: 1,
    latencyMode: "quality",
    // @ts-expect-error — `hevc` config is not in every TS lib version yet
    hevc: { format: "hevc" },
  });
  const frame = new VideoFrame(source, { timestamp: 0 });
  encoder.encode(frame, { keyFrame: true });
  frame.close();
  await encoder.flush();
  encoder.close();
  if (failure) throw failure;
  if (!hvcC || !parts.length) throw new Error("El codificador HEVC no devolvió datos");
  const size = parts.reduce((n, p) => n + p.length, 0);
  const data = new Uint8Array(size);
  let o = 0;
  for (const p of parts) {
    data.set(p, o);
    o += p.length;
  }
  return { width, height, hvcC, data };
}

/* ---------- HEIF container ---------- */

class W {
  private chunks: number[] = [];
  u8(v: number) {
    this.chunks.push(v & 255);
    return this;
  }
  u16(v: number) {
    return this.u8(v >> 8).u8(v);
  }
  u32(v: number) {
    return this.u16(v >>> 16).u16(v & 0xffff);
  }
  str(s: string) {
    for (const c of new TextEncoder().encode(s)) this.u8(c);
    return this;
  }
  cstr(s: string) {
    return this.str(s).u8(0);
  }
  bytes(b: Uint8Array | number[]) {
    for (const x of b) this.chunks.push(x);
    return this;
  }
  get length() {
    return this.chunks.length;
  }
  out() {
    return new Uint8Array(this.chunks);
  }
}

function box(type: string, body: Uint8Array | number[]) {
  return new W().u32(8 + body.length).str(type).bytes(body).out();
}
function fullBox(type: string, version: number, flags: number, body: Uint8Array | number[]) {
  return box(type, new W().u8(version).u8(flags >> 16).u8(flags >> 8).u8(flags).bytes(body).out());
}
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};

export function muxHeic(images: HevcImage[], xmp?: string): Uint8Array {
  const xmpBytes = xmp ? new TextEncoder().encode(xmp) : null;
  const imageIds = images.map((_, i) => i + 1);
  const xmpId = images.length + 1;

  const ftyp = box("ftyp", new W().str("heic").u32(0).str("mif1").str("heic").out());
  const hdlr = fullBox("hdlr", 0, 0, new W().u32(0).str("pict").u32(0).u32(0).u32(0).cstr("").out());
  const pitm = fullBox("pitm", 0, 0, new W().u16(1).out());

  const infes = images.map((_, i) => fullBox("infe", 2, 0, new W().u16(imageIds[i]).u16(0).str("hvc1").cstr("").out()));
  if (xmpBytes) infes.push(fullBox("infe", 2, 0, new W().u16(xmpId).u16(0).str("mime").cstr("XMP").cstr("application/rdf+xml").out()));
  const iinf = fullBox("iinf", 0, 0, concat(new W().u16(infes.length).out(), ...infes));

  const iref = xmpBytes ? fullBox("iref", 0, 0, box("cdsc", new W().u16(xmpId).u16(1).u16(1).out())) : new Uint8Array();

  // Properties: per image hvcC + ispe, plus one shared sRGB-ish colour box.
  const props: Uint8Array[] = [];
  const colr = box("colr", new W().str("nclx").u16(1).u16(13).u16(1).u8(0).out());
  props.push(colr);
  const colrIndex = 1;
  const assoc: number[][] = [];
  for (const img of images) {
    props.push(box("hvcC", img.hvcC));
    const hvcIndex = props.length;
    props.push(fullBox("ispe", 0, 0, new W().u32(img.width).u32(img.height).out()));
    const ispeIndex = props.length;
    assoc.push([0x80 | hvcIndex, ispeIndex, colrIndex]);
  }
  const ipco = box("ipco", concat(...props));
  const ipmaBody = new W().u32(images.length);
  images.forEach((_, i) => {
    ipmaBody.u16(imageIds[i]).u8(assoc[i].length);
    assoc[i].forEach((a) => ipmaBody.u8(a));
  });
  const iprp = box("iprp", concat(ipco, fullBox("ipma", 0, 0, ipmaBody.out())));

  const payloads = [...images.map((i) => i.data), ...(xmpBytes ? [xmpBytes] : [])];
  const ids = [...imageIds, ...(xmpBytes ? [xmpId] : [])];
  // iloc v0: offset_size=4, length_size=4, base_offset_size=0 → fixed size, so offsets can be patched after layout.
  const buildIloc = (mdatDataStart: number) => {
    const w = new W().u8(0x44).u8(0x00).u16(ids.length);
    let off = mdatDataStart;
    payloads.forEach((p, i) => {
      w.u16(ids[i]).u16(0).u16(1).u32(off).u32(p.length);
      off += p.length;
    });
    return fullBox("iloc", 0, 0, w.out());
  };

  const metaFor = (iloc: Uint8Array) => fullBox("meta", 0, 0, concat(hdlr, pitm, iloc, iinf, iref, iprp));
  const metaSize = metaFor(buildIloc(0)).length;
  const mdatDataStart = ftyp.length + metaSize + 8;
  const meta = metaFor(buildIloc(mdatDataStart));

  const dataLen = payloads.reduce((n, p) => n + p.length, 0);
  const mdatHeader = new W().u32(8 + dataLen).str("mdat").out();
  return concat(ftyp, meta, mdatHeader, ...payloads);
}
