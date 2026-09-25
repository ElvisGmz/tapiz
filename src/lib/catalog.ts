export interface Palette {
  name: string;
  colors: string[];
}

export const PALETTES: Palette[] = [
  { name: "Atardecer", colors: ["#ff6b6b", "#feca57", "#ff9ff3", "#48dbfb", "#1d1145"] },
  { name: "Aurora", colors: ["#0b1026", "#2de2e6", "#7b2ff7", "#f72585", "#b8f2e6"] },
  { name: "Pastel", colors: ["#ffd6e0", "#c1fba4", "#a0e7e5", "#b4a7f5", "#fff4b8"] },
  { name: "Océano", colors: ["#03045e", "#0077b6", "#00b4d8", "#90e0ef", "#caf0f8"] },
  { name: "Bosque", colors: ["#1b4332", "#2d6a4f", "#52b788", "#b7e4c7", "#f1faee"] },
  { name: "Retro", colors: ["#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"] },
  { name: "Neón", colors: ["#0d0221", "#ff00c8", "#00f0ff", "#faff00", "#7a04eb"] },
  { name: "Arena", colors: ["#f4eee0", "#e0c9a6", "#c08552", "#895737", "#5e3023"] },
  { name: "Mono", colors: ["#0a0a0a", "#2b2b2b", "#6b6b6b", "#d4d4d4", "#fafafa"] },
  { name: "Caramelo", colors: ["#ff4d6d", "#ff8fa3", "#ffd166", "#06d6a0", "#118ab2"] },
  { name: "Lavanda", colors: ["#231942", "#5e548e", "#9f86c0", "#be95c4", "#e0b1cb"] },
  { name: "Cítrico", colors: ["#fffbe6", "#ffe66d", "#ff9f1c", "#2ec4b6", "#011627"] },
  { name: "Memphis", colors: ["#ffcf56", "#ff5e5b", "#00cecb", "#2d2a32", "#fffffc"] },
  { name: "Menta", colors: ["#e8fff5", "#9ef0c8", "#3ecf8e", "#12664f", "#0b2b26"] },
];

export const EMOJI_CATEGORIES: { name: string; emojis: string[] }[] = [
  {
    name: "Animales",
    emojis: "🦊 🐼 🐱 🐶 🦁 🐯 🐸 🐙 🦋 🐢 🦄 🐧 🦉 🐝 🐬 🐳 🦒 🦓 🐘 🦩 🦜 🐨 🐰 🐻 🐞 🦀 🐠 🐡 🦈 🐊 🦖 🦕 🐍 🦎 🐌 🐛 🐒 🦥 🦦 🦔 🐿️ 🦘 🦙 🐪 🐄 🐖 🐑 🐓 🦆 🦢 🕊️ 🦚 🐇 🐹 🐭 🦭 🪼 🦑 🐋 🦇 🐺 🐗 🐴 🦌 🐮 🐷 🐵 🐤 🐣 🦅".split(" "),
  },
  {
    name: "Caras",
    emojis: "😀 😂 🥹 😍 🥰 😎 🤩 😜 🤪 😇 🥳 😴 🤯 😱 🤠 🥸 😈 👻 💀 👽 🤖 🎃 😺 😻 🙈 🫠 🫶 👀 💋 🤘 ✌️ 👋".split(" "),
  },
  {
    name: "Naturaleza",
    emojis: "🌸 🌺 🌻 🌷 🌹 🪷 💐 🌼 🍀 🌿 🍃 🍂 🍁 🌵 🌴 🌲 🌳 🪴 🍄 🌾 🌊 🔥 ⚡ ❄️ ☀️ 🌙 ⭐ 🌟 ✨ 🌈 ☁️ 🌧️ 🌪️ 🪐 🌍 🌋 💧 🫧".split(" "),
  },
  {
    name: "Comida",
    emojis: "🍓 🍒 🍑 🍉 🍋 🍊 🍍 🥭 🍌 🥑 🍇 🫐 🍎 🍐 🥝 🥥 🌶️ 🥕 🌽 🍕 🍔 🌮 🍣 🍩 🍪 🧁 🍰 🍦 🍭 🍬 🍫 🍿 🥐 🥨 🧋 ☕ 🍵 🍹 🥤 🍷".split(" "),
  },
  {
    name: "Objetos",
    emojis: "💎 👑 🎈 🎁 🎀 🎉 🎊 🪩 🔮 🧿 🪬 💡 📷 🎧 🎸 🎹 🥁 🎮 🕹️ 👾 🎲 🧩 🪁 🛹 ⚽ 🏀 🎾 🏈 🎯 🏆 🚀 🛸 ✈️ 🚲 🏝️ 🗿 🧸 🪄".split(" "),
  },
  {
    name: "Símbolos",
    emojis: "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🩷 🩵 💖 💘 💫 💥 💢 💤 💯 ☮️ ☯️ ♾️ ⚛️ 🔆 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🟥 🟦 🔷 🔶 ✅ ❌ ⭕ ❓ ❗".split(" "),
  },
];

export const ICON_CATEGORIES: { name: string; icons: string[] }[] = [
  {
    name: "Animales",
    icons: ["Cat", "Dog", "Bird", "Fish", "Rabbit", "Squirrel", "Turtle", "Snail", "Rat", "Bug", "PawPrint", "Shrimp", "Worm", "Feather", "Egg", "Panda", "Bone", "Origami", "Shell"],
  },
  {
    name: "Naturaleza",
    icons: ["Flower", "Flower2", "Rose", "Leaf", "Sprout", "Clover", "TreePine", "TreePalm", "Mountain", "Waves", "Sun", "Moon", "Cloud", "CloudLightning", "Rainbow", "Snowflake", "Flame", "Droplet", "Sunrise", "Wind"],
  },
  {
    name: "Espacio",
    icons: ["Star", "Sparkles", "Sparkle", "Rocket", "Orbit", "Telescope", "Satellite", "Earth", "Globe", "Atom", "Moon", "MoonStar", "Sun", "Eclipse", "Radar"],
  },
  {
    name: "Comida",
    icons: ["Pizza", "Cherry", "Apple", "Citrus", "Grape", "Banana", "Carrot", "Croissant", "Popcorn", "Cookie", "IceCreamCone", "Cake", "Candy", "Donut", "Coffee", "Wine", "Beer", "Martini", "CupSoda", "Milk", "Sandwich", "Soup", "Salad"],
  },
  {
    name: "Música y juegos",
    icons: ["Music", "Music2", "Music4", "Headphones", "Guitar", "Piano", "Drum", "Mic", "Radio", "Disc3", "Gamepad2", "Joystick", "Dice5", "Puzzle", "Trophy", "Swords", "Shield", "Ghost", "Skull", "Crown", "Gem", "Wand", "WandSparkles"],
  },
  {
    name: "Tech",
    icons: ["Code", "Terminal", "Cpu", "Bot", "Brain", "Binary", "Braces", "GitBranch", "Database", "Wifi", "Zap", "Lightbulb", "Keyboard", "Mouse", "Monitor", "Smartphone", "Bitcoin", "Fingerprint", "QrCode", "Cloud"],
  },
  {
    name: "Formas",
    icons: ["Heart", "Star", "Circle", "Square", "Triangle", "Hexagon", "Pentagon", "Octagon", "Diamond", "Squircle", "Cross", "Infinity", "Asterisk", "Hash", "Shapes", "Cone", "Cylinder", "Torus", "Pyramid", "Box", "Spade", "Club"],
  },
  {
    name: "Viajes",
    icons: ["Plane", "Car", "Bike", "Sailboat", "Anchor", "Tent", "Compass", "Map", "MapPin", "Camera", "Umbrella", "Palmtree", "Luggage", "TramFront", "Ship", "Castle"],
  },
];
