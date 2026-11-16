// Monta a página final com dados e prints embutidos.
module.exports = (tpl, prints, data, agora) => {
  tpl = tpl.replace('<meta name="dash-one-writer">\n', '');
  tpl = tpl.replace(/<script>\s*const LOADER = __LOADER__;[\s\S]*?<\/script>/, '');
  tpl = tpl.replace('<script src="prints.js"></script>', () => '<script>window.arPrints = ' + JSON.stringify(prints) + ';</script>');
  tpl = tpl.split('new Date().toLocaleDateString(').join('window.arAgora().toLocaleDateString(');
  const quando = agora.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ' às');
  tpl = tpl.replace('<p class="ar-head-titulo">Painel de Performance · AARO Advogados Associados</p>',
    () => '<p class="ar-head-titulo">Painel de Performance · AARO Advogados Associados</p>\n    <p class="ar-snap"><i></i>Dados do Meta Ads atualizados em ' + quando + ' (horário de Brasília)</p>');
  const head = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>Painel AARO Advogados</title>
<style>html{color-scheme:dark}body{margin:0;font-size:14px}img{max-width:100%}[hidden]{display:none!important}</style>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600&display=swap">
<style>
  :root {
    color-scheme: dark;
    --font-anthropic-sans: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    --font-anthropic-serif: 'Cormorant Garamond', 'Iowan Old Style', Georgia, 'Times New Roman', serif;
    --cds-gap-xs: 4px; --cds-gap-sm: 8px; --cds-gap-md: 12px; --cds-gap-lg: 16px; --cds-gap-xl: 24px;
    --cds-pad-xs: 4px; --cds-pad-sm: 8px; --cds-pad-md: 12px; --cds-pad-lg: 18px;
    --cds-radius: 10px;
    --cds-font-size-caption: 12px; --cds-font-size-body: 14px; --cds-font-size-heading: 18px; --cds-font-size-title: 26px;
    --cds-font-weight-medium: 500;
    --cds-dur-slow: 600ms; --cds-ease-out: cubic-bezier(.2, .8, .2, 1);
    --snap-bg: #0A0A0B; --snap-fg: #F3EEE4;
  }
  html, body { background: var(--snap-bg); color: var(--snap-fg); }
  body { font-family: var(--font-anthropic-sans); -webkit-font-smoothing: antialiased; }
  #dash-root { padding-left: max(0px, env(safe-area-inset-left, 0px)); padding-right: max(0px, env(safe-area-inset-right, 0px)); }
  .dash-skeleton { position: relative; }
  input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(.8) sepia(.4); cursor: pointer; }
  .ar-snap { margin: 6px 0 0; text-align: center; font-size: 12px; letter-spacing: .04em; color: #9A9283; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .ar-snap i { width: 6px; height: 6px; border-radius: 50%; background: #C9A24A; box-shadow: 0 0 0 3px rgba(201, 162, 74, .18); }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; } }
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>
<script>
(function () {
  const DATA = ${JSON.stringify(data)};
  const STAMP = new Date(${JSON.stringify(agora.toISOString())});
  window.arAgora = () => STAMP;
  const DEF = { paleta: 'noir', loas_dias: 1, concessao_dias: 1 };
  let P = Object.assign({}, DEF);
  try { const s = JSON.parse(sessionStorage.getItem('ar-filtros') || 'null'); if (s) P = s; } catch (e) {}
  const salvar = () => { try { sessionStorage.setItem('ar-filtros', JSON.stringify(P)); } catch (e) {} };
  const draws = {}, subs = [];
  let queued = false, ready = false;
  const runOne = (name) => {
    const fn = draws[name]; if (!fn) return;
    document.querySelectorAll('[data-draw="' + name + '"]').forEach((el) => { try { fn(el); el.classList.remove('dash-skeleton'); } catch (e) { console.error(name, e); } });
  };
  const runAll = () => { queued = false; if (!ready) return; Object.keys(draws).forEach(runOne); subs.forEach((f) => { try { f(); } catch (e) { console.error(e); } }); };
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(runAll); } };
  window.dash = {
    data: (id) => ({ status: 'ok', data: DATA[id] || [] }),
    calc() {}, loader() {},
    draw(name, fn) { if (typeof fn === 'function') { draws[name] = fn; schedule(); } else runOne(name); },
    onData(fn) { subs.push(fn); schedule(); },
    params: () => Object.assign({}, P),
    setParams(o) { for (const k in o) { if (o[k] == null) delete P[k]; else P[k] = o[k]; } salvar(); schedule(); },
    resetParams() { P = Object.assign({}, DEF); salvar(); schedule(); },
  };
  document.addEventListener('DOMContentLoaded', () => { ready = true; schedule(); });
  let w = 0; window.addEventListener('resize', () => { if (Math.abs(innerWidth - w) > 8) { w = innerWidth; schedule(); } });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  setInterval(() => { if (document.visibilityState === 'visible' && !document.querySelector('input:focus')) location.reload(); }, 15 * 60 * 1000);
})();
</script>
</head>
<body>
<div id="dash-root">
__CORPO__`;
  // calendário geral no filtro de cima: aplica às duas frentes
  tpl = tpl.replace('<button type="button" data-j="mes" aria-pressed="false">Mês passado</button>\n    </div>', () => `<button type="button" data-j="mes" aria-pressed="false">Mês passado</button>
    </div>
    <div class="ar-dates ar-cal" role="group" aria-label="Período por calendário">
      <label>De <input type="date" id="per-de" aria-label="Período, de"></label>
      <label>Até <input type="date" id="per-ate" aria-label="Período, até"></label>
    </div>`);
  tpl = tpl.replace('</style>', () => `  .ar-janela-wrap { flex-wrap: wrap; align-items: center; gap: var(--cds-gap-md); }
  .ar-cal { border: 1px solid var(--color-border-line); border-radius: 999px; padding: 4px 14px; align-items: center; }
  .ar-cal input { border-color: transparent; background: transparent; }
  .ar-cal input:hover, .ar-cal input:focus { border-color: var(--ar-gold); }
  .ar-cal.ar-on { border-color: var(--ar-gold); }
</style>`);
  tpl += `
<script>
  (() => {
    const de = document.getElementById('per-de'), ate = document.getElementById('per-ate'), cal = document.querySelector('.ar-cal');
    if (!de || !ate) return;
    const aplicar = () => {
      if (!de.value || !ate.value || !de.validity.valid || !ate.validity.valid) return;
      let a = de.value, b = ate.value; if (a > b) [a, b] = [b, a];
      dash.setParams({ loas_de: a, loas_ate: b, concessao_de: a, concessao_ate: b });
    };
    de.addEventListener('change', aplicar); ate.addEventListener('change', aplicar);
    dash.onData(() => {
      const s = window.arBloco('loas'), c = window.arBloco('concessao');
      if (s.status !== 'ok') return;
      [de, ate].forEach((i) => { i.min = s.min; i.max = s.max; });
      if (document.activeElement !== de) de.value = s.de;
      if (document.activeElement !== ate) ate.value = s.ate;
      const algum = [...document.querySelectorAll('.ar-janela button')].some((b) => b.getAttribute('aria-pressed') === 'true');
      cal.classList.toggle('ar-on', !algum && c.status === 'ok' && c.de === s.de && c.ate === s.ate);
    });
  })();
</script>`;
  return head.replace('__CORPO__', () => tpl) + '\n</div>\n</body>\n</html>\n';
};
