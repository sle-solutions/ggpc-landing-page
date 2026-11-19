/**
 * Brand dictionary with the spellings UAE retailers actually use
 * ("GIGABYTE", "Aorus", "G.SKILL", "WD_BLACK", "be quiet!", "TEAMGROUP"...).
 */
import { lower } from './text';

interface BrandDef {
  name: string;
  /** Regex sources matched against lowercased, cleaned text. */
  aliases: string[];
  /** Chip makers: only used for a GPU when no card maker is named. */
  chipMaker?: boolean;
}

const BRANDS: BrandDef[] = [
  // Order matters only for overlapping aliases; longer/more specific first.
  { name: 'Cooler Master', aliases: ['cooler\\s*master', 'coolermaster'] },
  { name: 'be quiet!', aliases: ['be\\s*quiet!?', 'bequiet'] },
  { name: 'Fractal Design', aliases: ['fractal\\s*design', 'fractal'] },
  { name: 'Lian Li', aliases: ['lian[\\s-]?li'] },
  { name: 'Super Flower', aliases: ['super\\s*flower'] },
  { name: 'Silicon Power', aliases: ['silicon\\s*power'] },
  { name: 'SK hynix', aliases: ['sk\\s*hynix', 'hynix'] },
  { name: 'Western Digital', aliases: ['western\\s*digital', 'wd_black', 'wd\\s*black', 'wd\\s*blue', 'wd\\s*red', 'wd\\s*green', 'wd'] },
  { name: 'ID-COOLING', aliases: ['id[\\s-]?cooling'] },
  { name: 'G.Skill', aliases: ['g\\.?\\s?skill'] },
  { name: 'TeamGroup', aliases: ['team\\s*group', 'teamgroup', 't-?force'] },
  { name: 'ADATA', aliases: ['adata', 'xpg'] },
  { name: 'Gigabyte', aliases: ['gigabyte'] },
  { name: 'ASUS', aliases: ['asus', 'republic\\s+of\\s+gamers'] },
  { name: 'MSI', aliases: ['msi', 'micro-star'] },
  { name: 'ASRock', aliases: ['asrock'] },
  { name: 'Biostar', aliases: ['biostar'] },
  { name: 'Zotac', aliases: ['zotac'] },
  { name: 'Palit', aliases: ['palit'] },
  { name: 'PNY', aliases: ['pny'] },
  { name: 'Inno3D', aliases: ['inno3d', 'inno\\s3d'] },
  { name: 'Gainward', aliases: ['gainward'] },
  { name: 'Galax', aliases: ['galax', 'kfa2'] },
  { name: 'Colorful', aliases: ['colorful'] },
  { name: 'Sapphire', aliases: ['sapphire'] },
  { name: 'PowerColor', aliases: ['power\\s*color'] },
  { name: 'XFX', aliases: ['xfx'] },
  { name: 'Sparkle', aliases: ['sparkle'] },
  { name: 'Maxsun', aliases: ['maxsun'] },
  { name: 'EVGA', aliases: ['evga'] },
  { name: 'Corsair', aliases: ['corsair'] },
  { name: 'Kingston', aliases: ['kingston'] },
  { name: 'Crucial', aliases: ['crucial'] },
  { name: 'Patriot', aliases: ['patriot'] },
  { name: 'Lexar', aliases: ['lexar'] },
  { name: 'Netac', aliases: ['netac'] },
  { name: 'Samsung', aliases: ['samsung'] },
  { name: 'SanDisk', aliases: ['sandisk'] },
  { name: 'Seagate', aliases: ['seagate'] },
  { name: 'Toshiba', aliases: ['toshiba'] },
  { name: 'Kioxia', aliases: ['kioxia'] },
  { name: 'Solidigm', aliases: ['solidigm'] },
  { name: 'Sabrent', aliases: ['sabrent'] },
  { name: 'Hikvision', aliases: ['hikvision', 'hiksemi'] },
  { name: 'Seasonic', aliases: ['sea\\s*sonic'] },
  { name: 'Thermaltake', aliases: ['thermaltake'] },
  { name: 'Thermalright', aliases: ['thermalright'] },
  { name: 'NZXT', aliases: ['nzxt'] },
  { name: 'Phanteks', aliases: ['phanteks'] },
  { name: 'HYTE', aliases: ['hyte'] },
  { name: 'Montech', aliases: ['montech'] },
  { name: 'DeepCool', aliases: ['deep\\s*cool'] },
  { name: 'Arctic', aliases: ['arctic'] },
  { name: 'Noctua', aliases: ['noctua'] },
  { name: 'Antec', aliases: ['antec'] },
  { name: 'FSP', aliases: ['fsp'] },
  { name: 'SilverStone', aliases: ['silver\\s*stone'] },
  { name: 'Jonsbo', aliases: ['jonsbo'] },
  { name: 'Darkflash', aliases: ['darkflash'] },
  { name: '1stPlayer', aliases: ['1st\\s*player'] },
  { name: 'Aerocool', aliases: ['aerocool'] },
  { name: 'Gamdias', aliases: ['gamdias'] },
  { name: 'Xigmatek', aliases: ['xigmatek'] },
  { name: 'Cougar', aliases: ['cougar'] },
  { name: 'Enermax', aliases: ['enermax'] },
  { name: 'Scythe', aliases: ['scythe'] },
  { name: 'Zalman', aliases: ['zalman'] },
  { name: 'Alienware', aliases: ['alienware'] },
  { name: 'Dell', aliases: ['dell'] },
  { name: 'LG', aliases: ['lg'] },
  { name: 'AOC', aliases: ['aoc'] },
  { name: 'BenQ', aliases: ['benq'] },
  { name: 'ViewSonic', aliases: ['viewsonic'] },
  { name: 'Acer', aliases: ['acer'] },
  { name: 'Philips', aliases: ['philips'] },
  { name: 'HP', aliases: ['hp'] },
  { name: 'Lenovo', aliases: ['lenovo'] },
  { name: 'Microsoft', aliases: ['microsoft'] },
  { name: 'NVIDIA', aliases: ['nvidia'], chipMaker: true },
  { name: 'AMD', aliases: ['amd'], chipMaker: true },
  { name: 'Intel', aliases: ['intel'], chipMaker: true },
];

const COMPILED = BRANDS.map((b) => ({
  ...b,
  re: new RegExp(`(?:^|[^a-z0-9])(?:${b.aliases.join('|')})(?![a-z0-9])`, 'i'),
}));

/** Canonical brand for a free-text brand field ("GIGABYTE", "Visit the ASUS Store"). */
export function canonicalBrand(raw: string | undefined | null): string | undefined {
  const text = lower(raw).replace(/^visit the\s+/, '').replace(/\s+store$/, '');
  if (!text) return undefined;
  for (const b of COMPILED) if (b.re.test(text)) return b.name;
  // Unknown brand: keep it, nicely cased, so equality checks still work.
  const cleaned = text.replace(/[^a-z0-9.!& -]/g, '').trim();
  if (!cleaned || cleaned === 'generic' || cleaned === 'unbranded') return undefined;
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface BrandHit {
  name: string;
  index: number;
  chipMaker: boolean;
}

/** Every known brand mentioned in `text`, in order of first appearance. */
export function findBrands(text: string): BrandHit[] {
  const t = lower(text);
  const hits: BrandHit[] = [];
  for (const b of COMPILED) {
    const m = b.re.exec(t);
    if (m) {
      const offset = m[0].length - m[0].replace(/^[^a-z0-9]/i, '').length;
      hits.push({ name: b.name, index: m.index + offset, chipMaker: !!b.chipMaker });
    }
  }
  return hits.sort((a, b) => a.index - b.index);
}

/**
 * Brand of the product (the card maker for GPUs, not NVIDIA/AMD).
 * Prefers the explicit brand field, then the first non chip maker in the title.
 */
/** Sub-brands that imply a maker but are part of the model name, so they are never stripped. */
const IMPLIED_BRANDS: Array<{ name: string; re: RegExp }> = [
  { name: 'ASUS', re: /(?<![a-z0-9])(?:rog|tuf\s+gaming|proart)(?![a-z0-9])/i },
  { name: 'Gigabyte', re: /(?<![a-z0-9])aorus(?![a-z0-9])/i },
];

export function detectBrand(title: string, brandField?: string, preferChipMaker = false): string | undefined {
  const fromField = canonicalBrand(brandField);
  const hits = findBrands(title);
  if (!hits.some((h) => !h.chipMaker)) {
    const implied = IMPLIED_BRANDS.find((b) => b.re.test(lower(title)));
    if (implied) hits.push({ name: implied.name, index: lower(title).search(implied.re), chipMaker: false });
    hits.sort((a, b) => a.index - b.index);
  }
  if (fromField) {
    const isChip = COMPILED.find((b) => b.name === fromField)?.chipMaker;
    // Amazon sometimes lists "NVIDIA" or "AMD" as brand on partner cards. Prefer a partner in the title.
    if (isChip && !preferChipMaker) {
      const partner = hits.find((h) => !h.chipMaker);
      if (partner) return partner.name;
    }
    return fromField;
  }
  if (hits.length === 0) return undefined;
  if (preferChipMaker) return (hits.find((h) => h.chipMaker) ?? hits[0]).name;
  return (hits.find((h) => !h.chipMaker) ?? hits[0]).name;
}

/** Remove brand words from text (used before noun detection, e.g. "Cooler Master" is not a cooler noun). */
export function stripBrandWords(text: string): string {
  let t = lower(text);
  for (const b of COMPILED) {
    if (b.chipMaker) continue;
    t = t.replace(new RegExp(`(^|[^a-z0-9])(?:${b.aliases.join('|')})(?![a-z0-9])`, 'gi'), '$1 ');
  }
  return t.replace(/\s+/g, ' ').trim();
}

export function isChipMaker(brand: string | undefined): boolean {
  return !!brand && !!COMPILED.find((b) => b.name === brand)?.chipMaker;
}
