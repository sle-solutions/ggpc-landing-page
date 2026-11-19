/**
 * Product line dictionaries (card maker lines, RAM series, SSD lines) and a
 * helper that pulls the "model" part out of a retailer title. Used to build
 * display names and canonical model keys.
 */
import { stripBrandWords } from './brands';
import { cleanText, lower } from './text';

interface LineDef {
  name: string;
  re: RegExp;
}

const line = (name: string, src: string): LineDef => ({ name, re: new RegExp(`(?<![a-z0-9])(?:${src})(?![a-z0-9])`, 'i') });

/** GPU card lines by maker. Longer / more specific names first. */
const GPU_LINES: Record<string, LineDef[]> = {
  ASUS: [
    line('ROG Astral', 'rog[\\s-]?astral'),
    line('ROG Strix', 'rog[\\s-]?strix|strix'),
    line('TUF', 'tuf(?:\\s+gaming)?'),
    line('ProArt', 'proart'),
    line('Prime', 'prime'),
    line('Dual', 'dual'),
    line('KO', 'ko'),
  ],
  Gigabyte: [
    line('AORUS Master', 'aorus\\s+master'),
    line('AORUS Elite', 'aorus\\s+elite'),
    line('AORUS Xtreme', 'aorus\\s+xtreme'),
    line('AORUS', 'aorus'),
    line('AERO', 'aero'),
    line('Eagle', 'eagle'),
    line('Windforce', 'windforce(?=[\\s/]+(?:max|sff|oc|\\d+gb?)(?![a-z])|\\s*$)'),
    line('Gaming', 'gaming(?=[\\s/]+(?:oc|\\d+gb?)(?![a-z]))'),
    line('Vision', 'vision'),
  ],
  MSI: [
    line('Suprim Liquid', 'suprim\\s+liquid'),
    line('Suprim', 'suprim(?:\\s+x)?'),
    line('Gaming X Trio', 'gaming\\s+x\\s+trio'),
    line('Gaming Trio', 'gaming\\s+trio'),
    line('Gaming X Slim', 'gaming\\s+x\\s+slim'),
    line('Gaming Slim', 'gaming\\s+slim'),
    line('Gaming X', 'gaming\\s+x(?!\\s+trio|\\s+slim)'),
    line('Ventus 3X', 'ventus\\s+3x'),
    line('Ventus 2X', 'ventus\\s+2x'),
    line('Ventus', 'ventus'),
    line('Inspire', 'inspire'),
    line('Shadow 3X', 'shadow\\s+3x'),
    line('Shadow 2X', 'shadow\\s+2x'),
    line('Shadow', 'shadow'),
    line('Expert', 'expert'),
    line('Vanguard', 'vanguard'),
    line('Gaming', 'gaming(?=[\\s/]+oc(?![a-z]))'),
    line('Mech 2X', 'mech\\s+2x'),
    line('Mech', 'mech'),
  ],
  Zotac: [
    line('AMP Extreme AIRO', 'amp\\s+extreme\\s+airo'),
    line('AMP AIRO', 'amp\\s+airo'),
    line('AMP', 'amp(?:\\s+extreme)?'),
    line('Trinity', 'trinity'),
    line('Twin Edge', 'twin\\s+edge'),
    line('Solid', 'solid'),
  ],
  Palit: [line('GameRock', 'gamerock'), line('JetStream', 'jetstream'), line('GamingPro', 'gamingpro'), line('StormX', 'stormx'), line('Infinity', 'infinity'), line('Dual', 'dual')],
  PNY: [
    line('XLR8 Verto', 'xlr8(?:\\s+gaming)?\\s+verto'),
    line('Verto', 'verto'),
    line('XLR8', 'xlr8'),
    line('ARGB Triple Fan', 'argb(?:\\s+(?:oc|overclocked))?\\s+triple\\s+fan'),
    line('Triple Fan', 'triple\\s+fan'),
    line('Dual Fan', 'dual\\s+fan'),
  ],
  Inno3D: [line('iChill', 'ichill'), line('Twin X2', 'twin\\s+x2'), line('X3', 'x3')],
  Gainward: [line('Phantom', 'phantom'), line('Phoenix', 'phoenix'), line('Ghost', 'ghost'), line('Python', 'python')],
  Sapphire: [line('Nitro+', 'nitro\\s*\\+|nitro\\s+plus'), line('Nitro', 'nitro'), line('Pulse', 'pulse'), line('Pure', 'pure'), line('Toxic', 'toxic')],
  PowerColor: [line('Red Devil', 'red\\s+devil'), line('Red Dragon', 'red\\s+dragon'), line('Hellhound', 'hellhound'), line('Fighter', 'fighter'), line('Reaper', 'reaper')],
  XFX: [
    line('Quicksilver Magnetic Air', '(?:quick|qick)silver(?:\\s+[a-z0-9]+){0,6}?\\s+magnetic\\s+air'),
    line('Quicksilver', '(?:quick|qick)silver'),
    line('Mercury', 'mercury'),
    line('Swift', 'swift|swft\\s*\\d*'),
    line('Merc', 'merc\\s*\\d*'),
    line('Qick', 'qick\\s*\\d*'),
    line('Speedster', 'speedster'),
  ],
  ASRock: [line('Taichi', 'taichi'), line('Phantom Gaming', 'phantom\\s+gaming'), line('Steel Legend', 'steel\\s+legend'), line('Challenger', 'challenger')],
  NVIDIA: [line('Founders Edition', 'founders?\\s+edition')],
  Sparkle: [line('Titan', 'titan'), line('ROC', 'roc')],
  Acer: [line('Predator BiFrost', 'predator\\s+bifrost'), line('Nitro', 'nitro')],
};

/** Card maker line, e.g. ("Gigabyte", "...RTX 4070 AERO OC 12G...") -> "AERO". */
export function detectGpuLine(brand: string | undefined, title: string): string | undefined {
  if (!brand) return undefined;
  const defs = GPU_LINES[brand];
  if (!defs) return undefined;
  const t = lower(title);
  for (const def of defs) {
    const m = def.re.exec(t);
    if (!m) continue;
    // Sub-models right after the line name: "EAGLE MAX", "VENTUS 2X OC PLUS", "WINDFORCE OC SFF".
    const after = t.slice(m.index + m[0].length).split(/\s[-|]\s|[,;|(]/)[0].slice(0, 30);
    const mods: string[] = [];
    if (/(?<![a-z0-9])max(?![a-z0-9])/.test(after)) mods.push('Max');
    if (/(?<![a-z0-9])plus(?![a-z0-9])/.test(after)) mods.push('Plus');
    if (/(?<![a-z0-9])sff(?![a-z0-9-])/.test(after)) mods.push('SFF');
    return [def.name, ...mods].join(' ');
  }
  return undefined;
}

/** Factory overclocked: "OC", "OC Edition", ASUS "-O12G" part numbers. */
export function detectFactoryOc(title: string, mpn?: string): boolean | undefined {
  const t = lower(title);
  if (/(?<![a-z0-9])oc(?![a-z0-9])|oc\s+edition|overclocked/.test(t)) return true;
  if (mpn && /-O\d{1,2}G/i.test(mpn)) return true;
  return undefined;
}

const RAM_SERIES: LineDef[] = [
  line('Dominator Titanium', 'dominator\\s+titanium'),
  line('Dominator Platinum', 'dominator\\s+platinum'),
  line('Vengeance RGB', 'vengeance\\s+rgb'),
  line('Vengeance LPX', 'vengeance\\s+lpx'),
  line('Vengeance', 'vengeance'),
  line('Trident Z5 Neo RGB', 'trident\\s*z5\\s+neo\\s+rgb'),
  line('Trident Z5 Neo', 'trident\\s*z5\\s+neo'),
  line('Trident Z5 Royal', 'trident\\s*z5\\s+royal'),
  line('Trident Z5 RGB', 'trident\\s*z5\\s+rgb'),
  line('Trident Z5', 'trident\\s*z5'),
  line('Trident Z Neo', 'trident\\s*z\\s+neo'),
  line('Trident Z RGB', 'trident\\s*z\\s+rgb'),
  line('Flare X5', 'flare\\s*x5'),
  line('Ripjaws S5', 'ripjaws\\s*s5'),
  line('Ripjaws V', 'ripjaws\\s*v'),
  line('Ripjaws', 'ripjaws'),
  line('FURY Beast RGB', 'fury\\s+beast\\s+rgb'),
  line('FURY Beast', 'fury\\s+beast'),
  line('FURY Renegade RGB', 'fury\\s+renegade\\s+rgb'),
  line('FURY Renegade', 'fury\\s+renegade'),
  line('T-Force Delta RGB', '(?:t-?force\\s+)?delta\\s+rgb'),
  line('T-Force Vulcan', '(?:t-?force\\s+)?vulcan(?:\\s+[a-z])?'),
  line('XPG Lancer Blade', 'lancer\\s+blade'),
  line('XPG Lancer', 'lancer(?:\\s+rgb)?'),
  line('Viper Venom', 'viper\\s+venom'),
  line('Viper Elite', 'viper\\s+elite'),
  line('Crucial Pro', 'crucial\\s+pro'),
];

export function detectRamSeries(title: string): string | undefined {
  const t = lower(title);
  for (const def of RAM_SERIES) if (def.re.test(t)) return def.name;
  return undefined;
}

const STORAGE_LINES: LineDef[] = [
  line('990 Evo Plus', '990\\s+evo\\s+plus'),
  line('990 Evo', '990\\s+evo'),
  line('990 Pro', '990\\s+pro'),
  line('9100 Pro', '9100\\s+pro'),
  line('980 Pro', '980\\s+pro'),
  line('980', '980'),
  line('970 Evo Plus', '970\\s+evo\\s+plus'),
  line('970 Evo', '970\\s+evo'),
  line('870 Evo', '870\\s+evo'),
  line('870 QVO', '870\\s+qvo'),
  line('SN850X', 'sn\\s*850x'),
  line('SN850', 'sn\\s*850'),
  line('SN8100', 'sn\\s*8100'),
  line('SN7100', 'sn\\s*7100'),
  line('SN770', 'sn\\s*770'),
  line('SN580', 'sn\\s*580'),
  line('SN5000', 'sn\\s*5000'),
  line('SA510', 'sa\\s*510'),
  line('T705', 't705'),
  line('T700', 't700'),
  line('T500', 't500'),
  line('P5 Plus', 'p5\\s+plus'),
  line('P3 Plus', 'p3\\s+plus'),
  line('P3', 'p3'),
  line('P310', 'p310'),
  line('MX500', 'mx\\s*500'),
  line('BX500', 'bx\\s*500'),
  line('KC3000', 'kc\\s*3000'),
  line('FURY Renegade', 'fury\\s+renegade'),
  line('NV3', 'nv3'),
  line('NV2', 'nv2'),
  line('A400', 'a400'),
  line('MP700', 'mp\\s*700'),
  line('MP600 Pro', 'mp\\s*600\\s+pro'),
  line('MP600', 'mp\\s*600'),
  line('FireCuda 540', 'firecuda\\s+540'),
  line('FireCuda 530', 'firecuda\\s+530'),
  line('IronWolf Pro', 'ironwolf\\s+pro'),
  line('IronWolf', 'ironwolf'),
  line('BarraCuda', 'barracuda'),
  line('SkyHawk', 'skyhawk'),
  line('Red Plus', '(?:wd\\s+)?red\\s+plus'),
  line('Red Pro', '(?:wd\\s+)?red\\s+pro'),
  line('Rocket 4 Plus', 'rocket\\s+4\\s+plus'),
  line('Rocket 5', 'rocket\\s+5'),
  line('NM790', 'nm\\s*790'),
  line('NM710', 'nm\\s*710'),
  line('Gammix S70 Blade', 's70\\s+blade'),
  line('Legend 960 Max', 'legend\\s+960\\s+max'),
  line('Legend 960', 'legend\\s+960'),
  line('Legend 850', 'legend\\s+850'),
  line('MP44', 'mp44'),
  line('P44 Pro', 'p44\\s+pro'),
];

export function detectStorageLine(title: string): string | undefined {
  const t = lower(title);
  for (const def of STORAGE_LINES) if (def.re.test(t)) return def.name;
  return undefined;
}

/** Words that end the model part of a title. */
const MODEL_STOP = new RegExp(
  [
    'motherboard', 'mainboard', 'graphics card', 'video card', 'desktop processor', 'processor',
    'power supply', 'psu', 'cpu cooler', 'cpu air cooler', 'air cooler', 'liquid cooler', 'aio',
    'water cool', 'cooler', 'mid[\\s-]?tower', 'full[\\s-]?tower', 'mini[\\s-]?tower', 'pc case', 'computer case',
    'gaming case', '(?<![a-z])case(?![a-z])', 'chassis', 'desktop memory', 'memory', '(?<![a-z])ram(?![a-z])', 'internal ssd', 'ssd',
    'solid state', 'hard drive', 'nvme', 'gaming monitor', 'monitor', 'amd', 'intel', 'socket', 'am5', 'am4',
    'lga\\s*\\d{4}', '(?<![a-z])e-?atx', 'micro[\\s-]?atx', 'mini[\\s-]?itx', '(?<![a-z-])atx(?![a-z])', 'ddr[45]',
    '\\d+\\s*(?:gb|tb)', '80\\s*(?:\\+|plus)', 'fully modular', 'full[\\s-]?modular', 'semi[\\s-]?modular', 'non[\\s-]?modular',
    '(?<![a-z0-9])\\d{3,4}\\s*w(?:atts?)?(?![a-z0-9])', '(?<![a-z])(?:gold|bronze|platinum|titanium)(?![a-z])', 'tempered glass', 'a-?rgb', '(?<![a-z])rgb',
  ].join('|'),
  'i'
);

/**
 * The model part of a title with brand words removed, e.g.
 * "MSI MAG B650 TOMAHAWK WIFI Gaming Motherboard (AM5, ...)" -> "MAG B650 TOMAHAWK WIFI Gaming".
 */
export function modelSegment(title: string): string {
  const stripped = stripBrandWords(title);
  let seg = stripped.split(/\s[-|]\s|[,;|()[\]{}]|\s(?:with|for|w\/)\s/)[0] ?? '';
  const stop = MODEL_STOP.exec(seg);
  if (stop && stop.index > 0) seg = seg.slice(0, stop.index);
  seg = seg.replace(/\b(?:gaming|new|the|edition)\b/gi, ' ');
  return cleanText(seg)
    .split(' ')
    .filter(Boolean)
    .slice(0, 6)
    .join(' ');
}

/** Title case a lowercased model string for display ("mag b650 tomahawk wifi" -> "MAG B650 TOMAHAWK WIFI"). */
export function displayCase(text: string): string {
  return text
    .split(' ')
    .map((w) => (/\d/.test(w) || w.length <= 4 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}
