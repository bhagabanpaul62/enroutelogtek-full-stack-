// PTL chargeable weight for the live preview. The same rule as backend load.rules.js chargeableWeight:
// max(actual, volumetric, minimum), volumetric = sum(count x L x W x H cm) / 5000. The server recomputes on save.
import { PTL_DEFAULTS } from '../constants';

const round2 = (n) => Math.round(n * 100) / 100;
const num = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v));

/** A package line the user has started typing (any field filled). */
export const isLineStarted = (line) => ['count', 'lengthCm', 'widthCm', 'heightCm', 'weightKg'].some((k) => String(line?.[k] ?? '').trim() !== '');

/** A line that counts: whole count and positive L, W, H. */
export const isLineComplete = (line) =>
    Number.isInteger(num(line?.count)) && num(line.count) >= 1 && num(line.lengthCm) > 0 && num(line.widthCm) > 0 && num(line.heightCm) > 0;

/** { volumetricWeightKg, chargeableWeightKg } from package lines (strings or numbers) and the actual weight. */
export function chargeableWeight(lines, actualWeightKg) {
    const cm3 = (lines ?? []).filter(isLineComplete).reduce((sum, p) => sum + num(p.count) * num(p.lengthCm) * num(p.widthCm) * num(p.heightCm), 0);
    const volumetricWeightKg = round2(cm3 / PTL_DEFAULTS.volumetricDivisor);
    const actual = Number(actualWeightKg) || 0;
    return { volumetricWeightKg, chargeableWeightKg: round2(Math.max(actual, volumetricWeightKg, PTL_DEFAULTS.minChargeableKg)), actualWeightKg: actual };
}

/** Total packages across complete lines. */
export const packageTotal = (lines) => (lines ?? []).filter(isLineComplete).reduce((s, p) => s + num(p.count), 0);
