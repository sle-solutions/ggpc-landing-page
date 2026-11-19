/**
 * A category guess is not permission to treat a retailer product as a PC part.
 * This pure policy is shared by the page reader, worker and API write boundaries.
 */
import { BUILD_PART_CATEGORIES, categorizeProduct, titleSegments } from './categorize';
import { detectBrand } from './brands';
import { parseCpuModel, parseGpuChipset } from './parsers';
import type { PartCategory, ProductInput } from './types';

export interface ProductEligibility {
  supported: boolean;
  category: PartCategory;
  reason: string;
}

const SUPPORTED = new Set<PartCategory>([...BUILD_PART_CATEGORIES, 'MONITOR', 'OS']);
const rejected = (reason: string): ProductEligibility => ({ supported: false, category: 'OTHER', reason });

const COOLING_BRANDS = new Set(['Cooler Master', 'be quiet!', 'Thermalright', 'ID-COOLING', 'Noctua', 'Arctic', 'DeepCool', 'NZXT', 'Corsair', 'Thermaltake']);
const CASE_BRANDS = new Set(['Fractal Design', 'Lian Li', 'NZXT', 'Corsair', 'Phanteks', 'HYTE', 'Montech', 'Antec', 'SilverStone', 'Cooler Master', 'Thermaltake']);
const PSU_BRANDS = new Set(['Corsair', 'Seasonic', 'Super Flower', 'FSP', 'be quiet!', 'Cooler Master', 'Thermaltake', 'EVGA', 'SilverStone', 'Antec']);
const MONITOR_BRANDS = new Set(['Dell', 'ASUS', 'AOC', 'ViewSonic', 'Acer', 'BenQ', 'MSI', 'Gigabyte']);

/** Generic nouns also describe kitchen appliances, vehicle chassis and medical monitors. */
function hasPcContext(category: PartCategory, title: string): boolean {
  const t = title.toLowerCase();
  const segments = titleSegments(title);
  const headSegments = segments.filter(segment => !segment.target);
  const head = headSegments.map(segment => segment.text).join(' ');
  const brand = detectBrand(title) ?? '';
  switch (category) {
    case 'CPU': {
      const model = parseCpuModel(head);
      // Reuse the complete model-token grammar, including coalesced i512400F; a partial i5 is not proof.
      if (model && !model.mobile) return true;
      const omittedCore = /\bintel\b/.test(t) && /\bultra\s+[3579]\b/.test(head) &&
        /\b(?:processor|cpu)\b/.test(head) && /\b\d{3}(?:k|kf|f|t)\b/.test(head);
      return omittedCore || /\b(?:desktop|computer|cpu|ryzen|threadripper|xeon|celeron|pentium|athlon|epyc|core\s+ultra)\b/.test(head);
    }
    case 'CPU_COOLER': {
      // An explicit CPU cooler may display GPU temperatures. Ignore that auxiliary feature
      // only in secondary non-target clauses; the sold head, GPU models and all targets remain.
      const cpuHead = /\b(?:cpu|processor)\s+(?:(?:air|liquid|water|aio)\s+){0,2}cool(?:er|ing)\b/.test(headSegments[0]?.text ?? '');
      const gpuContext = cpuHead ? segments.map(segment => segment.target || segment === headSegments[0] ? segment.text
        : segment.text.replace(/\bgpu\s+(?:temperature\s+)?(?:display|monitor(?:ing)?)\b/g, ' ')).join(' ') : t;
      if (parseGpuChipset(gpuContext) || /\b(?:gpu|graphics\s+card|geforce|radeon|intel\s+arc)\b/.test(gpuContext)) return false;
      // A radiator/pump loop plus explicit Intel AND AMD compatibility is CPU AIO evidence.
      // Vendor words alone, or a loop intended for GPUs, cannot authorize a cooler.
      const cpuLoop = /\b(?:liquid|water)\s+cooler\b/.test(head) &&
        /\b(?:120|140|240|280|360|420)\s*mm\s+radiator\b/.test(head) && /\bpump\b/.test(head) &&
        /\bintel\b/.test(t) && /\bamd\b/.test(t);
      const compatibleCpu = parseCpuModel(t);
      return /\b(?:cpu|processor|aio|lga\s*\d+|am[345]|socket|heatsink|heat[ -]?pipes?)\b/.test(t) || COOLING_BRANDS.has(brand) || cpuLoop || !!(compatibleCpu && !compatibleCpu.mobile);
    }
    case 'CASE': return /\b(?:pc|computer|gaming|gamer|desktop|[em]?atx|micro[ -]?atx|mini[ -]?itx|itx|tower)\b/.test(head) || CASE_BRANDS.has(brand);
    case 'POWER_SUPPLY': {
      // These makers also sell other hardware: require both a desktop wattage and a real model token.
      const ratedModel = /^\s*(?:gigabyte|in[ -]?win)\b/i.test(title) && /\b(?:[3-9]\d{2}|1\d{3})\s*w\b/.test(head) &&
        /\b(?:[a-z]{1,4}-[a-z]*\d+[a-z]+|[a-z]\d{2,4}[a-z]+)\b/.test(head);
      if (/\b(?:industrial|cctv|din[ -]?rail)\b/.test(head)) return false;
      // Switching is a topology, not a device identity. Only a form factor in the sold PSU
      // head can establish this exception; compatibility clauses and included adapters cannot.
      if (/\bswitching\b/.test(head) && !/\b(?:atx|sfx)\b/.test(headSegments[0]?.text ?? '')) return false;
      return /\b(?:pc|computer|gaming|desktop|atx|sfx|modular)\b|\b80\s*(?:plus\b|\+(?=\b|\s|$))/.test(t) || PSU_BRANDS.has(brand) || ratedModel;
    }
    case 'MONITOR': return /\b(?:gaming|display|lcd|oled|ips|qhd|uhd|fhd|\d{2,3}\s*(?:inch|hz)|\d{3,4}\s*[x×]\s*\d{3,4})\b|\d{2,3}\s*["”]/.test(t) || MONITOR_BRANDS.has(brand);
    default: return true;
  }
}

/** Specific Arabic component nouns, matching the English categories used by the shared classifier. */
function classificationTitle(title: string): string {
  return title
    .replace(/[®™]/g, ' ')
    .replace(/رايزن/g, ' Ryzen ')
    .replace(/كور\s+(?=i[3579]|الترا|Ultra)/gi, ' Core ')
    .replace(/(?:بطاقة|بطاقات)\s+(?:ال)?رسومات/g, ' graphics card ')
    .replace(/(?:اللوحة|لوحة|اللوحات)\s+الأم/g, ' motherboard ')
    .replace(/(?:وحدة|وحدات)\s+المعالجة\s+المركزية|\bCPU\b/gi, ' CPU ')
    .replace(/معالج(?:ات)?/g, ' processor ')
    .replace(/(?:مزود|وحدة\s+(?:إمداد|امداد|تزويد))\s+(?:ال)?طاقة/g, ' PC power supply ')
    .replace(/(?:صندوق|صناديق|هيكل|هياكل)\s+الكمبيوتر/g, ' PC case ')
    .replace(/مبرد\s+(?:المعالج|وحدة\s+المعالجة)/g, ' CPU cooler ')
    .replace(/ذاكرة\s+(?:الوصول\s+العشوائي|الكمبيوتر)/g, ' RAM ');
}

/**
 * Require confident product evidence. Parser/DB category hints and breadcrumbs alone cannot
 * turn an unrelated listing into a supported part. Invalid runtime messages fail closed.
 */
export function productEligibility(input: ProductInput | unknown): ProductEligibility {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return rejected('No readable PC product');
  const raw = input as Partial<ProductInput>;
  try {
    if (typeof raw.title !== 'string' || !raw.title.trim() || raw.title.length > 2000) {
      return rejected('No readable PC product title');
    }
    const title = classificationTitle(raw.title);
    // A real chipset/model can be printed on merchandise or sold as a service.
    // Ignore a clearly included free gift, while classifying the item actually sold.
    const soldTitle = title.split(/\b(?:includes?|including|comes\s+with|bundled\s+with|with\s+(?:a\s+)?(?:free|complimentary))\b/i)[0];
    if (/\b(?:key\s*chains?|key\s*rings?|posters?|stickers?|decals?|paperbacks?|hardcovers?|books?|magazines?|t[ -]?shirts?|hoodies?|mugs?|(?:extended\s+)?warranty\s+(?:protection\s+)?plans?|protection\s+plans?|(?:installation|assembly|repair)\s+services?)\b/i.test(soldTitle)) {
      return rejected('This listing sells merchandise, a publication or a service, not a PC part');
    }
    // Ignore category and breadcrumb hints here. They are useful for display/normalization,
    // but a retailer's misfiled category cannot authorize a comparison or catalog write.
    const verdict = categorizeProduct({
      title,
      brand: typeof raw.brand === 'string' ? raw.brand : undefined,
      mpn: typeof raw.mpn === 'string' ? raw.mpn : undefined,
      specs: raw.specs && typeof raw.specs === 'object' && !Array.isArray(raw.specs) ? raw.specs : undefined,
    });
    if (verdict.kind !== 'part' || !SUPPORTED.has(verdict.category) || verdict.confidence < 0.8) {
      return rejected(verdict.reason);
    }
    if (!hasPcContext(verdict.category, soldTitle)) return rejected('The product does not provide enough PC component evidence');
    return { supported: true, category: verdict.category, reason: verdict.reason };
  } catch {
    return rejected('Could not verify that this is a supported PC part');
  }
}

export function isSupportedPcProduct(input: ProductInput | unknown): boolean {
  return productEligibility(input).supported;
}
