/**
 * Build compatibility checker.
 *
 *   checkBuild(parts: NormalizedPart[]) -> { status, issues, estimatedWattage, recommendedPsuWattage }
 *
 * Rules are written for first-time builders: plain English, a short
 * explanation for every term, and no false alarms. When data is missing we
 * say "couldn't verify" (severity 'info') instead of guessing an error.
 *
 * Power estimate: CPU TDP + GPU board power + 100 W for the rest of the
 * platform (board, RAM, drives, fans). Recommended PSU = 1.4x the estimate,
 * rounded up to a common PSU size, and never below the GPU maker's
 * recommendation.
 */
import { COOLER_MOUNT_EQUIVALENT, lookupChipset } from './knowledge';
import { roundUpPsu } from './text';
import {
  BOARD_SIZE_ORDER,
  type BoardFormFactor,
  type CasePart,
  type CoolerPart,
  type CpuPart,
  type GpuPart,
  type MotherboardPart,
  type NormalizedPart,
  type PartCategory,
  type PartOf,
  type PsuPart,
  type RamPart,
  type StoragePart,
} from './types';

export type IssueSeverity = 'error' | 'warning' | 'info';

export type IssueCode =
  | 'cpu_socket_mismatch'
  | 'cpu_socket_unverified'
  | 'ram_type_mismatch'
  | 'ram_type_unverified'
  | 'ram_laptop_modules'
  | 'ram_too_many_sticks'
  | 'ram_four_sticks_ddr5'
  | 'psu_too_weak'
  | 'psu_tight'
  | 'psu_below_gpu_recommendation'
  | 'psu_unverified'
  | 'power_estimate_incomplete'
  | 'gpu_too_long'
  | 'gpu_tight_fit'
  | 'gpu_length_unverified'
  | 'board_too_big_for_case'
  | 'board_case_unverified'
  | 'back_connect_board'
  | 'cooler_socket_unsupported'
  | 'cooler_socket_mount_check'
  | 'cooler_socket_unverified'
  | 'cooler_too_tall'
  | 'cooler_height_unverified'
  | 'cooler_fit_unverified'
  | 'radiator_too_big'
  | 'radiator_size_unverified'
  | 'cooler_tdp_low'
  | 'cpu_needs_cooler'
  | 'cpu_needs_gpu'
  | 'laptop_cpu'
  | 'bios_update_note'
  | 'gpu_16pin_adapter'
  | 'm2_slots_exceeded';

export interface Issue {
  code: IssueCode;
  severity: IssueSeverity;
  /** Categories involved, for highlighting part cards. */
  parts: PartCategory[];
  /** Short headline. */
  title: string;
  /** Friendly explanation with what to do next. */
  message: string;
}

export type BuildStatus = 'ok' | 'warning' | 'error';

export interface BuildCheckResult {
  /** 'error' if any error, else 'warning' if any warning, else 'ok'. Info notes never change the status. */
  status: BuildStatus;
  /** Errors first, then warnings, then info. */
  issues: Issue[];
  /** Estimated peak draw in watts (0 when the build is empty). */
  estimatedWattage: number;
  /** Suggested PSU size in watts (0 when the build is empty). */
  recommendedPsuWattage: number;
}

export const PLATFORM_OVERHEAD_W = 100;
export const PSU_HEADROOM = 1.4;
/** Below this multiple of the estimate we warn that the PSU is tight. */
const PSU_TIGHT_RATIO = 1.25;
/** GPU within this many mm of the case limit is a tight fit. */
const GPU_TIGHT_MM = 10;

const SIZE_NAMES: Record<BoardFormFactor, string> = {
  'E-ATX': 'E-ATX',
  ATX: 'ATX',
  mATX: 'Micro-ATX',
  ITX: 'Mini-ITX',
};

function all<C extends PartCategory>(parts: NormalizedPart[], category: C): PartOf<C>[] {
  return parts.filter((p): p is PartOf<C> => p.category === category);
}

function first<C extends PartCategory>(parts: NormalizedPart[], category: C): PartOf<C> | undefined {
  return all(parts, category)[0];
}

const qty = (p: NormalizedPart) => Math.max(1, p.quantity ?? 1);

function listWords(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;
}

function issue(code: IssueCode, severity: IssueSeverity, parts: PartCategory[], title: string, message: string): Issue {
  return { code, severity, parts, title, message };
}

// ---------------------------------------------------------------------------
// Power
// ---------------------------------------------------------------------------

export interface PowerEstimate {
  estimatedWattage: number;
  recommendedPsuWattage: number;
  /** False when the CPU or a GPU had no known power figure. The estimate is then a lower bound. */
  complete: boolean;
  /** Highest GPU maker PSU recommendation in the build, if any. */
  gpuRecommendedPsuW?: number;
}

export function estimatePower(parts: NormalizedPart[]): PowerEstimate {
  if (parts.length === 0) return { estimatedWattage: 0, recommendedPsuWattage: 0, complete: true };
  let complete = true;
  let total = PLATFORM_OVERHEAD_W;
  const cpu = first(parts, 'CPU');
  if (cpu) {
    if (cpu.specs.tdpW) total += cpu.specs.tdpW;
    else complete = false;
  }
  let gpuRec: number | undefined;
  for (const gpu of all(parts, 'GPU')) {
    if (gpu.specs.boardPowerW) total += gpu.specs.boardPowerW * qty(gpu);
    else complete = false;
    if (gpu.specs.recommendedPsuW) gpuRec = Math.max(gpuRec ?? 0, gpu.specs.recommendedPsuW);
  }
  const recommended = Math.max(roundUpPsu(total * PSU_HEADROOM), gpuRec ?? 0);
  return { estimatedWattage: Math.round(total), recommendedPsuWattage: recommended, complete, gpuRecommendedPsuW: gpuRec };
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

function checkSocket(cpu: CpuPart | undefined, mb: MotherboardPart | undefined, out: Issue[]) {
  if (!cpu || !mb) return;
  const cs = cpu.specs.socket;
  const ms = mb.specs.socket;
  if (cs && ms) {
    if (cs !== ms) {
      out.push(
        issue(
          'cpu_socket_mismatch',
          'error',
          ['CPU', 'MOTHERBOARD'],
          "CPU won't fit this motherboard",
          `The ${cpu.displayName} uses the ${cs} socket, but this motherboard has a ${ms} socket. The socket is the slot the processor sits in, and the two must match. Pick a ${cs} motherboard, or a processor made for ${ms}.`
        )
      );
    }
    return;
  }
  const missing = !cs && !ms ? 'the CPU or the motherboard' : !cs ? 'the CPU' : 'the motherboard';
  out.push(
    issue(
      'cpu_socket_unverified',
      'info',
      ['CPU', 'MOTHERBOARD'],
      "Couldn't confirm the CPU fits the motherboard",
      `We couldn't find the socket type for ${missing}. Before buying, check that both list the same socket (for example AM5 or LGA1700).`
    )
  );
}

function checkMemory(mb: MotherboardPart | undefined, rams: RamPart[], out: Issue[]) {
  for (const ram of rams) {
    if (ram.specs.formFactor === 'SODIMM') {
      out.push(
        issue(
          'ram_laptop_modules',
          'error',
          ['RAM'],
          'This is laptop memory',
          `${ram.displayName} uses SO-DIMM sticks, the small size made for laptops. Desktop motherboards need full size DIMM sticks. Look for a kit labelled desktop memory.`
        )
      );
    }
  }
  if (!mb || rams.length === 0) return;
  const boardType = mb.specs.memoryType;
  for (const ram of rams) {
    const ramType = ram.specs.memoryType;
    if (boardType && ramType) {
      if (boardType !== ramType) {
        out.push(
          issue(
            'ram_type_mismatch',
            'error',
            ['RAM', 'MOTHERBOARD'],
            "Memory type doesn't match the motherboard",
            `This motherboard takes ${boardType} memory, but ${ram.displayName} is ${ramType}. The notch in the stick is in a different place for each type, so ${ramType} physically won't go into ${boardType} slots. Choose a ${boardType} kit.`
          )
        );
      }
    } else {
      const lga1700 = lookupChipset(mb.specs.chipset)?.memory.length === 2;
      out.push(
        issue(
          'ram_type_unverified',
          'info',
          ['RAM', 'MOTHERBOARD'],
          "Couldn't confirm the memory type",
          lga1700 && !boardType
            ? `${mb.specs.chipset} motherboards come in DDR4 and DDR5 versions, and this listing doesn't say which one it is. Check the model name or spec sheet (a "D4" or "DDR4" in the name means DDR4) and buy matching RAM.`
            : `We couldn't find whether ${!ramType ? 'the RAM' : 'the motherboard'} is DDR4 or DDR5. Both parts must use the same type, so check the listings before buying.`
        )
      );
    }
  }

  // Stick count vs slots.
  const sticks = rams.reduce((n, r) => n + (r.specs.modules ?? 0) * qty(r), 0);
  const allKnown = rams.every((r) => r.specs.modules);
  const slots = mb.specs.memorySlots;
  if (slots && sticks > slots && allKnown) {
    out.push(
      issue(
        'ram_too_many_sticks',
        mb.specs.memorySlotsInferred ? 'warning' : 'error',
        ['RAM', 'MOTHERBOARD'],
        'Too many memory sticks for this motherboard',
        `Your RAM adds up to ${sticks} sticks, but this motherboard ${mb.specs.memorySlotsInferred ? 'most likely ' : ''}has ${slots} memory slots. Choose a kit with fewer, larger sticks, for example 2x32GB instead of 4x16GB.`
      )
    );
  } else if (sticks >= 4 && (boardType === 'DDR5' || rams.some((r) => r.specs.memoryType === 'DDR5'))) {
    out.push(
      issue(
        'ram_four_sticks_ddr5',
        'info',
        ['RAM', 'MOTHERBOARD'],
        'Four sticks of DDR5 may run slower',
        'Filling all four slots with DDR5 often forces the memory to run below its advertised speed. Two larger sticks are usually faster and more stable for gaming.'
      )
    );
  }
}

function checkPower(parts: NormalizedPart[], psu: PsuPart | undefined, power: PowerEstimate, out: Issue[]) {
  if (!psu) return;
  const hasDraw = parts.some((p) => p.category === 'CPU' || p.category === 'GPU');
  if (!hasDraw) return;
  const watts = psu.specs.wattage;
  if (!watts) {
    out.push(
      issue(
        'psu_unverified',
        'info',
        ['POWER_SUPPLY'],
        "Couldn't check the power supply wattage",
        `We couldn't find the wattage of this power supply. We estimate the build needs about ${power.estimatedWattage}W at full load, so look for a unit of at least ${power.recommendedPsuWattage}W.`
      )
    );
    return;
  }
  const est = power.estimatedWattage;
  if (watts < est) {
    out.push(
      issue(
        'psu_too_weak',
        'error',
        ['POWER_SUPPLY', 'GPU', 'CPU'],
        'Power supply is too weak',
        `We estimate this build can draw about ${est}W, but the power supply is rated for ${watts}W. Under load, for example while gaming, the PC could shut off or crash. We recommend at least ${power.recommendedPsuWattage}W.`
      )
    );
  } else if (watts < est * PSU_TIGHT_RATIO) {
    out.push(
      issue(
        'psu_tight',
        'warning',
        ['POWER_SUPPLY'],
        'Power supply is cutting it close',
        `Your ${watts}W power supply covers the estimated ${est}W draw, but with little room to spare. A ${power.recommendedPsuWattage}W unit leaves headroom for short power spikes and future upgrades.`
      )
    );
  } else if (power.gpuRecommendedPsuW && watts < power.gpuRecommendedPsuW) {
    const gpu = all(parts, 'GPU').find((g) => g.specs.recommendedPsuW === power.gpuRecommendedPsuW);
    out.push(
      issue(
        'psu_below_gpu_recommendation',
        'warning',
        ['POWER_SUPPLY', 'GPU'],
        "Power supply is below the graphics card maker's advice",
        `${gpu?.specs.chipset ?? 'This graphics card'} makers recommend a ${power.gpuRecommendedPsuW}W or bigger power supply, and yours is ${watts}W. It may work, but a ${power.gpuRecommendedPsuW}W unit is the safer choice.`
      )
    );
  }
  if (!power.complete && watts >= est) {
    const missing = [
      first(parts, 'CPU') && !first(parts, 'CPU')!.specs.tdpW ? 'the CPU' : undefined,
      all(parts, 'GPU').some((g) => !g.specs.boardPowerW) ? 'the graphics card' : undefined,
    ].filter(Boolean) as string[];
    out.push(
      issue(
        'power_estimate_incomplete',
        'info',
        ['POWER_SUPPLY', ...(missing.includes('the CPU') ? (['CPU'] as PartCategory[]) : []), ...(missing.includes('the graphics card') ? (['GPU'] as PartCategory[]) : [])],
        "Couldn't fully check power needs",
        `We couldn't find how much power ${listWords(missing)} uses, so our ${est}W estimate may be low. Check the maker's recommended power supply size before buying.`
      )
    );
  }
}

function checkGpuFit(gpus: GpuPart[], pcCase: CasePart | undefined, out: Issue[]) {
  if (!pcCase) return;
  const max = pcCase.specs.maxGpuLengthMm;
  for (const gpu of gpus) {
    const len = gpu.specs.lengthMm;
    if (!len || !max) {
      out.push(
        issue(
          'gpu_length_unverified',
          'info',
          ['GPU', 'CASE'],
          "Couldn't confirm the graphics card fits the case",
          `We couldn't find ${!len ? "the graphics card's length" : "the case's maximum graphics card length"}. Compare the card length with the case's "GPU clearance" in the spec sheets before buying.`
        )
      );
      continue;
    }
    const approx = gpu.specs.lengthSource === 'dimensions';
    if (len > max) {
      out.push(
        approx
          ? issue(
              'gpu_too_long',
              'warning',
              ['GPU', 'CASE'],
              'Graphics card might not fit',
              `Based on the listed product size, the ${gpu.displayName} looks about ${len}mm long, more than this case's ${max}mm limit. Listing sizes sometimes include the packaging, so check the card's exact length before buying.`
            )
          : issue(
              'gpu_too_long',
              'error',
              ['GPU', 'CASE'],
              'Graphics card is too long for this case',
              `The ${gpu.displayName} is about ${len}mm long, but this case fits cards up to ${max}mm. Choose a shorter card or a case with more room.`
            )
      );
    } else if (max - len <= GPU_TIGHT_MM) {
      out.push(
        issue(
          'gpu_tight_fit',
          'warning',
          ['GPU', 'CASE'],
          'Graphics card is a tight fit',
          `The card (${len}mm) only just fits this case (up to ${max}mm). Fans or a radiator mounted at the front can take up some of that space, so check the case manual before buying.`
        )
      );
    }
  }
}

function checkBoardInCase(mb: MotherboardPart | undefined, pcCase: CasePart | undefined, out: Issue[]) {
  if (!mb || !pcCase) return;
  const ff = mb.specs.formFactor;
  const supported = pcCase.specs.supportedFormFactors;
  if (!ff || !supported || supported.length === 0) {
    out.push(
      issue(
        'board_case_unverified',
        'info',
        ['MOTHERBOARD', 'CASE'],
        "Couldn't confirm the motherboard fits the case",
        `We couldn't find ${!ff ? "the motherboard's size" : 'which motherboard sizes the case supports'}. Sizes from biggest to smallest are E-ATX, ATX, Micro-ATX and Mini-ITX, and a case lists the sizes it takes.`
      )
    );
  } else if (!supported.includes(ff)) {
    const biggest = supported.reduce((a, b) => (BOARD_SIZE_ORDER.indexOf(a) < BOARD_SIZE_ORDER.indexOf(b) ? a : b));
    const tooBig = BOARD_SIZE_ORDER.indexOf(ff) < BOARD_SIZE_ORDER.indexOf(biggest);
    const list = listWords(supported.map((s) => SIZE_NAMES[s]));
    const inferred = pcCase.specs.formFactorsInferred;
    out.push(
      issue(
        'board_too_big_for_case',
        inferred ? 'warning' : 'error',
        ['MOTHERBOARD', 'CASE'],
        tooBig ? 'Motherboard is too big for this case' : "Case doesn't list this motherboard size",
        `This is a ${SIZE_NAMES[ff]} motherboard, but the case ${inferred ? 'appears to support' : 'supports'} ${list}. ${tooBig ? `Pick a case that lists ${SIZE_NAMES[ff]} support, or a smaller motherboard.` : 'Check the case spec sheet before buying.'} (Sizes from biggest to smallest: E-ATX, ATX, Micro-ATX, Mini-ITX.)`
      )
    );
  }
  if (mb.specs.backConnect && !pcCase.specs.supportsBackConnect) {
    out.push(
      issue(
        'back_connect_board',
        'warning',
        ['MOTHERBOARD', 'CASE'],
        'This motherboard needs a special case',
        'This is a back-connect motherboard (sometimes called BTF or Project Zero), with its plugs on the back. It only fits cases with matching cut-outs, so make sure the case says it supports back-connect boards.'
      )
    );
  }
}

function coolerSupports(sockets: string[], socket: string): 'yes' | 'mount' | 'no' {
  if (sockets.includes(socket)) return 'yes';
  const equivalents = COOLER_MOUNT_EQUIVALENT[socket as keyof typeof COOLER_MOUNT_EQUIVALENT] ?? [];
  return equivalents.some((s) => sockets.includes(s)) ? 'mount' : 'no';
}

function checkCooler(cpu: CpuPart | undefined, cooler: CoolerPart | undefined, pcCase: CasePart | undefined, out: Issue[]) {
  if (cpu && !cooler && cpu.specs.boxedCooler === false && !cpu.specs.mobile) {
    out.push(
      issue(
        'cpu_needs_cooler',
        'info',
        ['CPU', 'CPU_COOLER'],
        "This CPU doesn't come with a cooler",
        `The ${cpu.displayName} is sold without a cooler in the box, so add a CPU cooler to your build.`
      )
    );
  }
  if (!cooler) return;
  if (cpu) {
    const socket = cpu.specs.socket;
    const sockets = cooler.specs.sockets;
    if (socket && sockets && sockets.length) {
      const support = coolerSupports(sockets, socket);
      if (support === 'no') {
        out.push(
          issue(
            'cooler_socket_unsupported',
            'error',
            ['CPU_COOLER', 'CPU'],
            "Cooler doesn't list support for this CPU",
            `The ${cooler.displayName} lists ${listWords(sockets)}, but your CPU uses ${socket}. Check whether the maker sells a ${socket} mounting kit, or choose a cooler that lists ${socket}.`
          )
        );
      } else if (support === 'mount') {
        const shared = (COOLER_MOUNT_EQUIVALENT[socket] ?? []).find((s) => sockets.includes(s));
        out.push(
          issue(
            'cooler_socket_mount_check',
            'warning',
            ['CPU_COOLER', 'CPU'],
            'Cooler should fit, but check the mount',
            `This cooler lists ${shared} but not ${socket}. ${socket} uses the same cooler mounting as ${shared}, so it usually fits, but confirm with the cooler maker before buying.`
          )
        );
      }
    } else {
      out.push(
        issue(
          'cooler_socket_unverified',
          'info',
          ['CPU_COOLER', 'CPU'],
          "Couldn't confirm the cooler fits the CPU",
          `We couldn't find ${!socket ? "the CPU's socket" : 'which sockets the cooler supports'}. Check that the cooler lists your CPU socket (for example AM5 or LGA1700).`
        )
      );
    }
    const cpuTdp = cpu.specs.tdpW;
    const rating = cooler.specs.tdpRatingW;
    if (cpuTdp && rating && rating < cpuTdp) {
      out.push(
        issue(
          'cooler_tdp_low',
          'warning',
          ['CPU_COOLER', 'CPU'],
          'Cooler may struggle with this CPU',
          `This cooler is rated for about ${rating}W of heat, and the ${cpu.displayName} is rated at ${cpuTdp}W. It may run hot and slow itself down under heavy load. A bigger cooler is a safer pick.`
        )
      );
    }
  }
  if (pcCase) {
    if (cooler.specs.type === 'aio') {
      const rad = cooler.specs.radiatorMm;
      const max = pcCase.specs.maxRadiatorMm;
      if (rad && max && rad > max) {
        out.push(
          issue(
            'radiator_too_big',
            'error',
            ['CPU_COOLER', 'CASE'],
            'Radiator is too big for this case',
            `This liquid cooler has a ${rad}mm radiator (the part with the fans), but the case supports radiators up to ${max}mm. Choose a smaller liquid cooler or a bigger case.`
          )
        );
      } else if (!rad || !max) {
        out.push(
          issue(
            'radiator_size_unverified',
            'info',
            ['CPU_COOLER', 'CASE'],
            "Couldn't confirm the radiator fits the case",
            `We couldn't find ${!rad ? "the cooler's radiator size" : "the case's supported radiator size"}. Check the cooler and case spec sheets, including the mounting position and available space, before buying.`
          )
        );
      }
    } else {
      const h = cooler.specs.heightMm;
      const max = pcCase.specs.maxCoolerHeightMm;
      if (h && max) {
        if (h > max) {
          out.push(
            issue(
              'cooler_too_tall',
              'error',
              ['CPU_COOLER', 'CASE'],
              'CPU cooler is too tall for this case',
              `The ${cooler.displayName} is ${h}mm tall, but this case fits coolers up to ${max}mm, so the side panel won't close. Choose a shorter cooler or a wider case.`
            )
          );
        }
      } else if (cooler.specs.type === 'air') {
        out.push(
          issue(
            'cooler_height_unverified',
            'info',
            ['CPU_COOLER', 'CASE'],
            "Couldn't confirm the cooler fits the case",
            `We couldn't find ${!h ? "the cooler's height" : "the case's maximum cooler height"}. Compare them in the spec sheets before buying.`
          )
        );
      } else {
        out.push(
          issue(
            'cooler_fit_unverified',
            'info',
            ['CPU_COOLER', 'CASE'],
            "Couldn't confirm the cooler fits the case",
            "We couldn't identify this cooler's type or dimensions. Check its height or radiator size against the case's supported sizes and mounting positions before buying."
          )
        );
      }
    }
  }
}

function checkGraphics(cpu: CpuPart | undefined, gpus: GpuPart[], out: Issue[]) {
  if (!cpu || gpus.length > 0) return;
  if (cpu.specs.integratedGraphics === false) {
    out.push(
      issue(
        'cpu_needs_gpu',
        'warning',
        ['CPU', 'GPU'],
        "You'll need a graphics card",
        `The ${cpu.displayName} has no built-in graphics, so your monitor won't get a picture without a separate graphics card (GPU). Add a graphics card to the build.`
      )
    );
  }
}

function checkLaptopParts(cpu: CpuPart | undefined, out: Issue[]) {
  if (cpu?.specs.mobile) {
    out.push(
      issue(
        'laptop_cpu',
        'error',
        ['CPU'],
        'This is a laptop processor',
        `The ${cpu.displayName} is a laptop chip that comes soldered into laptops. It can't be installed in a desktop motherboard. Pick a desktop processor instead.`
      )
    );
  }
}

function checkBios(cpu: CpuPart | undefined, mb: MotherboardPart | undefined, out: Issue[]) {
  if (!cpu || !mb) return;
  const chip = lookupChipset(mb.specs.chipset);
  if (!chip || cpu.specs.socket !== chip.socket) return;
  const gen = cpu.specs.generation ?? 0;
  const BIOS = 'The BIOS is the built-in software the motherboard uses to start up.';
  const FLASHBACK = 'Boards with a "BIOS Flashback" button can be updated from a USB stick without a CPU installed.';
  let message: string | undefined;
  if (cpu.specs.vendor === 'Intel' && (gen === 13 || gen === 14) && chip.socket === 'LGA1700') {
    const needsNewer = chip.series === 600 || (chip.series === 700 && gen === 14);
    message = `${needsNewer ? `Some ${mb.specs.chipset} boards need a BIOS update before they can run a ${gen}th gen Intel CPU. Look for "ready for ${gen}th gen" on the box. ` : ''}Intel also recommends the latest BIOS for all 13th and 14th gen Core chips, because it includes a fix for a known stability problem. ${BIOS} ${FLASHBACK}`;
  } else if (cpu.specs.vendor === 'AMD' && chip.socket === 'AM5' && chip.series === 600 && (gen === 9000 || (gen === 8000 && /G$/.test(cpu.specs.model ?? '')))) {
    message = `${mb.specs.chipset} boards made before this CPU came out need a BIOS update to run it. Many newer boards ship ready, so check the box or ask the seller. ${BIOS} ${FLASHBACK}`;
  } else if (cpu.specs.vendor === 'AMD' && chip.socket === 'AM4' && chip.series <= 400 && gen === 5000) {
    message = `${mb.specs.chipset} boards need a BIOS update to run Ryzen 5000 CPUs. ${BIOS} ${FLASHBACK}`;
  }
  if (message) {
    out.push(issue('bios_update_note', 'info', ['CPU', 'MOTHERBOARD'], 'Update the motherboard BIOS first', message));
  }
}

function check16Pin(gpus: GpuPart[], psu: PsuPart | undefined, out: Issue[]) {
  if (!psu) return;
  const gpu = gpus.find((g) => g.specs.uses16Pin);
  if (!gpu) return;
  if (psu.specs.native16Pin) return;
  const atx3 = psu.specs.atxVersion === '3.0' || psu.specs.atxVersion === '3.1';
  if (atx3) return;
  out.push(
    issue(
      'gpu_16pin_adapter',
      'info',
      ['GPU', 'POWER_SUPPLY'],
      'Your graphics card uses the newer 16-pin power plug',
      `The ${gpu.displayName} uses a 16-pin power connector (called 12VHPWR or 12V-2x6). This power supply doesn't list a native 16-pin cable, so use the adapter that comes in the graphics card box. That works fine: push the plug in fully until it clicks, and avoid bending the cable right at the plug.`
    )
  );
}

function checkM2(mb: MotherboardPart | undefined, drives: StoragePart[], out: Issue[]) {
  if (mb?.specs.m2Slots === undefined) return;
  const m2 = drives.filter((d) => d.specs.formFactor?.startsWith('M.2')).reduce((n, d) => n + qty(d), 0);
  if (m2 > mb.specs.m2Slots) {
    out.push(
      issue(
        'm2_slots_exceeded',
        'warning',
        ['STORAGE', 'MOTHERBOARD'],
        'More M.2 drives than slots',
        `You have ${m2} M.2 SSDs (the small stick-shaped drives), but this motherboard has ${mb.specs.m2Slots} M.2 slots. Drop one, or swap it for a 2.5 inch SATA SSD.`
      )
    );
  }
}

const SEVERITY_ORDER: Record<IssueSeverity, number> = { error: 0, warning: 1, info: 2 };

/**
 * Check a (possibly partial) build. Missing parts are fine: rules only run
 * when the parts they compare are present.
 */
export function checkBuild(parts: NormalizedPart[]): BuildCheckResult {
  const issues: Issue[] = [];
  const cpu = first(parts, 'CPU');
  const mb = first(parts, 'MOTHERBOARD');
  const rams = all(parts, 'RAM');
  const gpus = all(parts, 'GPU');
  const psu = first(parts, 'POWER_SUPPLY');
  const pcCase = first(parts, 'CASE');
  const cooler = first(parts, 'CPU_COOLER');
  const drives = all(parts, 'STORAGE');
  const power = estimatePower(parts);

  checkLaptopParts(cpu, issues);
  checkSocket(cpu, mb, issues);
  checkMemory(mb, rams, issues);
  checkPower(parts, psu, power, issues);
  checkGpuFit(gpus, pcCase, issues);
  checkBoardInCase(mb, pcCase, issues);
  checkCooler(cpu, cooler, pcCase, issues);
  checkGraphics(cpu, gpus, issues);
  checkBios(cpu, mb, issues);
  check16Pin(gpus, psu, issues);
  checkM2(mb, drives, issues);

  issues.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  const status: BuildStatus = issues.some((i) => i.severity === 'error')
    ? 'error'
    : issues.some((i) => i.severity === 'warning')
      ? 'warning'
      : 'ok';
  return {
    status,
    issues,
    estimatedWattage: power.estimatedWattage,
    recommendedPsuWattage: power.recommendedPsuWattage,
  };
}
