/** Tiny DOM helpers. Text always goes in as text nodes or textContent, never innerHTML. */
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  el.append(...kids.flat().filter((c) => c != null && c !== false));
  return el;
}

const NS = 'http://www.w3.org/2000/svg';
function svg(tag, attrs) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

/** Decorative priority mark (ring, half, filled). The text label carries the meaning. */
export function priorityIcon(priority) {
  const s = svg('svg', { viewBox: '0 0 12 12', width: '12', height: '12', 'aria-hidden': 'true' });
  s.append(svg('circle', { cx: '6', cy: '6', r: '4.5', stroke: 'currentColor', 'stroke-width': '1.5', fill: priority === 'high' ? 'currentColor' : 'none' }));
  if (priority === 'medium') s.append(svg('path', { d: 'M6 1.5a4.5 4.5 0 0 1 0 9z', fill: 'currentColor' }));
  return s;
}
