/**
 * Shared constants for TaskTamer Campus. Co-owned by Agents A and B (SKILL.md section 5).
 * Changing a value here is a contract change: log it in docs/DECISIONS.md.
 * @typedef {'low'|'medium'|'high'} Priority
 * @typedef {'todo'|'in-progress'|'done'} TaskStatus
 * @typedef {Object} Task  Full schema: SKILL.md section 5.1.
 * @property {string} id @property {string} title @property {string|null} subjectId
 * @property {string|null} dueDate @property {string|null} dueTime @property {Priority} priority
 * @property {TaskStatus} status @property {string} notes @property {string|null} completedAt
 * @property {string} createdAt @property {string} updatedAt
 */
export const STORAGE_KEY = 'tasktamer.v1';
export const PRIORITIES = ['low', 'medium', 'high'];
export const STATUSES = ['todo', 'in-progress', 'done'];
export const STATUS_LABELS = { todo: 'To do', 'in-progress': 'In progress', done: 'Done' };
export const PRIORITY_LABELS = { low: 'Low priority', medium: 'Medium priority', high: 'High priority' };
export const LIMITS = { titleMax: 120, notesMax: 1000 };

export const SUBJECT_KINDS = ['theory', 'lab'];
export const SUBJECT_KIND_LABELS = { theory: 'Theory', lab: 'Lab' };
/** Whole-number attendance targets and input limits. */
export const ATTENDANCE_LIMITS = { nameMax: 60, classesMax: 10000, targetMin: 1, targetMax: 100, defaultTarget: 75 };
