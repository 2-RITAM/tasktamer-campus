import { load, save, applyTaskChange } from './ui/storage-adapter.js';
import { createTasksView } from './ui/tasks.js';
import { renderSummary } from './ui/dashboard.js';
import { h } from './ui/dom.js';

const $ = (s) => document.querySelector(s);
const ROUTES = [{ id: 'tasks', label: 'Tasks' }]; // more views arrive in later milestones

const loaded = load();
let data = loaded.data;

const banner = $('#banner');
const showBanner = (msg) => { banner.textContent = msg; banner.hidden = false; };
const hideBanner = () => { banner.hidden = true; banner.textContent = ''; };

function announce(msg) {
  const el = $('#status');
  el.textContent = '';
  setTimeout(() => { el.textContent = msg; }, 50); // re-trigger the live region for repeated messages
}

/** The single write path. Every UI mutation goes through here. */
function commit(change, okMessage) {
  const res = applyTaskChange(data, change);
  if (!res.ok) {
    if (res.reason === 'not-found') { announce('That task no longer exists.'); render(); }
    return res;
  }
  if (!res.changed) return res;
  data = res.data; // keep the change in memory even if it cannot be saved
  const saved = save(data);
  if (saved.ok) hideBanner();
  else showBanner("Changes won't be saved on this device. Copy anything important before closing this tab.");
  render();
  announce(okMessage);
  return res;
}

const tasksView = createTasksView({
  getData: () => data, commit, announce,
  els: {
    list: $('#task-list'), filters: $('#filters'), empty: $('#empty'), add: $('#add-task'),
    dialog: $('#task-dialog'), dialogTitle: $('#task-dialog-title'), form: $('#task-form'),
    submit: $('#submit-task'), cancel: $('#cancel-task'),
    confirm: $('#confirm-dialog'), confirmText: $('#confirm-text'), confirmYes: $('#confirm-yes'), confirmNo: $('#confirm-no'),
  },
});

function render() {
  const hr = new Date().getHours();
  $('#greeting').textContent = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const open = data.tasks.filter((t) => t.status !== 'done').length;
  $('#lede').textContent = data.tasks.length === 0 ? 'Nothing planned yet.' : open === 0 ? 'Everything is done.' : `${open} ${open === 1 ? 'task' : 'tasks'} still open.`;
  renderSummary($('#summary'), data);
  tasksView.render(data);
}

$('#nav').replaceChildren(...ROUTES.map((r) => h('a', { href: `#/${r.id}`, 'aria-current': 'page' }, r.label)));
if (loaded.warnings.length) showBanner(loaded.warnings[0]);
render();
