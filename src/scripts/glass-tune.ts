/**
 * TEMPORARY: glass tuning panel (?glass=tune). The owner picks values on an iPhone, they go into the
 * :root variables of the Glass block in styles/global.css, then this file and its import in common.ts
 * are deleted. Fill sliders stop at 0.71: below that text on the glass may drop under 4.5:1.
 */
const SLIDERS = [
  { group: 'Тёмные секции', key: '--glass-dark-blur', label: 'Размытие, px', min: 0, max: 40, step: 1, unit: 'px' },
  { group: 'Тёмные секции', key: '--glass-dark-sat', label: 'Насыщенность, %', min: 100, max: 250, step: 5, unit: '%' },
  { group: 'Тёмные секции', key: '--glass-dark-fill', label: 'Заливка', min: 0.71, max: 0.95, step: 0.01, unit: '' },
  { group: 'Тёмные секции', key: '--glass-dark-hl', label: 'Блик', min: 0, max: 0.5, step: 0.01, unit: '' },
  { group: 'Светлые секции', key: '--glass-light-blur', label: 'Размытие, px', min: 0, max: 40, step: 1, unit: 'px' },
  { group: 'Светлые секции', key: '--glass-light-sat', label: 'Насыщенность, %', min: 100, max: 250, step: 5, unit: '%' },
  { group: 'Светлые секции', key: '--glass-light-fill', label: 'Заливка', min: 0.71, max: 0.95, step: 0.01, unit: '' },
  { group: 'Светлые секции', key: '--glass-light-hl', label: 'Блик', min: 0, max: 1, step: 0.05, unit: '' },
];

export function mountGlassTune() {
  const root = document.documentElement;
  const cs = getComputedStyle(root);
  const current = (key: string) => parseFloat(cs.getPropertyValue(key)) || 0;

  const panel = document.createElement('div');
  panel.style.cssText = [
    'position:fixed',
    'z-index:200',
    'left:0.5rem',
    'top:calc(max(0.75rem, env(safe-area-inset-top)) + 4.25rem)',
    'width:min(16.5rem, calc(100vw - 1rem))',
    'max-height:70vh',
    'overflow:auto',
    'padding:0.6rem 0.75rem',
    'border:1px solid rgb(236 240 241 / 0.2)',
    'border-radius:0.75rem',
    'background:rgb(9 11 15 / 0.94)',
    'color:#ecf0f1',
    'font:12px/1.35 ui-monospace, monospace',
  ].join(';');
  let group = '';
  const rows = SLIDERS.map((s) => {
    const head = s.group !== group ? `<p style="margin:6px 0 4px;color:#46c8d9">${(group = s.group)}</p>` : '';
    const v = current(s.key);
    return `${head}<label style="display:grid;gap:2px;margin-bottom:6px">
      <span>${s.label}: <b data-out="${s.key}">${v}</b></span>
      <input type="range" data-key="${s.key}" min="${s.min}" max="${s.max}" step="${s.step}" value="${v}" style="width:100%;accent-color:#46c8d9">
    </label>`;
  }).join('');
  panel.innerHTML = `<details${window.innerWidth >= 768 ? ' open' : ''}>
      <summary style="cursor:pointer">Стекло: настройка</summary>
      ${rows}
      <p data-values style="margin:6px 0 0;opacity:0.75;user-select:all;word-break:break-word"></p>
    </details>`;

  const showValues = () => {
    panel.querySelector('[data-values]')!.textContent = SLIDERS.map((s) => `${s.key.replace('--glass-', '')} ${current(s.key)}`).join(' · ');
  };
  panel.addEventListener('input', (e) => {
    const input = e.target as HTMLInputElement;
    const s = SLIDERS.find((x) => x.key === input.dataset.key);
    if (!s) return;
    root.style.setProperty(s.key, `${input.value}${s.unit}`);
    panel.querySelector(`[data-out="${s.key}"]`)!.textContent = input.value;
    showValues();
  });
  showValues();
  document.body.append(panel);
}
