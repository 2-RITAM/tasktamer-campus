/**
 * Attendance maths and validation. PURE: no DOM, no storage, no clock.
 *
 * Every comparison uses integer cross-multiplication (attended * 100 >= target * held), never a rounded
 * percentage, so a record at 74.96% can never be reported as meeting a 75% target.
 */
import { ATTENDANCE_LIMITS as LIM } from '../shared/contracts.js';

// Integer division helpers for non-negative integers (exact; no floating-point rounding at boundaries).
const floorDiv = (n, d) => (n - (n % d)) / d;
const ceilDiv = (n, d) => floorDiv(n + d - 1, d);

/** 12, "12" and " 12 " give 12. Blank, 2.5, -1, "1e2", "abc", NaN, Infinity and over-long digit strings give null. */
export function parseWholeNumber(value) {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0 ? value : null;
  if (typeof value !== 'string') return null;
  const s = value.trim();
  return /^\d{1,9}$/.test(s) ? Number(s) : null;
}

/** @returns {{ok: boolean, errors: {held?: string, attended?: string}, value?: {held: number, attended: number}}} */
export function validateCounts(held, attended) {
  const errors = {};
  const h = parseWholeNumber(held), a = parseWholeNumber(attended);
  const need = (label) => `Enter ${label} as a whole number from 0 to ${LIM.classesMax}.`;
  if (h === null || h > LIM.classesMax) errors.held = need('classes held');
  if (a === null || a > LIM.classesMax) errors.attended = need('classes attended');
  if (!errors.held && !errors.attended && a > h) errors.attended = 'Classes attended cannot be more than classes held.';
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, errors: {}, value: { held: h, attended: a } };
}

/** @returns {{ok: boolean, error?: string, value?: number}} A target is a whole percentage from 1 to 100. */
export function validateTarget(target) {
  const n = parseWholeNumber(target);
  if (n === null || n < LIM.targetMin || n > LIM.targetMax) return { ok: false, error: `Enter a whole number from ${LIM.targetMin} to ${LIM.targetMax}.` };
  return { ok: true, value: n };
}

/** The saved target if it is valid, otherwise the default (guards against hand-edited or partial settings). */
export function effectiveTarget(settings) {
  const t = validateTarget(settings?.attendanceThreshold);
  return t.ok ? t.value : LIM.defaultTarget;
}

/** Exact test: attended / held >= target / 100. False when no classes have been held. Inputs must already be valid. */
export function meetsTarget(held, attended, target) {
  return held > 0 && attended * 100 >= target * held;
}

/** Percentage TRUNCATED (never rounded up) to one decimal, so the display cannot overstate attendance. null when held is 0. */
export function percentTruncated(held, attended) {
  return held === 0 ? null : floorDiv(attended * 1000, held) / 10;
}

export function formatPercent(percent) {
  if (percent === null) return '\u2013';
  return Number.isInteger(percent) ? `${percent}%` : `${percent.toFixed(1)}%`;
}

/**
 * Smallest number of upcoming classes that must ALL be attended, back to back, to reach the target.
 * Solves (attended + x) * 100 >= target * (held + x).
 * @returns {{kind: 'no-data'} | {kind: 'met', count: 0} | {kind: 'finite', count: number} | {kind: 'impossible'}}
 */
export function classesNeeded(held, attended, target) {
  if (held === 0) return { kind: 'no-data' };
  if (meetsTarget(held, attended, target)) return { kind: 'met', count: 0 };
  if (target === 100) return { kind: 'impossible' }; // a missed class can never be made up
  return { kind: 'finite', count: ceilDiv(target * held - 100 * attended, 100 - target) };
}

/**
 * Largest number of upcoming classes that can ALL be missed, back to back, while staying at or above the target.
 * Solves attended * 100 >= target * (held + s).
 * @returns {{kind: 'no-data'} | {kind: 'below'} | {kind: 'finite', count: number}}
 */
export function classesCanMiss(held, attended, target) {
  if (held === 0) return { kind: 'no-data' };
  if (!meetsTarget(held, attended, target)) return { kind: 'below' };
  return { kind: 'finite', count: floorDiv(100 * attended - target * held, target) };
}

/**
 * Full analysis of one subject's record. Never throws; invalid inputs give state 'invalid' and no advice numbers.
 * state: 'invalid' | 'no-data' | 'met' | 'below'
 */
export function analyse(held, attended, target) {
  const c = validateCounts(held, attended), t = validateTarget(target);
  if (!c.ok || !t.ok) return { state: 'invalid', percent: null, needed: null, canMiss: null };
  const { held: h, attended: a } = c.value, P = t.value;
  const base = { held: h, attended: a, target: P, percent: percentTruncated(h, a), needed: classesNeeded(h, a, P), canMiss: classesCanMiss(h, a, P) };
  return { ...base, state: h === 0 ? 'no-data' : meetsTarget(h, a, P) ? 'met' : 'below' };
}

const classes = (n) => `${n} ${n === 1 ? 'class' : 'classes'}`;

/** Plain-language advice for an analysis. Only states what the numbers prove. */
export function describeAdvice(an) {
  switch (an.state) {
    case 'invalid': return 'These saved counts do not add up. Edit them to fix the record.';
    case 'no-data': return 'No classes recorded yet. Enter classes held and attended to see advice.';
    case 'below':
      return an.needed.kind === 'impossible'
        ? `${an.target}% cannot be reached again, because a missed class cannot be made up. Choose a lower target to see how many classes you need.`
        : `Attend the next ${classes(an.needed.count)} in a row to reach ${an.target}%.`;
    default:
      return an.canMiss.count === 0
        ? `You are right at the limit. Missing the next class would take you below ${an.target}%.`
        : `You can miss up to ${classes(an.canMiss.count)} in a row and stay at or above ${an.target}%.`;
  }
}

export const STATE_LABELS = { invalid: 'Check counts', 'no-data': 'No classes yet', met: 'Meets target', below: 'Below target' };
