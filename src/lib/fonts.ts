import {
  Bebas_Neue,
  Caveat,
  DM_Serif_Display,
  Inter,
  JetBrains_Mono,
  Pacifico,
  Playfair_Display,
  Righteous,
  Space_Grotesk,
} from "next/font/google";
import type { FontKey } from "./types";

const inter = Inter({ subsets: ["latin"] });
const grotesk = Space_Grotesk({ subsets: ["latin"] });
const playfair = Playfair_Display({ subsets: ["latin"] });
const bebas = Bebas_Neue({ subsets: ["latin"], weight: "400" });
const pacifico = Pacifico({ subsets: ["latin"], weight: "400" });
const serif = DM_Serif_Display({ subsets: ["latin"], weight: "400" });
const mono = JetBrains_Mono({ subsets: ["latin"] });
const caveat = Caveat({ subsets: ["latin"] });
const righteous = Righteous({ subsets: ["latin"], weight: "400" });

export const FONTS: Record<FontKey, { label: string; family: string; weights: number[] }> = {
  inter: { label: "Inter", family: inter.style.fontFamily, weights: [300, 400, 600, 800, 900] },
  grotesk: { label: "Space Grotesk", family: grotesk.style.fontFamily, weights: [300, 400, 500, 700] },
  playfair: { label: "Playfair", family: playfair.style.fontFamily, weights: [400, 600, 800, 900] },
  bebas: { label: "Bebas Neue", family: bebas.style.fontFamily, weights: [400] },
  pacifico: { label: "Pacifico", family: pacifico.style.fontFamily, weights: [400] },
  serif: { label: "DM Serif", family: serif.style.fontFamily, weights: [400] },
  mono: { label: "JetBrains Mono", family: mono.style.fontFamily, weights: [300, 400, 700, 800] },
  caveat: { label: "Caveat", family: caveat.style.fontFamily, weights: [400, 700] },
  righteous: { label: "Righteous", family: righteous.style.fontFamily, weights: [400] },
};

export const uiFontClass = inter.className;
