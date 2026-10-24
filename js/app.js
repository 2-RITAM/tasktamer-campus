import { load, save, applyTaskChange } from './ui/storage-adapter.js';
import { applySubjectChange } from './core/subjects.js';
import { createTasksView } from './ui/tasks.js';
import { createAttendanceView } from './ui/attendance.js';
import { renderSummary } from './ui/dashboard.js';
import { h } from './ui/dom.js';

const $ = (s) => document.querySelector(s);

const ROUTES = [
  { id: 'tasks', label: 'Tasks' },
  { id: 'attendance', label: 'Attendance' },
];

const loaded = load();
let data = loaded.data;

const banner = $('#banner');
const showBanner = (msg) => {
  banner.textContent = msg;
  banner.hidden = false;
};
const hideBanner = () => {
  banner.hidden = true;
  banner.textContent = '';
};

function announce(msg) {
  const el = $('#status');
  el.textContent = '';
  setTimeout(() => {
    el.textContent = msg;
  }, 50);
}

/** Shared write path for tasks, subjects and attendance settings. */
function commit(change, okMessage) {
  const isAttendanceChange =
    change.type.startsWith('subject:') ||
    change.type === 'settings:setTarget';

  const res = isAttendanceChange
    ? applySubjectChange(data, change)
    : applyTaskChange(data, change);

  if (!res.ok) {
    if (res.reason === 'not-found') {
      announce(
        isAttendanceChange
          ? 'That subject no longer exists.'
          : 'That task no longer exists.'
      );
      render();
    }
    return { ...res, saved: true };
  }

  if (!res.changed) return { ...res, saved: true };

  // Keep the change in memory even if local storage fails.
  data = res.data;
  const saved = save(data);

  if (saved.ok) {
    hideBanner();
  } else {
    showBanner(
      "Changes won't be saved on this device. Copy anything important before closing this tab."
    );
  }

  render();
  if (okMessage) announce(okMessage);

  return { ...res, saved: saved.ok };
}

const tasksView = createTasksView({
  getData: () => data,
  commit,
  announce,
  els: {
    list: $('#task-list'),
    filters: $('#filters'),
    empty: $('#empty'),
    add: $('#add-task'),
    dialog: $('#task-dialog'),
    dialogTitle: $('#task-dialog-title'),
    form: $('#task-form'),
    submit: $('#submit-task'),
    cancel: $('#cancel-task'),
    confirm: $('#confirm-dialog'),
    confirmText: $('#confirm-text'),
    confirmYes: $('#confirm-yes'),
    confirmNo: $('#confirm-no'),
  },
});

const attendanceView = createAttendanceView({
  getData: () => data,
  commit,
  announce,
  els: {
    feedback: $('#att-feedback'),
    targetForm: $('#target-form'),
    targetInput: $('#att-target'),
    addForm: $('#subject-form'),
    confirmNo: $('#subject-confirm-no'),
    confirmYes: $('#subject-confirm-yes'),
    confirm: $('#subject-confirm'),
    confirmText: $('#subject-confirm-text'),
    list: $('#subject-list'),
  },
});

function render() {
  const hr = new Date().getHours();

  $('#greeting').textContent =
    hr < 12 ? 'Good morning' :
    hr < 18 ? 'Good afternoon' :
    'Good evening';

  const open = data.tasks.filter((t) => t.status !== 'done').length;

  $('#lede').textContent =
    data.tasks.length === 0
      ? 'Nothing planned yet.'
      : open === 0
        ? 'Everything is done.'
        : `${open} ${open === 1 ? 'task' : 'tasks'} still open.`;

  renderSummary($('#summary'), data);
  tasksView.render(data);
  attendanceView.render(data);
}

function renderRoute(shouldFocus = false) {
  const requested = location.hash.replace(/^#\/?/, '');
  const activeId = ROUTES.some((route) => route.id === requested)
    ? requested
    : 'tasks';

  $('#view-tasks').hidden = activeId !== 'tasks';
  $('#view-attendance').hidden = activeId !== 'attendance';

  $('#nav').replaceChildren(
    ...ROUTES.map((route) =>
      h(
        'a',
        {
          href: `#/${route.id}`,
          ...(route.id === activeId ? { 'aria-current': 'page' } : {}),
        },
        route.label
      )
    )
  );

  if (shouldFocus) {
    $(activeId === 'attendance' ? '#att-heading' : '#greeting').focus();
  }
}

$('#nav').addEventListener('click', (event) => {
  if (event.target.closest('a')) {
    // The hashchange handler switches the view.
  }
});

window.addEventListener('hashchange', () => renderRoute(true));

if (loaded.warnings.length) showBanner(loaded.warnings[0]);

render();
renderRoute();