import { h, priorityIcon } from './dom.js';
import { STATUS_LABELS, PRIORITY_LABELS } from '../shared/contracts.js';

const FILTERS = [['all', 'All'], ['open', 'Open'], ['done', 'Done']];
const KEYS = ['title', 'dueDate', 'dueTime', 'priority', 'status', 'notes'];

function formatDue(date, time) {
  if (!date) return 'No due date';
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d); // local calendar date: no UTC shift
  if (Number.isNaN(dt.getTime())) return 'Due date unreadable';
  const text = dt.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  return time ? `Due ${text}, ${time}` : `Due ${text}`;
}

/** Task list, filters, add/edit dialog and delete confirmation. All writes go through ctx.commit. */
export function createTasksView({ els, getData, commit, announce }) {
  const form = els.form;
  let filter = 'all';
  let editingId = null;
  let deletingId = null;
  let submitting = false;

  const matches = (t) => filter === 'all' || (filter === 'done') === (t.status === 'done');

  function renderFilters() {
    els.filters.replaceChildren(...FILTERS.map(([id, label]) =>
      h('button', { type: 'button', class: 'btn', 'aria-pressed': String(filter === id), onclick: () => { filter = id; render(getData()); announce(`Showing ${label.toLowerCase()} tasks.`); } }, label)));
  }

  function row(t) {
    const id = `chk-${t.id}`;
    return h('li', { class: `task${t.status === 'done' ? ' is-done' : ''}` },
      h('input', { type: 'checkbox', id, checked: t.status === 'done', onchange: (e) => commit({ type: 'setStatus', id: t.id, status: e.target.checked ? 'done' : 'todo' }, e.target.checked ? 'Task marked done.' : 'Task reopened.') }),
      h('div', {},
        h('label', { for: id, class: 'task-title' }, h('span', { class: 'sr-only' }, 'Mark done: '), t.title),
        h('p', { class: 'meta' },
          h('span', {}, formatDue(t.dueDate, t.dueTime)),
          h('span', { class: 'chip' }, priorityIcon(t.priority), PRIORITY_LABELS[t.priority] ?? ''),
          h('span', {}, STATUS_LABELS[t.status] ?? ''))),
      t.notes ? h('p', { class: 'task-notes' }, t.notes) : null,
      h('div', { class: 'task-actions' },
        h('button', { type: 'button', class: 'btn', 'data-edit': t.id, 'aria-label': `Edit ${t.title}`, onclick: () => openForm(t) }, 'Edit'),
        h('button', { type: 'button', class: 'btn', 'aria-label': `Delete ${t.title}`, onclick: () => askDelete(t) }, 'Delete')));
  }

  function render(data) {
    renderFilters();
    const tasks = data.tasks.filter(matches);
    els.list.replaceChildren(...tasks.map(row));
    els.empty.hidden = tasks.length > 0;
    els.empty.replaceChildren(...(data.tasks.length === 0
      ? [h('h2', {}, 'No tasks yet'), h('p', {}, 'Add what is due next and it will show up here.'), h('button', { type: 'button', class: 'btn btn-primary', onclick: () => openForm(null) }, 'Add your first task')]
      : [h('p', {}, `No ${filter} tasks right now.`)]));
  }

  function clearErrors() {
    for (const k of KEYS) {
      const err = document.getElementById(`e-${k}`);
      err.hidden = true; err.textContent = '';
      form.elements[k].removeAttribute('aria-invalid');
    }
  }

  function showErrors(errors) {
    clearErrors();
    const keys = Object.keys(errors);
    for (const k of keys) {
      const err = document.getElementById(`e-${k}`);
      if (!err) continue;
      err.textContent = errors[k]; err.hidden = false;
      form.elements[k].setAttribute('aria-invalid', 'true');
    }
    form.elements[keys[0]]?.focus();
    announce(`${keys.length} ${keys.length === 1 ? 'problem' : 'problems'} to fix. ${errors[keys[0]]}`);
  }

  function openForm(task) {
    editingId = task ? task.id : null;
    form.reset(); clearErrors();
    els.dialogTitle.textContent = task ? 'Edit task' : 'Add task';
    els.submit.textContent = task ? 'Save changes' : 'Add task';
    const subjects = getData().subjects;
    const sel = form.elements.subjectId;
    sel.replaceChildren(h('option', { value: '' }, 'General'), ...subjects.map((s) => h('option', { value: s.id }, s.name)));
    document.getElementById('f-subjectId-wrap').hidden = subjects.length === 0;
    const v = task ?? { priority: 'medium', status: 'todo' };
    for (const k of KEYS) form.elements[k].value = v[k] ?? '';
    sel.value = v.subjectId ?? '';
    els.dialog.showModal();
    form.elements.title.focus();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (submitting) return;
    submitting = true; els.submit.disabled = true;
    try {
      const input = Object.fromEntries(KEYS.map((k) => [k, form.elements[k].value]));
      input.subjectId = form.elements.subjectId.value || null;
      const res = commit(editingId ? { type: 'update', id: editingId, patch: input } : { type: 'create', input }, editingId ? 'Task saved.' : 'Task added.');
      if (res.ok || res.reason === 'not-found') els.dialog.close();
      else showErrors(res.errors);
    } finally { submitting = false; els.submit.disabled = false; }
  });

  els.cancel.addEventListener('click', () => els.dialog.close());
  els.dialog.addEventListener('close', () => {
    const back = editingId && els.list.querySelector(`[data-edit="${CSS.escape(editingId)}"]`);
    (back || els.add).focus();
    editingId = null;
  });
  els.add.addEventListener('click', () => openForm(null));

  function askDelete(t) {
    deletingId = t.id;
    els.confirmText.textContent = `Delete "${t.title}"? This cannot be undone.`;
    els.confirm.showModal();
    els.confirmNo.focus();
  }
  els.confirmNo.addEventListener('click', () => els.confirm.close());
  els.confirmYes.addEventListener('click', () => {
    commit({ type: 'delete', id: deletingId }, 'Task deleted.');
    els.confirm.close();
  });
  els.confirm.addEventListener('close', () => { deletingId = null; els.add.focus(); });

  return { render };
}
