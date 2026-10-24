import { h } from './dom.js';

/** Renders summary counts from real data. Due-soon and overdue counts wait for core/deadlines.js. */
export function renderSummary(el, data) {
  const done = data.tasks.filter((t) => t.status === 'done').length;
  const stat = (label, n) => h('div', { class: 'stat' }, h('dt', {}, label), h('dd', {}, String(n)));
  el.replaceChildren(stat('Total', data.tasks.length), stat('Open', data.tasks.length - done), stat('Done', done));
}
