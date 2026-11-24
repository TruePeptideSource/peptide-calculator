/*!
 * TruePeptideSource peptide calculator widget. MIT License.
 * https://github.com/TruePeptideSource/peptide-calculator
 * No tracking, no cookies, no network calls.
 */
import { blendDose, reconstitute, type BlendDoseResult, type ReconstituteResult } from "../math/calculator.js";
import { isInputError } from "../math/errors.js";
import { formatMeasured } from "../math/measure.js";
import { Rational } from "../math/rational.js";
import type { SyringeReading } from "../math/readings.js";
import { SYRINGES, isSyringeId, type SyringeId } from "../math/syringe.js";
import type { MathWarning } from "../math/warnings.js";
import { PRESETS, PRESET_ALIASES, type Preset } from "../presets.js";
import { CSS } from "./styles.js";

const SITE = "https://truepeptidesource.com";
const UTM = "utm_source=embed&utm_medium=widget&utm_campaign=peptide-calculator";
const POWERED_BY_URL = `${SITE}/calculators/reconstitution?${UTM}`;
const MOUNTED = "data-tps-mounted";

/** Syringe picker order and short names. */
const SYRINGE_CHOICES: readonly { id: SyringeId; label: string }[] = [
  { id: "U-100", label: "U-100, 1 mL" },
  { id: "U-50", label: "U-100, 0.5 mL (U-50)" },
  { id: "U-30", label: "U-100, 0.3 mL (U-30)" },
  { id: "U-40", label: "U-40, 1 mL" },
];

const SHORT_NAME: Readonly<Record<SyringeId, string>> = {
  "U-100": "U-100 (1 mL)",
  "U-50": "U-50 (0.5 mL, U-100 scale)",
  "U-30": "U-30 (0.3 mL, U-100 scale)",
  "U-40": "U-40",
};

const FIELD_NAMES: Readonly<Record<string, string>> = {
  vialMg: "Vial",
  waterMl: "Water",
  dose: "Dose",
};

let counter = 0;

function esc(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** "2,5" and " 2.5 " both read as 2.5. Empty or malformed input is null. */
function parseField(text: string): number | null {
  const t = text.trim().replace(",", ".");
  if (!/^(\d+\.?\d*|\.\d+)$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function findPreset(slug: string | null): Preset | null {
  if (!slug) return null;
  const key = slug.trim().toLowerCase();
  return PRESETS[key] ?? PRESETS[PRESET_ALIASES[key] ?? ""] ?? null;
}

function trimNumber(n: number): string {
  return String(Number(n.toPrecision(12)));
}

/* ------------------------------------------------------------------ */
/* Syringe graphic                                                     */
/* ------------------------------------------------------------------ */

function syringeSvg(id: SyringeId, units: number | null): string {
  const spec = SYRINGES[id];
  const cap = spec.capacityUnits;
  const x0 = 34;
  const x1 = 286;
  const w = x1 - x0;
  const label = cap <= 30 ? 5 : 10;
  let ticks = "";
  for (let u = 0; u <= cap; u += spec.markUnits) {
    const x = x0 + (u / cap) * w;
    const major = u % label === 0;
    ticks += `<line x1="${x.toFixed(2)}" y1="22" x2="${x.toFixed(2)}" y2="${major ? 36 : 30}" class="tick"/>`;
    if (major && u > 0) ticks += `<text x="${x.toFixed(2)}" y="50" class="num">${u}</text>`;
  }
  const filled = units === null ? 0 : Math.min(units, cap);
  const fx = x0 + (filled / cap) * w;
  const over = units !== null && units > cap;
  const fill =
    units === null
      ? ""
      : `<rect x="${x0}" y="22" width="${(fx - x0).toFixed(2)}" height="24" class="liquid"/>` +
        `<line x1="${fx.toFixed(2)}" y1="14" x2="${fx.toFixed(2)}" y2="54" class="${over ? "line over" : "line"}"/>`;
  return (
    `<svg viewBox="0 0 320 60" role="img" aria-label="${esc(
      units === null ? `Empty ${spec.label}` : `${spec.label} filled to ${trimNumber(Math.min(units, cap))} units`,
    )}" focusable="false">` +
    `<rect x="8" y="28" width="26" height="12" rx="2" class="plunger"/>` +
    `<rect x="${x0}" y="20" width="${w}" height="28" rx="4" class="barrel"/>` +
    fill +
    ticks +
    `<path d="M${x1} 28 L304 31 L304 37 L${x1} 40 Z" class="hub"/>` +
    `<line x1="304" y1="34" x2="318" y2="34" class="needle"/>` +
    `</svg>`
  );
}

/* ------------------------------------------------------------------ */
/* Widget                                                              */
/* ------------------------------------------------------------------ */

interface Els {
  readonly root: ShadowRoot;
  readonly peptide: HTMLSelectElement;
  readonly vial: HTMLInputElement;
  readonly water: HTMLInputElement;
  readonly dose: HTMLInputElement;
  readonly doseUnit: HTMLSelectElement;
  readonly syringe: HTMLSelectElement;
  readonly vialRow: HTMLElement;
  readonly blendRow: HTMLElement;
  readonly doseLabel: HTMLElement;
  readonly note: HTMLElement;
  readonly result: HTMLElement;
  readonly graphic: HTMLElement;
  readonly details: HTMLElement;
}

function template(uid: string): string {
  const options = Object.values(PRESETS)
    .map((p) => `<option value="${esc(p.slug)}">${esc(p.name)}</option>`)
    .join("");
  const syringes = SYRINGE_CHOICES.map((s) => `<option value="${s.id}">${esc(s.label)}</option>`).join("");
  return `
<section class="card" aria-labelledby="${uid}-title">
  <header class="head">
    <h2 id="${uid}-title" class="title">Peptide calculator</h2>
    <p class="sub">mg to syringe units</p>
  </header>
  <form class="grid" novalidate>
    <label class="field wide" for="${uid}-peptide"><span>Peptide</span>
      <select id="${uid}-peptide" name="peptide"><option value="">Custom</option>${options}</select>
    </label>
    <label class="field" for="${uid}-vial" data-row="vial"><span>Vial (mg)</span>
      <input id="${uid}-vial" name="vial" inputmode="decimal" autocomplete="off" placeholder="e.g. 10">
    </label>
    <div class="field wide blend" data-row="blend" hidden><span>In the vial</span><p class="mix"></p></div>
    <label class="field" for="${uid}-water"><span>Water (mL)</span>
      <input id="${uid}-water" name="water" inputmode="decimal" autocomplete="off" placeholder="e.g. 2">
    </label>
    <div class="field dose">
      <label for="${uid}-dose" class="dose-label">Dose</label>
      <div class="pair">
        <input id="${uid}-dose" name="dose" inputmode="decimal" autocomplete="off" placeholder="e.g. 250">
        <select name="doseUnit" aria-label="Dose unit"><option value="mg">mg</option><option value="mcg">mcg</option></select>
      </div>
    </div>
    <label class="field" for="${uid}-syringe"><span>Syringe</span>
      <select id="${uid}-syringe" name="syringe">${syringes}</select>
    </label>
  </form>
  <div class="out">
    <p class="result" role="status" aria-live="polite" aria-atomic="true"></p>
    <div class="graphic"></div>
    <div class="details"></div>
    <p class="note"></p>
  </div>
  <footer class="foot">
    <span>Math only, not medical advice.</span>
    <a class="powered" href="${POWERED_BY_URL}" target="_blank" rel="noopener">Powered by TruePeptideSource</a>
  </footer>
</section>`;
}

function query<T extends Element>(root: ParentNode, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`peptide-calculator: missing ${selector}`);
  return el;
}

function warningText(warnings: readonly MathWarning[]): string {
  const seen = new Set<string>();
  const items = warnings
    .filter((w) => w.code !== "between_marks")
    .map((w) => w.message)
    .filter((m) => (seen.has(m) ? false : (seen.add(m), true)))
    .slice(0, 3);
  return items.length ? `<ul class="warn">${items.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>` : "";
}

function drawSentence(reading: SyringeReading, volume: string): string {
  const units = formatMeasured(reading.units, { withUnit: false });
  const extra = reading.draws > 1 ? ` That is more than one syringe holds: split it into ${reading.draws} draws.` : "";
  return `Draw <strong>${units} units</strong> (${esc(volume)}) on a ${esc(SHORT_NAME[reading.syringe])} syringe.${extra}`;
}

class Calculator {
  private preset: Preset | null = null;
  private readonly els: Els;

  constructor(host: HTMLElement, attrs: { peptide: string | null; syringe: string | null; theme: string | null }) {
    const root = host.attachShadow({ mode: "open" });
    const uid = `tps${++counter}`;
    const theme = attrs.theme === "light" || attrs.theme === "dark" ? attrs.theme : "auto";
    root.innerHTML = `<style>${CSS}</style><div class="tps" data-theme="${theme}">${template(uid)}</div>`;
    this.els = {
      root,
      peptide: query(root, `#${uid}-peptide`),
      vial: query(root, `#${uid}-vial`),
      water: query(root, `#${uid}-water`),
      dose: query(root, `#${uid}-dose`),
      doseUnit: query(root, 'select[name="doseUnit"]'),
      syringe: query(root, `#${uid}-syringe`),
      vialRow: query(root, '[data-row="vial"]'),
      blendRow: query(root, '[data-row="blend"]'),
      doseLabel: query(root, ".dose-label"),
      note: query(root, ".note"),
      result: query(root, ".result"),
      graphic: query(root, ".graphic"),
      details: query(root, ".details"),
    };
    if (isSyringeId(attrs.syringe)) this.els.syringe.value = attrs.syringe;
    this.applyPreset(findPreset(attrs.peptide));

    const form = query<HTMLFormElement>(root, "form");
    form.addEventListener("input", (e) => {
      if (e.target === this.els.peptide) return;
      this.update();
    });
    form.addEventListener("change", (e) => {
      if (e.target === this.els.peptide) this.applyPreset(findPreset(this.els.peptide.value));
      else this.update();
    });
    form.addEventListener("submit", (e) => e.preventDefault());
  }

  private applyPreset(preset: Preset | null): void {
    const { els } = this;
    this.preset = preset;
    els.peptide.value = preset?.slug ?? "";
    els.vial.value = preset?.vialMg != null ? trimNumber(preset.vialMg) : "";
    els.water.value = preset?.waterMl != null ? trimNumber(preset.waterMl) : "";
    els.dose.value = preset?.startingDose ? trimNumber(preset.startingDose.value) : "";
    els.doseUnit.value = preset?.startingDose?.unit ?? (preset?.isBlend ? "mg" : "mcg");
    const isBlend = preset?.isBlend === true;
    els.vialRow.hidden = isBlend;
    els.blendRow.hidden = !isBlend;
    els.doseLabel.textContent = isBlend ? "Dose (whole blend)" : "Dose";
    if (isBlend && preset) {
      query(els.blendRow, ".mix").textContent = preset.components.map((c) => `${c.name} ${trimNumber(c.mg)} mg`).join(" + ");
    }
    if (preset?.startingDose) {
      const s = preset.startingDose;
      const link = `${preset.page}?${UTM}`;
      els.note.innerHTML =
        `Prefilled with the starting dose reported for ${esc(preset.name)}: ${esc(trimNumber(s.value))} ${s.unit}, ` +
        `<span class="badge">${esc(s.origin)}</span>. Protocol: ${esc(s.goal)}. ` +
        `<a href="${esc(link)}" target="_blank" rel="noopener">All reported doses and sources</a>`;
    } else if (preset) {
      els.note.innerHTML = `<a href="${esc(`${preset.page}?${UTM}`)}" target="_blank" rel="noopener">Reported doses and sources for ${esc(preset.name)}</a>`;
    } else {
      els.note.textContent = "";
    }
    this.update();
  }

  private markInvalid(path: string | null): void {
    const map: Record<string, HTMLInputElement> = { vialMg: this.els.vial, waterMl: this.els.water, dose: this.els.dose };
    for (const [key, input] of Object.entries(map)) {
      if (key === path) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
    }
  }

  private update(): void {
    const { els } = this;
    const syringe: SyringeId = isSyringeId(els.syringe.value) ? els.syringe.value : "U-100";
    const doseUnit = els.doseUnit.value === "mg" ? "mg" : "mcg";
    const water = parseField(els.water.value);
    const dose = parseField(els.dose.value);
    const blend = this.preset?.isBlend ? this.preset : null;
    const vial = blend ? 1 : parseField(els.vial.value);

    const missing = [vial === null && !blend ? "vial size" : "", water === null ? "water" : "", dose === null ? "dose" : ""].filter(Boolean);
    if (missing.length > 0 || vial === null || water === null || dose === null) {
      this.markInvalid(null);
      const list = missing.length > 1 ? `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}` : missing[0];
      this.render(syringe, null, `Enter the ${list} to see how many units to draw.`, "");
      return;
    }

    try {
      if (blend) {
        const r = blendDose({ peptides: blend.components, waterMl: water, dose, doseUnit, syringe });
        this.markInvalid(null);
        this.render(syringe, r.reading, drawSentence(r.reading, formatMeasured(r.volumeMl)), this.blendDetails(r));
      } else {
        const r = reconstitute({ vialMg: vial, waterMl: water, dose, doseUnit, syringe });
        this.markInvalid(null);
        this.render(syringe, r.reading, drawSentence(r.reading, formatMeasured(r.volumeMl)), this.singleDetails(r));
      }
    } catch (error) {
      if (!isInputError(error)) throw error;
      this.markInvalid(error.path);
      const field = FIELD_NAMES[error.path] ?? "A value";
      const why = error.code === "too_large" ? "is too large" : error.code === "too_small" ? "is too small" : "must be more than 0";
      this.render(syringe, null, `${field} ${why}. Check the number.`, "");
    }
  }

  private singleDetails(r: ReconstituteResult): string {
    const doses = r.fullDosesPerVial === 1 ? "1 dose" : `${r.fullDosesPerVial} doses`;
    return (
      `<dl class="facts">` +
      `<div><dt>Concentration</dt><dd>${esc(formatMeasured(r.concentration.mgPerMl))}</dd></div>` +
      `<div><dt>Per vial</dt><dd>${esc(doses)}</dd></div>` +
      `<div><dt>Nearest mark</dt><dd>${esc(formatMeasured(r.reading.nearestMark))}</dd></div>` +
      `</dl>` +
      warningText([...r.warnings, ...r.reading.warnings])
    );
  }

  private blendDetails(r: BlendDoseResult): string {
    const rows = r.peptides
      .map((p) => {
        // Under 1 mg reads better in mcg ("250 mcg", not "0.25 mg").
        const text = p.delivered.mg.exact.lt(Rational.ONE) ? formatMeasured(p.delivered.mcg) : formatMeasured(p.delivered.mg);
        return `<li><span>${esc(p.name)}</span><strong>${esc(text)}</strong></li>`;
      })
      .join("");
    const doses = r.fullDosesPerVial === 1 ? "1 dose" : `${r.fullDosesPerVial} doses`;
    return (
      `<p class="each">Each draw holds:</p><ul class="parts">${rows}</ul>` +
      `<dl class="facts"><div><dt>Per vial</dt><dd>${esc(doses)}</dd></div>` +
      `<div><dt>Nearest mark</dt><dd>${esc(formatMeasured(r.reading.nearestMark))}</dd></div></dl>` +
      warningText([...r.warnings, ...r.reading.warnings])
    );
  }

  private render(syringe: SyringeId, reading: SyringeReading | null, sentence: string, details: string): void {
    this.els.result.innerHTML = sentence;
    this.els.graphic.innerHTML = syringeSvg(syringe, reading ? reading.units.value : null);
    this.els.details.innerHTML = details;
  }
}

function mount(script: HTMLScriptElement): void {
  if (script.hasAttribute(MOUNTED)) return;
  script.setAttribute(MOUNTED, "");
  const host = document.createElement("div");
  host.className = "tps-peptide-calculator";
  script.after(host);
  new Calculator(host, {
    peptide: script.getAttribute("data-peptide"),
    syringe: script.getAttribute("data-syringe"),
    theme: script.getAttribute("data-theme"),
  });
}

function mountAll(): void {
  // Each <script> tag renders where it sits. With async/defer, currentScript is null, so find unmounted tags.
  const current = document.currentScript;
  if (current instanceof HTMLScriptElement && current.src.includes("embed")) {
    mount(current);
    return;
  }
  document.querySelectorAll<HTMLScriptElement>('script[src*="peptide-calculator"][src*="embed"]').forEach(mount);
}

mountAll();
