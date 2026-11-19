/**
 * Decide which PC part category a retailer listing belongs to.
 *
 * High precision beats recall: when in doubt we answer 'OTHER'. Laptops,
 * prebuilt PCs, consoles, cables, GPU brackets, thermal paste, fans, external
 * drives and similar products are all 'OTHER'.
 *
 * How it works, in order:
 *  1. Titles that name a laptop CPU, a laptop GPU, or both a CPU and a GPU are
 *     whole systems (laptops / prebuilt PCs) -> OTHER.
 *  2. The "head noun" of the title decides ("... Graphics Card", "... Power
 *     Supply", "GPU Support Bracket"). Clauses like "for RTX 4090" or
 *     "compatible with PS5" are ignored because they describe something else.
 *  3. Model signals (an RTX/RX chipset with VRAM, a Ryzen/Core model, DDR5 +
 *     capacity + speed, ...) when the title has no noun.
 *  4. Breadcrumbs, then the caller's hint.
 */
import { stripBrandWords } from './brands';
import { decodeRamMpn, isLaptopGpu, parseChipset, parseCpuModel, parseFormFactor, parseGpuChipset, parseSocket } from './parsers';
import { SpecIndex, lower } from './text';
import { isPartCategory, type PartCategory, type ProductInput } from './types';

type NounClass = PartCategory | 'SYSTEM' | 'ACCESSORY';

export interface CategoryResult {
  category: PartCategory;
  /** 0..1 */
  confidence: number;
  /** What kind of thing it is: a PC part, a whole computer/console, an accessory, or unknown. */
  kind: 'part' | 'system' | 'accessory' | 'unknown';
  reason: string;
}

interface NounDef {
  re: RegExp;
  cls: NounClass;
  strong: boolean;
}

const n = (src: string, cls: NounClass, strong = true): NounDef => ({ re: new RegExp(src, 'g'), cls, strong });
const W = (word: string) => `(?<![a-z0-9])${word}(?![a-z0-9])`;

/**
 * Noun phrases. Overlaps are resolved by keeping the earliest, then longest,
 * match, so "cpu cooler" beats "cpu", "laptop memory" beats "laptop" and
 * "ssd heatsink" beats "ssd".
 */
const NOUNS: NounDef[] = [
  // --- systems (whole computers, consoles) ---
  n(W('(?:gaming\\s+)?laptops?') + '(?!\\s*(?:memory|ram|ssd|stand|bag|sleeve|cooling|cooler|charger|adapter|battery|backpack|case|skin))', 'SYSTEM'),
  n(W('notebooks?') + '(?!\\s*(?:memory|ram|ssd|stand|bag|sleeve|cooling|cooler|charger|adapter|battery))', 'SYSTEM'),
  n(W('(?:macbook|chromebook|imac|ultrabook)'), 'SYSTEM'),
  n(W('gaming\\s+(?:pc|computer|desktop)') + '(?!\\s*(?:processor|cpu|memory|ram))', 'SYSTEM'),
  n(W('desktop\\s+(?:pc|computer|tower\\s+pc)'), 'SYSTEM'),
  n(W('(?:tower|mini|small\\s+form\\s+factor)\\s+pc(?!\\s+(?:gaming\\s+)?(?:case|chassis))|pc\\s+tower(?!\\s+(?:gaming\\s+)?(?:case|chassis))'), 'SYSTEM'),
  n(W('pc\\s+desktop'), 'SYSTEM'),
  n(W('pre-?built(?:\\s+(?:gaming\\s+)?pc)?'), 'SYSTEM'),
  n(W('all[\\s-]?in[\\s-]?one\\s+(?:pc|computer|desktop)'), 'SYSTEM'),
  n(W('aio\\s+(?:pc|computer|desktop)'), 'SYSTEM'),
  n(W('mini\\s+pc'), 'SYSTEM'),
  // Network storage boxes are whole computers; "NAS hard drive" stays STORAGE.
  n(W('(?:desktop\\s+)?nas(?:\\s+(?:server|system|enclosure))?') + '(?!\\s+(?:internal\\s+)?(?:hard|hdd|ssd|drives?|sata))', 'SYSTEM'),
  n(W('network[\\s-]+(?:attached\\s+)?storage'), 'SYSTEM'),
  n(W('barebones?(?:\\s+(?:pc|computer|system|kit|mini\\s+pc))?'), 'SYSTEM'),
  n(W('(?:game\\s+|gaming\\s+|video\\s+game\\s+)?consoles?'), 'SYSTEM'),
  n(W('(?:playstation\\s*5?|ps5|xbox(?:\\s+series\\s+[xs])?|nintendo\\s+switch(?:\\s+2)?)\\s+(?:console|bundle|digital\\s+edition|slim|pro)'), 'SYSTEM'),
  n(W('(?:gaming\\s+)?handhelds?'), 'SYSTEM'),
  n(W('steam\\s+deck'), 'SYSTEM'),
  n(W('tablets?'), 'SYSTEM'),
  n(W('workstation\\s+pc'), 'SYSTEM'),
  n(W('(?:ai\\s+)?super\\s*computers?'), 'SYSTEM'),
  n(W('(?:windows|home|office)\\s+(?:pc|computer|desktop)'), 'SYSTEM'),
  n(W('(?:intel\\s+)?nuc(?:\\s+\\d+)?(?:\\s+(?:kit|mini\\s+pc))?'), 'SYSTEM'),
  n(W('(?:bundle|combo)'), 'SYSTEM'),

  // --- accessories and non-part products ---
  // Explicit personal-care heads cannot become components from a later printed model.
  n(W('(?:shampoos?|hair\\s+conditioners?|body\\s+wash|hand\\s+soaps?)'), 'ACCESSORY'),
  n(W('external\\s+(?:graphics?\\s+cards?|gpus?|video\\s+cards?|graphics(?:\\s+(?:enclosure|dock|box))?)'), 'ACCESSORY'),
  n(W('(?:egpu|gpu|graphics(?:\\s+card)?)\\s*(?:enclosures?|docks?|docking\\s+station)'), 'ACCESSORY'),
  n(W('egpus?'), 'ACCESSORY'),
  n(W('(?:ai|gaming)\\s+box'), 'ACCESSORY'),
  n(W('(?:gpu|vga|graphics\\s+card|video\\s+card)\\s+(?:support(?:\\s+(?:bracket|stand|holder))?|holder|bracket|brace|stand|riser(?:\\s+cable)?|sag(?:\\s+holder)?|jack|(?:power\\s+)?cables?|backplate|cover|fans?|(?:water\\s+|liquid\\s+|air\\s+)?(?:coolers?|cooling)|water\\s*blocks?)'), 'ACCESSORY'),
  n(W('full[\\s-]?cover(?:\\s+(?:copper|nickel|gpu))?\\s+(?:water\\s*)?blocks?'), 'ACCESSORY'),
  n(W('(?:anti[\\s-]?)?sag(?:\\s+(?:bracket|holder|support))?'), 'ACCESSORY'),
  n(W('vertical\\s+(?:gpu|graphics\\s+card|video\\s+card)(?:\\s+(?:mount(?:ing)?|holder|bracket|kit))+'), 'ACCESSORY'),
  n(W('(?:tpm(?:\\s+2\\.0)?|security)\\s+modules?|cryptographic\\s+processor'), 'ACCESSORY'),
  n(W('(?:switching|led|cctv|dc|ac[\\s/-]*dc|din[\\s-]*rail|injector)\\s+power\\s+supply(?:\\s+unit)?'), 'ACCESSORY'),
  n(W('(?:psu|power\\s+supply)\\s+(?:covers?|shrouds?|brackets?)'), 'ACCESSORY'),
  n(W('(?:ice\\s+(?:box|chest)|cool\\s*box|camping|picnic)'), 'ACCESSORY'),
  n(W('(?:air\\s+quality|baby|heart\\s+rate|blood\\s+pressure|tyre|tire|energy|power)\\s+monitors?'), 'ACCESSORY'),
  n(W('support\\s+(?:bracket|stand|holder|brace)'), 'ACCESSORY'),
  n(W('(?:brackets?|holders?|braces?|risers?(?:\\s+(?:cable|card))?)'), 'ACCESSORY'),
  n(W('(?:sleeved\\s+)?(?:extension\\s+)?cables?(?:\\s+(?:kit|set))?'), 'ACCESSORY'),
  n(W('(?:adapters?|adaptors?|converters?|splitters?)(?:\\s+card)?'), 'ACCESSORY'),
  n(W('thermal\\s+(?:paste|compound|grease|pads?|putty|gel|interface\\s+material)'), 'ACCESSORY'),
  n(W('(?:paste|compound)'), 'ACCESSORY'),
  n(W('(?:contact|secure)\\s+frame'), 'ACCESSORY'),
  n(W('(?:replacement|spare)(?:\\s+(?:gpu|vga|graphics\\s+card|case|cooling))?\\s+fans?'), 'ACCESSORY'),
  n(W('fans?\\s+replacement|(?:replacement|spare)\\s+(?:heat\\s*sinks?|cables?)|processors?\\s+fans?'), 'ACCESSORY'),
  n(W('(?:keychains?|keyrings?|keycaps?|stickers?|posters?|decals?)'), 'ACCESSORY'),
  n(W('mounting\\s+(?:kit|bracket|frame)'), 'ACCESSORY'),
  n(W('backplates?'), 'ACCESSORY'),
  n(W('(?:fan|rgb|argb|led)\\s+(?:hub|controller|splitter|filter|grill|guard|strip)'), 'ACCESSORY'),
  n(W('led\\s+strips?'), 'ACCESSORY'),
  n(W('(?:(?:computer|pc|desktop)\\s+)?(?:case|pc|replacement|cooling|exhaust|chassis|computer)\\s+fans?'), 'ACCESSORY'),
  n(W('fans?'), 'ACCESSORY', false),
  n(W('dust\\s+(?:filters?|covers?)'), 'ACCESSORY'),
  n(W('(?:screws?|standoffs?|screwdrivers?|tool\\s*kit|wrist\\s+strap|anti[\\s-]?static\\s+\\w+)'), 'ACCESSORY'),
  n(W('(?:water\\s*blocks?|reservoirs?|fittings?|tubing|coolant)'), 'ACCESSORY'),
  n(W('(?:ssd|nvme|m\\.?2)\\s+(?:heat\\s*sinks?|enclosures?|adapters?|cooler|case|caddy)'), 'ACCESSORY'),
  n(W('(?:ram|memory)\\s+(?:cooler|cooling|fan|heat\\s*sinks?)'), 'ACCESSORY'),
  n(W('(?:portable|external)(?:\\s+[a-z0-9.-]+){0,3}?\\s+(?:ssd|solid[\\s-]?state\\s+drive|hard\\s+(?:disk\\s+)?drive|hdd|drive|storage)'), 'ACCESSORY'),
  n(W('(?:usb\\s+)?(?:flash|pen|thumb)\\s+drives?'), 'ACCESSORY'),
  n(W('(?:memory\\s+card|micro\\s*sd(?:xc|hc)?(?:\\s+card)?|sd(?:xc|hc)?\\s+card|cf\\s*express|flash\\s+memory)'), 'ACCESSORY'),
  n(W('(?:uninterruptible\\s+power\\s+supply|ups|power\\s+banks?|power\\s+strips?|surge\\s+protector|chargers?|power\\s+adapters?)'), 'ACCESSORY'),
  n(W('(?:psu|power\\s+supply)\\s+(?:cables?|tester|extensions?|jumper)'), 'ACCESSORY'),
  n(W('(?:phone|carrying|hard|protective|storage|travel|pencil|headphone|controller|laptop)\\s+cases?'), 'ACCESSORY'),
  n(W('(?:(?:pc|computer|[em]?atx|micro[ -]?atx|mini[ -]?itx|itx|mid[ -]?tower|full[ -]?tower)\\s+)?(?:case|chassis)\\s+(?:fans?|dust\\s+filters?|(?:replacement\\s+)?(?:(?:side|front|top)\\s+)?panels?)'), 'ACCESSORY'),
  n(W('(?:replacement|spare)\\s+(?:(?:case|chassis)\\s+)?(?:(?:side|front|top)\\s+)?panels?'), 'ACCESSORY'),
  n(W('case\\s+(?:badge|feet|foot|stand|light|riser)'), 'ACCESSORY'),
  n(W('monitor\\s+(?:arms?|stands?|mounts?|light(?:\\s+bar)?|risers?|brackets?)'), 'ACCESSORY'),
  n(W('laptop\\s+(?:stand|bag|sleeve|cooling\\s+pad|cooler|charger|battery|backpack)'), 'ACCESSORY'),
  n(W('cooling\\s+pads?'), 'ACCESSORY'),
  n(W('(?:capture|playback|sound|network|wi-?fi|lan|ethernet|expansion|pcie|pci-?e)\\s+cards?'), 'ACCESSORY'),
  n(W('decklink'), 'ACCESSORY'),
  n(W('(?:wi-?fi|bluetooth|usb)\\s+(?:adapter|dongle|receiver)'), 'ACCESSORY'),
  n(W('(?:usb\\s+hub|docking\\s+station|dock|kvm\\s+switch)'), 'ACCESSORY'),
  n(W('(?:network|ethernet|gigabit|desktop|unmanaged|managed|poe\\+?|smart)\\s+switch(?:es)?'), 'ACCESSORY'),
  n(W('(?:keyboards?|mice|mouse(?:\\s+pad)?|headsets?|headphones?|earbuds?|webcams?|speakers?|microphones?|gamepads?|controllers?|routers?|printers?|chairs?)'), 'ACCESSORY'),

  // --- PC parts ---
  n(W('(?:cpu|processor)\\s+(?:air\\s+|liquid\\s+|water\\s+|aio\\s+)?(?:coolers?|cooling(?:\\s+fan)?)'), 'CPU_COOLER'),
  n(W('(?:air|liquid|water|aio|tower|all[\\s-]?in[\\s-]?one(?:\\s+liquid)?)\\s+coolers?'), 'CPU_COOLER'),
  n(W('(?:liquid|water)\\s+cooling(?:\\s+system)?'), 'CPU_COOLER'),
  n(W('cpu\\s+(?:liquid|water)\\s+cooling'), 'CPU_COOLER'),
  n(W('cpu\\s+fan'), 'CPU_COOLER'),
  n(W('coolers?'), 'CPU_COOLER'),
  n(W('aio'), 'CPU_COOLER', false),

  // "4096 Stream Processors" is a graphics card spec, not a CPU.
  // "Ryzen 7000 Series Processors" on a motherboard is a support list, not a CPU.
  n(W('(?<!stream\\s)(?<!series\\s)(?:desktop\\s+)?processors?'), 'CPU'),
  n(W('cpus?'), 'CPU', false),

  n(W('graphics?\\s+cards?'), 'GPU'),
  n(W('video\\s+cards?'), 'GPU'),
  n(W('gpus?'), 'GPU', false),

  n(W('mother\\s*boards?'), 'MOTHERBOARD'),
  n(W('main\\s*boards?'), 'MOTHERBOARD'),
  n(W('mobo'), 'MOTHERBOARD'),

  n(W('(?:desktop|laptop|notebook|computer|pc|server|gaming)\\s+(?:memory|ram)(?:\\s+(?:kit|modules?))?'), 'RAM'),
  n(W('(?:memory|ram)\\s+(?:kit|modules?)'), 'RAM'),
  n(W('ram'), 'RAM'),
  n(W('so-?dimm'), 'RAM'),
  n(W('u?dimm'), 'RAM', false),
  n(W('memory'), 'RAM', false),

  n(W('(?:internal\\s+)?(?:gaming\\s+)?(?:solid[\\s-]?state\\s+drives?|ssds?)'), 'STORAGE'),
  n(W('(?:internal\\s+)?(?:nas\\s+)?hard\\s+(?:disk\\s+)?drives?'), 'STORAGE'),
  n(W('hdds?'), 'STORAGE'),
  n(W('nvme'), 'STORAGE', false),

  n(W('power\\s+supply(?:\\s+unit)?'), 'POWER_SUPPLY'),
  n(W('psus?'), 'POWER_SUPPLY'),

  n(W('(?:pc|computer|gaming|atx|matx|micro[\\s-]?atx|mini[\\s-]?itx|itx|e-?atx|tower|desktop|mid[\\s-]?tower|full[\\s-]?tower)\\s+(?:gaming\\s+)?(?:case|chassis)'), 'CASE'),
  n(W('(?:mid|midi|middle|full|mini|micro|super)[\\s-]?towers?|midt'), 'CASE'),
  n(W('chassis'), 'CASE'),
  n(W('case'), 'CASE', false),

  n(W('(?:gaming\\s+)?monitors?'), 'MONITOR'),

  n(W('windows\\s+1[01](?:\\s+(?:pro|home))?'), 'OS'),
  n(W('operating\\s+system'), 'OS'),
];

/** Words that start a clause describing *other* products ("for RTX 4090", "compatible with PS5"). */
const TARGET_CLAUSE = /\s(?:for|compatible\s+with|works\s+with|fits|supports|supporting|support\s+for|designed\s+for|ideal\s+for|suitable\s+for|perfect\s+for)\s/;
/** Words that start a secondary clause we still read, but after the main one. */
const SECONDARY_CLAUSE = /\s(?:with|w\/|including|includes|incl\.?|featuring)\s/;

interface Segment {
  text: string;
  target: boolean;
}

interface ProductSegment extends Segment {
  /** An explicit connector makes this secondary to the independently named product. */
  included: boolean;
}

/** Split a title into clauses on punctuation and connector words. */
export function titleSegments(title: string): Segment[] {
  return productSegments(title).map(({ text, target }) => ({ text, target }));
}

function productSegments(title: string): ProductSegment[] {
  // Retailers vary the punctuation of cooling nouns, without changing what is
  // sold. Normalize only those compounds; preserve model-number hyphens.
  const base = ` ${stripBrandWords(title).replace(/\b(water|liquid|air)[-\u2010-\u2015]+(?=blocks?\b|cool(?:ers?|ing)\b)/g, '$1 ')} `;
  // Hard delimiters first.
  const hard = base.split(/\s[-|]\s|[,;|()[\]{}]|\s\/\s/);
  const out: ProductSegment[] = [];
  const append = (text: string, target: boolean, included: boolean) => {
    // Artwork and label text describe another thing. A model printed on a bottle or
    // panel is not component evidence; preserve the primary product clause itself.
    const printed = out.length > 0 && /\b(?:printed|engraved|embroidered)\s+(?:on|onto)\b/.test(text);
    out.push({ text, target: target || printed, included });
  };
  let carryTarget = false;
  for (const chunk of hard) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    // "for PC, Laptop, PS5": short items right after a target clause belong to it.
    let target: boolean = carryTarget && trimmed.split(/\s+/).length <= 3;
    let included = false;
    let rest: string = ` ${trimmed} `;
    // Peel off connector clauses left to right.
    for (;;) {
      const t: RegExpExecArray | null = TARGET_CLAUSE.exec(rest);
      const s: RegExpExecArray | null = SECONDARY_CLAUSE.exec(rest);
      const next: RegExpExecArray | undefined = [t, s].filter((m): m is RegExpExecArray => !!m).sort((a, b) => a.index - b.index)[0];
      if (!next) break;
      const head = rest.slice(0, next.index).trim();
      if (head) append(head, target, included);
      target = next === t;
      included = next === s;
      rest = ` ${rest.slice(next.index + next[0].length).trim()} `;
    }
    const tail = rest.trim();
    if (tail) append(tail, target, included);
    carryTarget = target;
  }
  return out;
}

interface NounHit {
  start: number;
  end: number;
  cls: NounClass;
  strong: boolean;
  text: string;
}

function findNouns(text: string): NounHit[] {
  const all: NounHit[] = [];
  for (const def of NOUNS) {
    def.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = def.re.exec(text))) {
      if (m[0].length === 0) {
        def.re.lastIndex++;
        continue;
      }
      all.push({ start: m.index, end: m.index + m[0].length, cls: def.cls, strong: def.strong, text: m[0] });
    }
  }
  all.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const kept: NounHit[] = [];
  for (const hit of all) {
    if (kept.some((k) => hit.start < k.end && k.start < hit.end)) continue;
    kept.push(hit);
  }
  return kept;
}

/** Model level evidence ("RTX 4070 12GB", "DDR5 6000MHz 32GB", "850W 80+ Gold"). */
function modelSignals(text: string): Set<PartCategory | 'SYSTEM'> {
  const signals = new Set<PartCategory | 'SYSTEM'>();
  const cpu = parseCpuModel(text);
  const gpu = parseGpuChipset(text);
  const hasCapacity = /(?<![a-z0-9])\d+(?:\.\d+)?\s*(?:gb|tb)(?![a-z0-9])/.test(text);
  if (cpu) signals.add(cpu.mobile ? 'SYSTEM' : 'CPU');
  if (gpu && isLaptopGpu(text)) signals.add('SYSTEM');
  else if (gpu && (/\d+\s*gb|gddr\d|graphics|geforce|radeon/.test(text))) signals.add('GPU');
  // Older or uncommon chips the parser does not list ("GeForce GT 1030 2GB GDDR5").
  else if (!gpu && /(?<![a-z])(?:geforce|radeon)(?![a-z])/.test(text) && /(?<![a-z])gddr\d/.test(text)) signals.add('GPU');
  const chipset = parseChipset(text);
  // Boards are often named by chipset alone ("ASRock B650M-HDV/M.2"; the brand is stripped before
  // this runs), so a chipset that leads the title counts too.
  const chipsetLeads = !!chipset && text.indexOf(chipset.chipset.toLowerCase()) <= 12;
  if (chipset && (parseSocket(text) || parseFormFactor(text) || chipsetLeads || /wi-?fi|motherboard/.test(text))) signals.add('MOTHERBOARD');
  if (/(?<![a-z])ddr[345](?![0-9])/.test(text) && hasCapacity && /\d{4}\s*(?:mhz|mt\/?s)|ddr[345][\s-]?\d{4}(?![0-9])|(?<![a-z])c(?:l)?\d{2}(?![0-9])|\d\s*x\s*\d+\s*gb/.test(text)) signals.add('RAM');
  if (hasCapacity && /(?<![a-z])(?:nvme|sata|m\.2|ssd|hdd|\d{4,5}\s*rpm|pcie\s*(?:gen\s*)?[345])/.test(text) && !/(?<![a-z])(?:g?ddr[3-7]x?)(?![0-9])|geforce|radeon/.test(text)) signals.add('STORAGE');
  if (/(?<![0-9])\d{3,4}\s*w(?:att)?s?(?![a-z0-9])/.test(text) && /80\s*(?:\+|plus)|(?<![a-z])(?:bronze|gold|platinum|titanium)(?![a-z])|modular/.test(text)) signals.add('POWER_SUPPLY');
  return signals;
}

/** Map one breadcrumb to a class. Generic crumbs ("Computers & Accessories") map to nothing. */
function mapCrumb(raw: string): NounClass | undefined {
  const c = lower(raw);
  if (!c) return undefined;
  if (/^(?:computers?(?:\s*(?:&|and)\s*(?:accessories|tablets|office))?|electronics|computer components|pc components|components|pc parts|computer parts|data storage|storage|all categories|home|computing|computers & laptops)$/.test(c)) return undefined;
  if (/laptop memory|notebook memory|so-?dimm/.test(c)) return 'RAM';
  if (/cpu (?:cooling|coolers?|fans?|heatsinks?)|processor cool|water cooling|liquid cool|(?<![a-z])aio|air coolers?|^coolers?$|cpu coolers?/.test(c)) return 'CPU_COOLER';
  if (/case fans?|thermal|paste|compound/.test(c)) return 'ACCESSORY';
  if (/(?:graphics cards?|gpu|video cards?) (?:accessor|holders?|brackets?|supports?)/.test(c)) return 'ACCESSORY';
  if (/graphics cards?|video cards?|(?<![a-z])gpus?(?![a-z])/.test(c)) return 'GPU';
  if (/mother\s*boards?|mainboards?/.test(c)) return 'MOTHERBOARD';
  if (/(?<![a-z])(?:cpus?|processors?)(?![a-z])/.test(c)) return 'CPU';
  if (/memory cards?|flash|(?<![a-z])usb|external|portable/.test(c)) return 'ACCESSORY';
  if (/(?<![a-z])(?:ram|memory)(?![a-z])/.test(c)) return 'RAM';
  if (/solid state|(?<![a-z])ssds?(?![a-z])|hard (?:disk )?drives?|(?<![a-z])hdds?(?![a-z])|internal drives?/.test(c)) return 'STORAGE';
  if (/uninterruptible|(?<![a-z])ups(?![a-z])|power banks?|chargers?|adapters?/.test(c)) return 'ACCESSORY';
  if (/power suppl|(?<![a-z])psus?(?![a-z])/.test(c)) return 'POWER_SUPPLY';
  if (/phone|carrying|laptop (?:bags|cases|sleeves|accessor)|monitor (?:arms?|mounts?|stands?|accessor)/.test(c)) return 'ACCESSORY';
  if (/laptops?|notebooks?|(?<![a-z])desktops?(?![a-z])|gaming pcs?|all[- ]in[- ]ones?|tablets?|consoles?|playstation|xbox|nintendo|mini pcs?|prebuilt|^pcs$/.test(c)) return 'SYSTEM';
  if (/(?:computer|pc|gaming) cases?|cases? (?:&|and) enclosures|(?<![a-z])cases?(?![a-z])|chassis|towers?$/.test(c)) return 'CASE';
  if (/monitors?/.test(c)) return 'MONITOR';
  if (/operating systems?/.test(c)) return 'OS';
  if (/keyboards?|(?<![a-z])mice(?![a-z])|mouse|headsets?|headphones?|speakers?|webcams?|networking|routers?|printers?|cables?|accessor|gaming chairs?/.test(c)) return 'ACCESSORY';
  return undefined;
}

function crumbClass(breadcrumbs: string[] | undefined): { cls: NounClass; crumb: string } | undefined {
  if (!breadcrumbs) return undefined;
  for (let i = breadcrumbs.length - 1; i >= 0; i--) {
    const cls = mapCrumb(breadcrumbs[i]);
    if (cls) return { cls, crumb: breadcrumbs[i] };
  }
  return undefined;
}

function normalizeHint(hint: unknown): PartCategory | undefined {
  if (hint === 'PSU') return 'POWER_SUPPLY';
  if (hint === 'COOLER') return 'CPU_COOLER';
  return isPartCategory(hint) ? hint : undefined;
}

const result = (
  category: PartCategory,
  confidence: number,
  kind: CategoryResult['kind'],
  reason: string
): CategoryResult => ({ category, confidence, kind, reason });

function fromClass(cls: NounClass, confidence: number, reason: string): CategoryResult {
  if (cls === 'SYSTEM') return result('OTHER', confidence, 'system', reason);
  if (cls === 'ACCESSORY') return result('OTHER', confidence, 'accessory', reason);
  if (cls === 'OTHER') return result('OTHER', confidence, 'unknown', reason);
  return result(cls, confidence, 'part', reason);
}

/** Specs that only whole computers have (a screen and an OS or a battery). */
function specsLookLikeSystem(specs: SpecIndex): boolean {
  const screen = specs.has(/^(?:screensize|displaysize|standingscreendisplaysize)$/);
  const os = specs.has(/^operatingsystem$/);
  const battery = specs.has(/^(?:batterylife|batteries|batterycapacity|averagebatterylife)/);
  const cpu = specs.has(/^(?:processortype|cpumodel|processorbrand)$/);
  return screen && (os || battery || cpu);
}

/**
 * Classify a listing. Returns the category plus a confidence and a short reason.
 */
/** Things a listing says it does NOT include ("no cooler included", "without power supply"). */
const EXCLUDED_PARTS =
  /(?<![a-z])(?:(?:without|w\/o|excl(?:uding|\.)?|no)\s+(?:an?\s+|the\s+)?(?:(?:box|stock)\s+)?(?:cpu\s+)?(?:coolers?|fans?|heatsinks?|power\s+supply|psu)(?:\s+included)?|(?:coolers?|fans?|heatsinks?|power\s+supply|psu)\s+(?:is\s+)?not\s+included)(?![a-z])/gi;

/** Parts a listing only mentions as a requirement ("750W PSU Recommended"). */
const REQUIRED_PARTS = /(?:\d{3,4}\s*w\s+)?(?:psu|power\s+supply)\s+(?:recommended|required)|(?:recommended|required|minimum)\s+(?:psu|power\s+supply)(?:\s*:?\s*\d{3,4}\s*w)?/gi;

export function categorizeProduct(input: ProductInput): CategoryResult {
  const title = (input.title ?? '').replace(EXCLUDED_PARTS, ' ').replace(REQUIRED_PARTS, ' ');
  const segments = productSegments(title);
  const headSegments = segments.filter((s) => !s.target);
  const headText = headSegments.map((s) => s.text).join(' , ');
  const primaryText = headSegments.filter(s => !s.included).map(s => s.text).join(' , ');
  const primarySignals = modelSignals(primaryText);
  // An included accessory may print another component's model. That is not a
  // second component in the purchase; actual included hardware still counts.
  const signalText = headSegments.flatMap(s => s.included
    ? s.text.split(/\s+(?:and|plus|&|\+)\s+/).filter(text => !findNouns(text).some(h => h.strong && h.cls === 'ACCESSORY'))
    : [s.text]).join(' , ');
  const crumb = crumbClass(input.breadcrumbs);
  const hint = normalizeHint(input.category);
  const specs = new SpecIndex(input.specs);

  const withCrumb = (cat: PartCategory, base: number, reason: string): CategoryResult => {
    if (!crumb) return result(cat, base, 'part', reason);
    if (crumb.cls === cat) return result(cat, Math.min(0.99, base + 0.06), 'part', `${reason}; breadcrumb agrees`);
    return result(cat, Math.max(0.5, base - 0.15), 'part', `${reason}; breadcrumb "${crumb.crumb}" disagrees`);
  };

  // 1. Whole systems by model signals.
  const signals = modelSignals(signalText);
  const ramMpn = decodeRamMpn(input.mpn ?? specs.get(['Manufacturer Part Number', 'Part Number', 'Item model number', 'Model Number', 'MPN']));
  if (ramMpn.memoryType && signals.size === 0) {
    signals.add('RAM');
    primarySignals.add('RAM');
  }
  if (/(?<![a-z])(?:egpu|oculink)(?![a-z])|external\s+(?:graphics|gpu|video)|(?:ai|gaming)\s+box|gpu\s+(?:enclosure|dock)/.test(signalText) || (signals.has('GPU') && /(?<![a-z])thunderbolt(?![a-z])/.test(signalText))) {
    return result('OTHER', 0.93, 'accessory', 'External graphics enclosure (eGPU), not an internal graphics card');
  }
  // A food cooler names itself in a later clause ("Xtreme Cooler, Large Ice Box").
  if (/(?<![a-z])(?:ice\s+(?:box|chest)|cool\s*box|camping|picnic)(?![a-z])/.test(signalText)) {
    return result('OTHER', 0.9, 'accessory', 'Food or drink cooler, not a CPU cooler');
  }
  if (/(?<![a-z])(?:portable|external)(?![a-z])/.test(signalText) && /(?<![a-z])(?:ssd|solid[\s-]?state|hard\s+(?:disk\s+)?drive|hdd|drive)(?![a-z])/.test(signalText)) {
    return result('OTHER', 0.9, 'accessory', 'Portable or external drive, not an internal one');
  }
  if (signals.has('SYSTEM')) {
    return result('OTHER', 0.95, 'system', 'Title names a laptop CPU or GPU, so this is a whole computer');
  }
  if (signals.has('CPU') && signals.has('GPU')) {
    return result('OTHER', 0.92, 'system', 'Title names both a CPU and a graphics card, so this is a whole computer');
  }
  // Bundles: a CPU, a graphics card and a motherboard are each sold alone, so two of them in one
  // title ("Ryzen 7 9800X3D Processor with ... B850 Motherboard") is a combo deal.
  const mbMentioned = signals.has('MOTHERBOARD') || /mother\s*boards?|main\s*boards?/.test(signalText);
  const majors = [signals.has('CPU'), signals.has('GPU'), mbMentioned].filter(Boolean).length;
  if (majors >= 2) {
    return result('OTHER', 0.9, 'system', 'Title bundles several main components (combo deal)');
  }
  if (signals.has('CPU') && (signals.has('STORAGE') || /(?<!max\s|up\s+to\s)(?<![0-9])\d+\s*gb\s+(?:of\s+)?(?:ddr[45]\s+)?ram(?![a-z])/.test(signalText))) {
    return result('OTHER', 0.9, 'system', 'Title lists a CPU with RAM or storage, so this is a whole computer');
  }
  const componentSignals = ['CPU', 'GPU', 'RAM', 'STORAGE'].filter((c) => signals.has(c as PartCategory));
  if (componentSignals.length >= 3) {
    return result('OTHER', 0.9, 'system', 'Title lists several components, so this is a whole computer');
  }

  // Model text printed on a protective container is not the component. Explicitly included
  // gifts remain secondary, but a CPU/GPU signal must not overrule the sold container head.
  const soldTitle = primaryText;
  if (/\b(?:phone|carrying|hard|protective|storage|travel|pencil|headphone|controller|laptop)\s+cases?\b/.test(soldTitle)) {
    return result('OTHER', 0.95, 'accessory', 'Title sells a protective container, not a PC component');
  }

  // 2. Head noun.
  // A case may put its form factor or included fans after its model name. Preserve accessory
  // and system heads, but do not let a later included motherboard/fan description replace the case.
  const firstHits = findNouns(headSegments[0]?.text ?? '');
  const firstHit = firstHits[0];
  const fanSpecification = firstHit && /\b(?:triple|dual|twin|tri|windforce|[2-9]x?)\s+(?:[a-z0-9-]+\s+)?$/.test(headSegments[0].text.slice(0, firstHit.start));
  if (firstHit?.cls === 'ACCESSORY' && !firstHit.strong && !headSegments[0].included
      && !firstHits.some(hit => hit.strong && hit.cls !== 'ACCESSORY')
      && (!fanSpecification || modelSignals(headSegments[0].text.slice(0, firstHit.start)).size === 0)) {
    return fromClass('ACCESSORY', 0.85, `Title sells a ${firstHit.text.trim()}, not the compatible component`);
  }
  if (firstHits.some(hit => hit.cls === 'CASE' && !hit.strong) && !firstHits.some(hit => hit.strong)) {
    const chassis = !!parseFormFactor(headText) ||
      (/\b(?:gamer|gaming)\s+case\b/.test(headText) && /\b[2-9]\s+(?:pre[ -]?installed\s+)?fans?\b/.test(headText));
    const conflictingHead = headSegments.slice(1).filter(segment => !segment.included).some(segment => findNouns(segment.text)
      .some(hit => hit.strong && (hit.cls === 'ACCESSORY' || hit.cls === 'SYSTEM')));
    if (chassis && !conflictingHead) return withCrumb('CASE', 0.85, 'Case head with motherboard form factor or multi-fan gaming chassis evidence');
  }
  let weakHit: NounHit | undefined;
  for (const seg of headSegments) {
    const hits = findNouns(seg.text);
    const strong = hits.filter((h) => h.strong);
    if (strong.length === 0) {
      if (!weakHit) weakHit = hits[hits.length - 1];
      continue;
    }
    const system = strong.find((h) => h.cls === 'SYSTEM');
    if (system) {
      return fromClass('SYSTEM', 0.92, `Title describes a ${system.text.trim()}`);
    }
    const parts = strong.filter((h) => h.cls !== 'ACCESSORY');
    const accessories = strong.filter((h) => h.cls === 'ACCESSORY');
    // A part noun backed by a model signal ("Processor" + "Ryzen 5 5600") is the most reliable head.
    const segmentSignals = modelSignals(seg.text);
    const backed = [...parts].reverse().find((h) => segmentSignals.has(h.cls as PartCategory));
    if (accessories.length > 0) {
      if (seg === headSegments[0] && strong[0].cls === 'ACCESSORY') {
        return fromClass('ACCESSORY', 0.9, `Title sells an accessory (${strong[0].text.trim()})`);
      }
      // Model-first cooling products can put their sold noun in a later comma clause,
      // e.g. "RX 9070 XT Nitro+, GPU Water Cooler ... AMD Radeon". Their chipset is
      // the compatibility target, not evidence that a complete card comes in the box.
      // A real graphics-card head is resolved before its later "with water block" clause.
      const gpuCooling = accessories.find(h => /(?:gpu|vga|graphics\s+card|video\s+card)\s+(?:(?:water|liquid|air)\s+)?(?:coolers?|cooling|water\s*blocks?)|full[\s-]?cover(?:\s+(?:copper|nickel|gpu))?\s+(?:water\s*)?blocks?|water\s*blocks?/.test(h.text));
      if (gpuCooling && !seg.included) return fromClass('ACCESSORY', 0.9, `Title sells GPU cooling hardware (${gpuCooling.text.trim()})`);
      const replacement = accessories.find(h => /\b(?:replacement|spare)\b/.test(h.text));
      if (replacement && !seg.included) return fromClass('ACCESSORY', 0.9, `Title sells replacement hardware (${replacement.text.trim()})`);
      // "GPU Holder Graphics Card Support", "Motherboard Power Extension Cable": accessory,
      // unless the part noun is backed by real model details ("850W 80+ Gold PSU 12VHPWR Cable").
      if (backed) return withCrumb(backed.cls as PartCategory, 0.85, `Title names a ${backed.text.trim()} with matching specs`);
      // A later sold accessory must not borrow a printed model. Only an explicit
      // inclusion clause can be secondary to independently named CPU/GPU evidence.
      const majorSignals = [...primarySignals].filter((c) => c === 'GPU' || c === 'CPU');
      if (seg.included && parts.length === 0 && majorSignals.length === 1 && primarySignals.size === 1) {
        return withCrumb(majorSignals[0] as PartCategory, 0.8, `Title has ${majorSignals[0]} model details; the accessory comes in the box`);
      }
      const acc = accessories[accessories.length - 1];
      return fromClass('ACCESSORY', 0.9, `Title describes an accessory (${acc.text.trim()})`);
    }
    const head = backed ?? parts[parts.length - 1];
    // A CPU may name its included cooler. An actual cooler head followed by a bare
    // compatible CPU model remains a cooler; model presence alone is not inclusion.
    const knownBoxCooler = /\b(?:wraith(?:\s+(?:stealth|spire|prism))?|(?:intel\s+)?laminar(?:\s+(?:rm1|rh1|rs1))?|box(?:ed)?|stock)\s+cooler\b/.test(seg.text)
      && modelSignals([
        ...headSegments.slice(0, headSegments.indexOf(seg)).filter(s => !s.included).map(s => s.text),
        seg.text.slice(0, head.start),
      ].join(' , ')).has('CPU');
    if (!backed && head.cls === 'CPU_COOLER' && primarySignals.has('CPU') && (seg.included || knownBoxCooler)) {
      return withCrumb('CPU', 0.85, 'Title has CPU model details and names the bundled cooler');
    }
    // "Raspberry Pi 27W Power Supply", "PanaCast 50 Power Supply": a power brick, not a PC PSU,
    // unless something says PC (ATX/SFX, 300 to 1999 W even without the "W", 80 PLUS, modular, desktop/PC/gaming).
    if (!backed && head.cls === 'POWER_SUPPLY' && !/(?<![a-z])(?:atx|sfx|modular|desktop|pc|computer|gaming|80\s*(?:\+|plus))(?![a-z])|(?<![0-9.])(?:[3-9]\d{2}|1\d{3})(?:\s*w)?(?![0-9])/.test(title.toLowerCase())) {
      return fromClass('ACCESSORY', 0.85, 'A power supply for a device, not a PC power supply');
    }
    // "Ryzen 9 9950X ... Windows 11 64-bit": the OS is what it supports, the model is the part.
    const modelParts = [...signals].filter((c): c is PartCategory => c !== 'SYSTEM');
    if (!backed && head.cls === 'OS' && modelParts.length === 1) {
      return withCrumb(modelParts[0], 0.85, `Title has ${modelParts[0]} model details and only mentions an OS`);
    }
    return withCrumb(head.cls as PartCategory, 0.92, `Title names a ${head.text.trim()}`);
  }

  // 3. Model signals without a noun.
  const partSignals = [...primarySignals].filter((s): s is PartCategory => s !== 'SYSTEM');
  if (partSignals.length === 1) {
    const cat = partSignals[0];
    if (crumb && (crumb.cls === 'SYSTEM' || crumb.cls === 'ACCESSORY')) {
      return fromClass(crumb.cls, 0.75, `Breadcrumb "${crumb.crumb}" is not a PC part`);
    }
    return withCrumb(cat, 0.85, `Title has ${cat} model details`);
  }

  // 4. Weak nouns ("... Fan", "... Case", "... AIO").
  if (weakHit && partSignals.length === 0) {
    if (weakHit.cls === 'ACCESSORY' || weakHit.cls === 'SYSTEM') {
      return fromClass(weakHit.cls, 0.7, `Title describes a ${weakHit.text.trim()}`);
    }
    if (!crumb || crumb.cls === weakHit.cls) {
      return withCrumb(weakHit.cls as PartCategory, 0.65, `Title mentions ${weakHit.text.trim()}`);
    }
  }

  // 5. Breadcrumbs.
  if (crumb) {
    return fromClass(crumb.cls, crumb.cls === 'SYSTEM' || crumb.cls === 'ACCESSORY' ? 0.85 : 0.8, `Breadcrumb "${crumb.crumb}"`);
  }

  // 6. Spec sheet shape.
  if (specsLookLikeSystem(specs)) {
    return result('OTHER', 0.75, 'system', 'Spec sheet lists a screen and an operating system or battery');
  }

  // 7. Caller hint.
  if (hint && partSignals.length === 0) {
    return result(hint, 0.55, hint === 'OTHER' ? 'unknown' : 'part', 'Category hint from the listing');
  }

  return result('OTHER', 0.3, 'unknown', 'No PC part evidence found');
}

/** Just the category. */
export function categorize(input: ProductInput): PartCategory {
  return categorizeProduct(input).category;
}

/**
 * Check a parsed product's store category against its title. Store category trees misfile things
 * (a noon prebuilt PC under processors, a GPU water block under CPU coolers), and search listings
 * often carry no category at all.
 *  - a confident whole computer or accessory becomes OTHER, whatever the store said;
 *  - a missing or OTHER category takes a confident part verdict from the title.
 */
export function reconcileCategory<T extends ProductInput & { category?: PartCategory }>(product: T): T & { category?: PartCategory } {
  if (!product?.title) return product;
  let r: CategoryResult;
  try {
    r = categorizeProduct(product);
  } catch {
    return product;
  }
  if ((r.kind === 'system' || r.kind === 'accessory') && r.confidence >= 0.85) {
    return product.category === 'OTHER' ? product : { ...product, category: 'OTHER' };
  }
  if ((!product.category || product.category === 'OTHER') && r.kind === 'part' && r.confidence >= 0.8) {
    return { ...product, category: r.category };
  }
  return product;
}

/** The categories the compatibility checker understands. */
export const BUILD_PART_CATEGORIES: readonly PartCategory[] = [
  'CPU',
  'CPU_COOLER',
  'GPU',
  'MOTHERBOARD',
  'RAM',
  'STORAGE',
  'CASE',
  'POWER_SUPPLY',
];

export function isBuildPart(category: PartCategory): boolean {
  return BUILD_PART_CATEGORIES.includes(category);
}
