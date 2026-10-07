/**
 * TEMPORARY: tuning panel for the intro (?intro=tune). The owner picks values by eye, they go into
 * config/intro.ts, then this file and its import in stage.ts are deleted.
 */
import type { IntroControl } from './stage';

const SLIDERS = [
  { key: 'markY', label: 'Высота знака, % от верха', min: 0.25, max: 0.55, step: 0.01, scale: 100 },
  { key: 'langsGap', label: 'Высота кнопок языка: отступ от знака, px', min: 0.25, max: 8, step: 0.25, scale: 16 },
  { key: 'buttonsOut', label: 'Уход кнопок, с', min: 0.1, max: 0.8, step: 0.05, scale: 1 },
  { key: 'outline', label: 'Контур, с', min: 0.2, max: 1.5, step: 0.05, scale: 1 },
  { key: 'fill', label: 'Заливка, с', min: 0.2, max: 1.5, step: 0.05, scale: 1 },
  { key: 'fly', label: 'Улёт, с', min: 0.2, max: 1.5, step: 0.05, scale: 1 },
] as const;

export function mountIntroTune(control: IntroControl) {
  const panel = document.createElement('div');
  panel.setAttribute('data-intro-tune', '');
  panel.style.cssText = [
    'position:fixed',
    'z-index:200',
    'top:max(0.5rem, env(safe-area-inset-top))',
    'right:0.5rem',
    'width:min(16rem, calc(100vw - 1rem))',
    'padding:0.6rem 0.75rem',
    'border:1px solid rgb(236 240 241 / 0.2)',
    'border-radius:0.75rem',
    'background:rgb(9 11 15 / 0.92)',
    'color:#ecf0f1',
    'font:12px/1.35 ui-monospace, monospace',
  ].join(';');

  const rows = SLIDERS.map((s) => {
    const value = control.timing[s.key];
    return `<label style="display:grid;gap:2px;margin-bottom:6px">
      <span>${s.label}: <b data-out="${s.key}">${+(value * s.scale).toFixed(2)}</b></span>
      <input type="range" data-key="${s.key}" min="${s.min}" max="${s.max}" step="${s.step}" value="${value}" style="width:100%;accent-color:#46c8d9">
    </label>`;
  }).join('');
  panel.innerHTML = `
    <details${window.innerWidth >= 768 ? ' open' : ''}>
      <summary style="cursor:pointer;margin-bottom:6px">Интро: настройка</summary>
      ${rows}
      <button type="button" data-replay style="width:100%;min-height:36px;margin-top:2px;border:1px solid rgb(236 240 241 / 0.3);border-radius:8px;color:#ecf0f1">Проиграть ещё раз</button>
      <p data-values style="margin:6px 0 0;opacity:0.7;user-select:all"></p>
    </details>`;

  const showValues = () => {
    const t = control.timing;
    panel.querySelector('[data-values]')!.textContent =
      `markY ${t.markY} · langsGap ${t.langsGap} · кнопки ${t.buttonsOut} · контур ${t.outline} · заливка ${t.fill} · улёт ${t.fly}`;
  };
  panel.addEventListener('input', (e) => {
    const input = e.target as HTMLInputElement;
    const s = SLIDERS.find((x) => x.key === input.dataset.key);
    if (!s) return;
    const v = Number(input.value);
    control.timing[s.key] = v;
    if (s.key === 'markY') control.setMarkY(v);
    if (s.key === 'langsGap') control.setLangsGap(v);
    panel.querySelector(`[data-out="${s.key}"]`)!.textContent = String(+(v * s.scale).toFixed(2));
    showValues();
  });
  panel.querySelector('[data-replay]')!.addEventListener('click', () => control.replay());
  // The panel stays usable while the rest of the page is inert and scrolling is blocked.
  panel.addEventListener('wheel', (e) => e.stopPropagation());
  panel.addEventListener('touchmove', (e) => e.stopPropagation());
  showValues();
  document.body.append(panel);
}
