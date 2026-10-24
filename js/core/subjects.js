/**
 * Subject and attendance-target state changes. PURE reducer in the same style as applyTaskChange:
 * (data, change, now) -> { ok, data, changed, ... } | { ok: false, reason, errors }. Never mutates its input.
 *
 * Stored shape (additive; schemaVersion stays 1; entries live in the existing `subjects` array):
 *   { id, name, kind: 'theory'|'lab', classesHeld, classesAttended, createdAt, updatedAt }
 * The target is the existing `settings.attendanceThreshold`.
 */
import { SUBJECT_KINDS, SUBJECT_KIND_LABELS, ATTENDANCE_LIMITS as LIM } from '../shared/contracts.js';
import { validateCounts, validateTarget } from './attendance.js';

export const normalizeName = (s) => String(s ?? '').normalize('NFC').trim().replace(/\s+/g, ' ');
const nameKey = (s) => normalizeName(s).toLocaleLowerCase();
const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const newId = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const bad = (errors) => ({ ok: false, reason: 'invalid', errors });

/** Subjects safe to read: tolerates a missing/damaged `subjects` value and skips entries that are not objects. */
export const readSubjects = (data) => (Array.isArray(data?.subjects) ? data.subjects.filter(isObj) : []);

/**
 * A subject is a duplicate when another subject has the same name (ignoring case and extra spaces) AND the same kind,
 * so "Physics" (theory) and "Physics" (lab) can coexist but an accidental second "physics" theory cannot.
 */
export function validateSubjectInput({ name, kind }, existing, ignoreId = null) {
  const errors = {};
  const clean = normalizeName(name);
  if (!clean) errors.name = 'Enter a subject name.';
  else if (clean.length > LIM.nameMax) errors.name = `Use ${LIM.nameMax} characters or fewer.`;
  if (!SUBJECT_KINDS.includes(kind)) errors.kind = 'Choose theory or lab.';
  if (!errors.name && !errors.kind && existing.some((s) => s.id !== ignoreId && s.kind === kind && nameKey(s.name) === nameKey(clean))) {
    errors.name = `You already have a ${SUBJECT_KIND_LABELS[kind].toLowerCase()} subject called "${clean}".`;
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, errors: {}, value: { name: clean, kind } };
}

/**
 * change types:
 *  { type: 'subject:add', input: { name, kind, held?, attended? } }   (blank held/attended mean 0)
 *  { type: 'subject:setCounts', id, held, attended }
 *  { type: 'subject:remove', id }                                      (linked tasks keep existing; subjectId becomes null)
 *  { type: 'settings:setTarget', target }
 */
export function applySubjectChange(data, change, now = new Date()) {
  const stamp = now.toISOString();
  const subjects = readSubjects(data);

  if (change.type === 'subject:add') {
    const inp = change.input ?? {};
    const v = validateSubjectInput(inp, subjects);
    const blank = (x) => x == null || String(x).trim() === '';
    const c = validateCounts(blank(inp.held) ? 0 : inp.held, blank(inp.attended) ? 0 : inp.attended);
    const errors = { ...(v.ok ? {} : v.errors), ...(c.ok ? {} : c.errors) };
    if (Object.keys(errors).length) return bad(errors);
    const subject = { id: newId(), ...v.value, classesHeld: c.value.held, classesAttended: c.value.attended, createdAt: stamp, updatedAt: stamp };
    const list = Array.isArray(data.subjects) ? data.subjects : [];
    return { ok: true, data: { ...data, subjects: [...list, subject] }, subject, changed: true };
  }

  if (change.type === 'subject:setCounts') {
    const old = typeof change.id === 'string' ? subjects.find((s) => s.id === change.id) : undefined;
    if (!old) return { ok: false, reason: 'not-found', errors: {} };
    const c = validateCounts(change.held, change.attended);
    if (!c.ok) return bad(c.errors);
    if (old.classesHeld === c.value.held && old.classesAttended === c.value.attended) return { ok: true, data, subject: old, changed: false };
    const subject = { ...old, classesHeld: c.value.held, classesAttended: c.value.attended, updatedAt: stamp };
    return { ok: true, data: { ...data, subjects: data.subjects.map((s) => (s === old ? subject : s)) }, subject, changed: true };
  }

  if (change.type === 'subject:remove') {
    const old = typeof change.id === 'string' ? subjects.find((s) => s.id === change.id) : undefined;
    if (!old) return { ok: false, reason: 'not-found', errors: {} };
    let detachedTasks = 0;
    const tasks = (Array.isArray(data.tasks) ? data.tasks : []).map((t) => {
      if (!isObj(t) || t.subjectId !== old.id) return t;
      detachedTasks += 1; return { ...t, subjectId: null, updatedAt: stamp };
    });
    return { ok: true, data: { ...data, tasks, subjects: data.subjects.filter((s) => s !== old) }, subject: old, detachedTasks, changed: true };
  }

  if (change.type === 'settings:setTarget') {
    const t = validateTarget(change.target);
    if (!t.ok) return bad({ target: t.error });
    if (data.settings?.attendanceThreshold === t.value) return { ok: true, data, changed: false, target: t.value };
    return { ok: true, data: { ...data, settings: { ...(isObj(data.settings) ? data.settings : {}), attendanceThreshold: t.value } }, changed: true, target: t.value };
  }

  return { ok: false, reason: 'unknown-change', errors: {} };
}

/** How many tasks reference this subject (used by the removal confirmation). Tolerates damaged task entries. */
export const countLinkedTasks = (data, subjectId) => (typeof subjectId === 'string' && Array.isArray(data?.tasks) ? data.tasks.filter((t) => isObj(t) && t.subjectId === subjectId).length : 0);
