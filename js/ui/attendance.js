import { h } from './dom.js';
import { analyse, describeAdvice, effectiveTarget, formatPercent, STATE_LABELS } from '../core/attendance.js';
import { readSubjects, countLinkedTasks } from '../core/subjects.js';
import { SUBJECT_KIND_LABELS } from '../shared/contracts.js';

const ICONS = { met: '\u2713', below: '!', 'no-data': '\u2013', invalid: '?' }; // decorative; the text label carries the meaning
const show = (v) => (typeof v === 'number' || typeof v === 'string' ? String(v) : '?'); // never print "[object Object]" for damaged records
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function setError(input, errEl, message) {
  errEl.textContent = message || ''; errEl.hidden = !message;
  if (message) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
}

/** Attendance view. All data changes go through the shared commit(); the maths lives in core/attendance.js. */
export function createAttendanceView({ getData, commit, announce, els }) {
  const showFeedback = (msg) => { els.feedback.textContent = msg; els.feedback.hidden = false; };
  const clearFeedback = () => { els.feedback.textContent = ''; els.feedback.hidden = true; };
  const unsaved = (res) => (res.saved === false ? ' Not saved on this device.' : '');
  const summary = (s) => { const t = effectiveTarget(getData().settings); const an = analyse(s.classesHeld, s.classesAttended, t); return an.state === 'no-data' ? 'no classes recorded yet' : `${s.classesAttended} of ${s.classesHeld} attended (${formatPercent(an.percent)})`; };

  // ---- target
  els.targetForm.addEventListener('submit', (e) => {
    e.preventDefault(); clearFeedback();
    const err = document.getElementById('e-att-target');
    setError(els.targetInput, err, '');
    const res = commit({ type: 'settings:setTarget', target: els.targetInput.value }, 'Target updated.');
    if (!res.ok) { setError(els.targetInput, err, res.errors.target); announce(res.errors.target); els.targetInput.focus(); return; }
    els.targetInput.value = String(effectiveTarget(getData().settings));
    showFeedback((res.changed ? `Target set to ${res.target}%.` : `Target is already ${res.target}%.`) + unsaved(res));
  });

  // ---- add subject
  const addFields = ['name', 'kind', 'held', 'attended'];
  els.addForm.addEventListener('submit', (e) => {
    e.preventDefault(); clearFeedback();
    const f = els.addForm.elements;
    for (const k of addFields) setError(f[k], document.getElementById(`e-subject-${k}`), '');
    const res = commit({ type: 'subject:add', input: { name: f.name.value, kind: f.kind.value, held: f.held.value, attended: f.attended.value } }, 'Subject added.');
    if (!res.ok) {
      const keys = addFields.filter((k) => res.errors?.[k]);
      for (const k of keys) setError(f[k], document.getElementById(`e-subject-${k}`), res.errors[k]);
      if (keys.length) { announce(`Could not add the subject. ${res.errors[keys[0]]}`); f[keys[0]].focus(); }
      return;
    }
    els.addForm.reset();
    showFeedback(`Added ${res.subject.name} (${SUBJECT_KIND_LABELS[res.subject.kind]}): ${summary(res.subject)}.` + unsaved(res));
    f.name.focus();
  });

  // ---- remove subject (confirmation dialog)
  let pending = null, removed = false;
  els.confirmNo.addEventListener('click', () => els.confirm.close());
  els.confirmYes.addEventListener('click', () => {
    const { id, name } = pending;
    const res = commit({ type: 'subject:remove', id }, 'Subject removed.');
    removed = true;
    showFeedback(res.ok ? `Removed ${name}.${res.detachedTasks ? ` ${plural(res.detachedTasks, 'task was', 'tasks were')} kept and moved to General.` : ''}${unsaved(res)}` : 'That subject was already removed.');
    els.confirm.close();
  });
  els.confirm.addEventListener('close', () => { if (removed) els.addForm.elements.name.focus(); else pending?.opener?.focus(); pending = null; removed = false; });

  function askRemove(s, opener) {
    const linked = countLinkedTasks(getData(), s.id);
    pending = { id: s.id, name: show(s.name), opener };
    els.confirmText.textContent = `Remove ${show(s.name)} (${SUBJECT_KIND_LABELS[s.kind] ?? 'Subject'})? Its attendance record will be deleted and this cannot be undone.` +
      (linked ? ` ${plural(linked, 'task is', 'tasks are')} linked to it; they will be kept and moved to General.` : '');
    els.confirm.showModal();
  }

  // ---- subject cards
  function card(s, i, target) {
    const an = analyse(s.classesHeld, s.classesAttended, target);
    const name = typeof s.name === 'string' && s.name ? s.name : 'Unnamed subject';
    const heldId = `att-held-${i}`, attId = `att-attended-${i}`, eHeld = `e-att-held-${i}`, eAtt = `e-att-attended-${i}`;
    const heldIn = h('input', { id: heldId, name: 'held', type: 'text', inputmode: 'numeric', autocomplete: 'off', 'aria-describedby': eHeld, value: show(s.classesHeld) });
    const attIn = h('input', { id: attId, name: 'attended', type: 'text', inputmode: 'numeric', autocomplete: 'off', 'aria-describedby': eAtt, value: show(s.classesAttended) });
    const heldErr = h('p', { class: 'err', id: eHeld, hidden: true }), attErr = h('p', { class: 'err', id: eAtt, hidden: true });
    const removeBtn = h('button', { type: 'button', class: 'btn', 'aria-label': `Remove ${name}`, onclick: () => askRemove(s, removeBtn) }, 'Remove');
    const form = h('form', { class: 'att-counts', novalidate: true, 'aria-label': `Update attendance for ${name}`, onsubmit: (e) => {
      e.preventDefault(); clearFeedback(); setError(heldIn, heldErr, ''); setError(attIn, attErr, '');
      const res = commit({ type: 'subject:setCounts', id: s.id, held: heldIn.value, attended: attIn.value }, `Saved ${name}.`);
      if (!res.ok) {
        if (res.reason === 'invalid') {
          setError(heldIn, heldErr, res.errors.held); setError(attIn, attErr, res.errors.attended);
          announce(`Could not save. ${res.errors.held || res.errors.attended}`); (res.errors.held ? heldIn : attIn).focus();
        } else showFeedback('That subject no longer exists.');
        return;
      }
      showFeedback(res.changed ? `Saved ${name}: ${summary(res.subject)}.` + unsaved(res) : `No changes to save for ${name}.`);
      document.getElementById(heldId)?.focus();
    } },
      h('div', { class: 'row' },
        h('div', { class: 'field' }, h('label', { for: heldId }, 'Classes held'), heldIn, heldErr),
        h('div', { class: 'field' }, h('label', { for: attId }, 'Classes attended'), attIn, attErr)),
      h('div', { class: 'actions' }, removeBtn, h('button', { type: 'submit', class: 'btn' }, 'Save counts')));
    return h('li', { class: `subject is-${an.state}`, 'data-subject': s.id },
      h('div', { class: 'att-head' }, h('h3', { class: 'subject-name' }, name), h('span', { class: 'chip' }, SUBJECT_KIND_LABELS[s.kind] ?? 'Subject')),
      h('dl', { class: 'att-facts' },
        h('div', {}, h('dt', {}, 'Attended'), h('dd', {}, `${show(s.classesAttended)} of ${show(s.classesHeld)}`)),
        h('div', {}, h('dt', {}, 'Attendance'), h('dd', {}, formatPercent(an.percent))),
        h('div', {}, h('dt', {}, 'Target'), h('dd', {}, `${target}%`)),
        h('div', {}, h('dt', {}, 'Status'), h('dd', {}, h('span', { class: `chip att-status att-${an.state}` }, h('span', { 'aria-hidden': 'true' }, ICONS[an.state]), STATE_LABELS[an.state])))),
      h('p', { class: 'att-advice' }, describeAdvice(an)),
      form);
  }

  function render(data) {
    const target = effectiveTarget(data.settings);
    if (document.activeElement !== els.targetInput) els.targetInput.value = String(target);
    const subjects = readSubjects(data);
    els.list.replaceChildren(...(subjects.length
      ? subjects.map((s, i) => card(s, i, target))
      : [h('li', { class: 'att-empty' }, h('p', {}, h('strong', {}, 'No subjects yet.')), h('p', {}, 'Add your first subject above, then enter the classes held and attended so far.'))]));
  }
  return { render };
}
