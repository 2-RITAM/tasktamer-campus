/**
 * TEMPORARY ADAPTER. Delete at integration (Phase 2).
 * Stands in for Agent B's core/storage.js, core/validate.js and the proposed core/tasks.js so the UI
 * can run. Signatures follow SKILL.md 5.3; applyTaskChange is a PROPOSAL still awaiting Agent B's
 * review. Keep rules minimal (SKILL.md 5.1 limits only). Do not extend with business logic.
 */
import { STORAGE_KEY, LIMITS, PRIORITIES, STATUSES } from '../shared/contracts.js';

const defaults = () => ({
  schemaVersion: 1, tasks: [], subjects: [],
  settings: { attendanceThreshold: 75, dueSoonDays: 3, reminderLeadMinutes: 60, remindersEnabled: true, browserNotifications: false, theme: 'system' },
});

/** @returns {{data: object, warnings: string[]}} */
export function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { data: defaults(), warnings: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.tasks)) throw new Error('unexpected shape');
    return { data: { ...defaults(), ...parsed }, warnings: [] };
  } catch {
    try { localStorage.setItem(`${STORAGE_KEY}.corrupt.${Date.now()}`, raw ?? ''); } catch { /* storage unavailable */ }
    return { data: defaults(), warnings: ['Saved data could not be read, so you are starting empty. A backup copy of the old data was kept in this browser.'] };
  }
}

/** @returns {{ok: boolean, error?: 'quota'|'unavailable'|'unknown'}} Synchronous write; see the open save/debounce decision. */
export function save(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); return { ok: true }; }
  catch (e) { return { ok: false, error: e && e.name === 'QuotaExceededError' ? 'quota' : 'unavailable' }; }
}

function validDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(y, mo - 1, d);
  return t.getFullYear() === y && t.getMonth() === mo - 1 && t.getDate() === d;
}

/** Stub of core/validate.js. Returns normalised fields only (no id or timestamps); differs from SKILL.md's `value?: Task`. */
export function validateTask(input) {
  const errors = {};
  const title = String(input.title ?? '').trim();
  const notes = String(input.notes ?? '').trim();
  const dueDate = input.dueDate || null;
  const dueTime = input.dueTime || null;
  const priority = input.priority || 'medium';
  const status = input.status || 'todo';
  if (!title) errors.title = 'Enter a title for this task.';
  else if (title.length > LIMITS.titleMax) errors.title = `Use ${LIMITS.titleMax} characters or fewer.`;
  if (dueDate && !validDate(dueDate)) errors.dueDate = 'Enter a real date, like 2026-11-05.';
  if (dueTime && !dueDate) errors.dueTime = 'Due time needs a due date.';
  else if (dueTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(dueTime)) errors.dueTime = 'Enter a time like 18:30.';
  if (!PRIORITIES.includes(priority)) errors.priority = 'Choose low, medium or high.';
  if (!STATUSES.includes(status)) errors.status = 'Choose a status from the list.';
  if (notes.length > LIMITS.notesMax) errors.notes = `Use ${LIMITS.notesMax} characters or fewer.`;
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, errors: {}, value: { title, subjectId: input.subjectId || null, dueDate, dueTime, priority, status, notes } };
}

const newId = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/** PROPOSED applyTaskChange (pure; no-op leaves timestamps untouched). */
export function applyTaskChange(data, change, now = new Date()) {
  const stamp = now.toISOString();
  const bad = (errors) => ({ ok: false, reason: 'invalid', errors });
  if (change.type === 'create') {
    const v = validateTask(change.input);
    if (!v.ok) return bad(v.errors);
    const task = { id: newId(), ...v.value, completedAt: v.value.status === 'done' ? stamp : null, createdAt: stamp, updatedAt: stamp };
    return { ok: true, data: { ...data, tasks: [...data.tasks, task] }, task, changed: true };
  }
  const old = data.tasks.find((t) => t.id === change.id);
  if (!old) return { ok: false, reason: 'not-found', errors: {} };
  if (change.type === 'delete') return { ok: true, data: { ...data, tasks: data.tasks.filter((t) => t.id !== change.id) }, task: null, changed: true };
  const v = validateTask({ ...old, ...(change.type === 'setStatus' ? { status: change.status } : change.patch) });
  if (!v.ok) return bad(v.errors);
  if (Object.keys(v.value).every((k) => v.value[k] === old[k])) return { ok: true, data, task: old, changed: false };
  const task = { ...old, ...v.value, updatedAt: stamp, completedAt: v.value.status === 'done' ? (old.status === 'done' ? old.completedAt : stamp) : null };
  return { ok: true, data: { ...data, tasks: data.tasks.map((t) => (t.id === old.id ? task : t)) }, task, changed: true };
}
