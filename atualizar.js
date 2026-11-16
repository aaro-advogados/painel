// Busca os dados no Meta Ads, calcula e gera site/index.html.
// Uso: META_TOKEN=... node painel/atualizar.js [--forcar]
const fs = require('fs');
const path = require('path');
const ACC = 'act_866178753432051';
const API = 'https://graph.facebook.com/v21.0';
const TOKEN = process.env.META_TOKEN;
const FORCAR = process.argv.includes('--forcar') || process.env.FORCAR === 'true';
const DIR = __dirname;
const SITE = 'https://aaro-advogados.github.io/painel/';
const minutoBR = Number(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', minute: '2-digit' }));
let COMPLETA = FORCAR || process.env.COMPLETA === 'true' || minutoBR < 20;
const OUT = path.join(DIR, '..', 'site');

// ---------- datas em Brasília ----------
const agora = new Date();
const hojeBR = agora.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const addD = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const ano = Number(hojeBR.slice(0, 4));

// ---------- feriados nacionais (Páscoa calculada) ----------
function pascoa(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return `${y}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}
function feriados(y) {
  const p = pascoa(y);
  return new Set([`${y}-01-01`, addD(p, -48), addD(p, -47), addD(p, -2), `${y}-04-21`, `${y}-05-01`, addD(p, 60), `${y}-09-07`, `${y}-10-12`, `${y}-11-02`, `${y}-11-15`, `${y}-11-20`, `${y}-12-25`]);
}
const diaSemana = new Date(hojeBR + 'T12:00:00Z').getUTCDay();
const pular = !FORCAR && (diaSemana === 0 || diaSemana === 6 || feriados(ano).has(hojeBR));
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `pular=${pular}\n`);
if (pular) { console.log('Fim de semana ou feriado (' + hojeBR + '): sem atualização.'); process.exit(0); }
if (!TOKEN) { console.error('Falta o segredo META_TOKEN.'); process.exit(1); }

// ---------- Graph API ----------
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, tent = 0) {
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + TOKEN } });
  const j = await res.json().catch(() => ({}));
  if (j.error) {
    const lim = [4, 17, 32, 613, 80000, 80004].includes(j.error.code) || j.error.is_transient;
    if (tent < 5 && (lim || res.status >= 500)) { await espera(15000 * (tent + 1)); return get(url, tent + 1); }
    throw new Error('Meta: ' + j.error.message + ' (código ' + j.error.code + ')');
  }
  return j;
}
async function insights(p) {
  const q = new URLSearchParams({ limit: '500' });
  for (const [k, v] of Object.entries(p)) q.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  let url = `${API}/${ACC}/insights?${q}`;
  const out = [];
  while (url) { const j = await get(url); out.push(...(j.data || [])); url = j.paging && j.paging.next; }
  return out;
}
const meses = (de, ate) => { const r = []; let s = de; while (s <= ate) { const fimMes = addD(addD(s.slice(0, 7) + '-01', 32).slice(0, 7) + '-01', -1); const e = fimMes < ate ? fimMes : ate; r.push([s, e]); s = addD(e, 1); } return r; };
async function porMes(de, ate, p) { const all = []; for (const [s, e] of meses(de, ate)) all.push(...await insights({ ...p, time_range: { since: s, until: e } })); return all; }
const acao = (arr, tipos) => { if (!Array.isArray(arr)) return null; for (const t of tipos) { const f = arr.find((a) => a.action_type === t); if (f) return Number(f.value); } return null; };
const num = (v) => (v == null || v === '' ? null : Number(v));
const linha = (r) => ({
  date_start: r.date_start, date_stop: r.date_stop,
  name: r.ad_name || r.campaign_name, id: r.ad_id || r.campaign_id, campaign_name: r.campaign_name, ad_id: r.ad_id,
  lead: acao(r.actions, ['lead', 'onsite_conversion.lead_grouped', 'offsite_conversion.fb_pixel_lead']),
  amount_spent: num(r.spend), impressions: num(r.impressions),
  link_click: acao(r.actions, ['link_click']) ?? num(r.inline_link_clicks),
  age: r.age, gender: r.gender, hourly_stats_aggregated_by_advertiser_time_zone: r.hourly_stats_aggregated_by_advertiser_time_zone,
});

(async () => {
  const iniAno = `${ano}-01-01`, iniAnt = `${ano - 1}-01-01`, fimAnt = `${ano - 1}-12-31`, ini15 = addD(hojeBR, -14), iniMes = hojeBR.slice(0, 8) + '01';
  const C = { level: 'campaign', fields: 'campaign_name,campaign_id,spend,impressions,inline_link_clicks,actions' };
  const H = { level: 'campaign', fields: 'campaign_name,campaign_id,spend,actions', breakdowns: 'hourly_stats_aggregated_by_advertiser_time_zone' };
  const G = { level: 'campaign', fields: 'campaign_name,campaign_id,spend,actions', breakdowns: 'age,gender' };
  const L = (a) => a.map(linha);
  const isL = (r) => String(r.name).toUpperCase().includes('LOAS'), isC = (r) => String(r.name).toUpperCase().includes('CONCESS');

  // atualização leve: parte do último painel publicado e troca só o dia de hoje
  let anterior = null, printsAnt = null;
  if (!COMPLETA) {
    try {
      const t = Date.now();
      const [d, p] = await Promise.all([fetch(SITE + 'dados.json?t=' + t), fetch(SITE + 'prints.json?t=' + t)]);
      if (d.ok && p.ok) { anterior = await d.json(); printsAnt = await p.json(); }
    } catch (e) {}
    if (!anterior || !anterior.grupos_dia) { console.log('Sem base publicada: fazendo atualização completa.'); COMPLETA = true; }
  }
  console.log((COMPLETA ? 'Atualização completa' : 'Atualização rápida (só hoje)') + ' até', hojeBR);

  const rows = { hora_hoje: [], perfil_hoje: [] };
  const dHoje = { since: hojeBR, until: hojeBR };
  if (COMPLETA) {
    rows.camp_dia_atual = L(await porMes(iniAno, hojeBR, { ...C, time_increment: 1 }));
    rows.camp_dia_anterior = L(await porMes(iniAnt, fimAnt, { ...C, time_increment: 1 }));
    rows.hora_14d = L(await insights({ ...H, time_increment: 1, time_range: { since: ini15, until: hojeBR } }));
    const hmA = L(await porMes(iniAno, hojeBR, { ...H, time_increment: 'monthly' }));
    const hmP = L(await porMes(iniAnt, fimAnt, { ...H, time_increment: 'monthly' }));
    rows.perfil_14d = L(await insights({ ...G, time_increment: 1, time_range: { since: ini15, until: hojeBR } }));
    const pmA = L(await porMes(iniAno, hojeBR, { ...G, time_increment: 'monthly' }));
    const pmP = L(await porMes(iniAnt, fimAnt, { ...G, time_increment: 'monthly' }));
    rows.ads_mes = L(await insights({ level: 'ad', fields: 'ad_name,ad_id,campaign_name,spend,actions', time_increment: 1, time_range: { since: iniMes, until: hojeBR } }));
    Object.assign(rows, {
      hora_mes_loas_atual: hmA.filter(isL), hora_mes_conc_atual: hmA.filter(isC), hora_mes_loas_ant: hmP.filter(isL), hora_mes_conc_ant: hmP.filter(isC),
      perfil_mes_loas_atual: pmA.filter(isL), perfil_mes_conc_atual: pmA.filter(isC), perfil_mes_loas_ant: pmP.filter(isL), perfil_mes_conc_ant: pmP.filter(isC),
    });
  } else {
    rows.camp_dia_atual = L(await insights({ ...C, time_increment: 1, time_range: dHoje }));
    rows.hora_14d = L(await insights({ ...H, time_increment: 1, time_range: dHoje }));
    rows.perfil_14d = L(await insights({ ...G, time_increment: 1, time_range: dHoje }));
    rows.ads_mes = L(await insights({ level: 'ad', fields: 'ad_name,ad_id,campaign_name,spend,actions', time_increment: 1, time_range: dHoje }));
  }

  // criativos: id do criativo de cada anúncio com lead
  const adIds = [...new Set(rows.ads_mes.filter((r) => r.lead > 0).map((r) => r.ad_id))];
  const cri = {};
  for (let i = 0; i < adIds.length; i += 50) {
    const j = await get(`${API}/?ids=${adIds.slice(i, i + 50).join(',')}&fields=creative{id}`);
    for (const [id, v] of Object.entries(j)) cri[id] = v.creative && v.creative.id;
  }
  rows.ads_mes.forEach((r) => { r.creative_id = cri[r.ad_id] || null; });

  // cálculos (os mesmos do painel)
  const tpl = fs.readFileSync(path.join(DIR, 'template.html'), 'utf8');
  const calcSrc = [...tpl.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes("dash.calc('grupos_dia'"));
  const calcs = {};
  new Function('dash', calcSrc)({ calc: (id, d) => { calcs[id] = d; } });
  const data = {};
  for (const id of ['grupos_dia', 'grupos_hora', 'grupos_hora_mes', 'perfil_dia', 'perfil_mes', 'criativos_dia']) data[id] = calcs[id].fn(...calcs[id].inputs.map((i) => rows[i] || []));
  if (!COMPLETA) {
    for (const k of ['grupos_dia', 'grupos_hora', 'perfil_dia', 'criativos_dia']) data[k] = anterior[k].filter((r) => r.dia !== hojeBR).concat(data[k]);
    for (const k of ['grupos_hora_mes', 'perfil_mes']) data[k] = anterior[k];
  }
  // garante uma linha por dia e frente (dias sem veiculação = zero), até hoje
  const tem = new Set(data.grupos_dia.map((r) => r.grupo + '|' + r.dia));
  const ini = data.grupos_dia.reduce((m, r) => (r.dia < m ? r.dia : m), `${ano - 1}-01-01`);
  for (let d = ini; d <= hojeBR; d = addD(d, 1)) for (const g of ['concessao', 'loas']) if (!tem.has(g + '|' + d)) data.grupos_dia.push({ grupo: g, dia: d, leads: 0, investimento: 0, impressoes: 0, cliques: 0 });
  const ord = (a, b) => (a.dia < b.dia ? -1 : a.dia > b.dia ? 1 : (a.hora || 0) - (b.hora || 0) || (a.grupo < b.grupo ? -1 : a.grupo > b.grupo ? 1 : 0));
  for (const k of ['grupos_dia', 'grupos_hora', 'perfil_dia', 'criativos_dia']) data[k].sort(ord);
  for (const k in data) console.log(k, data[k].length);

  // prints: os salvos + miniatura do Meta para criativos novos
  const prints = Object.assign(new Function('window', fs.readFileSync(path.join(DIR, 'prints.js'), 'utf8') + ';return window.arPrints;')({}), printsAnt || {});
  const norm = (n) => String(n || '').toLowerCase().split(/\s+/).filter(Boolean).join(' ');
  const faltam = new Map();
  data.criativos_dia.forEach((o) => { if (!prints[norm(o.nome)] && o.creative_id && !faltam.has(norm(o.nome))) faltam.set(norm(o.nome), o.creative_id); });
  for (const [nome, cid] of faltam) {
    try {
      const c = await get(`${API}/${cid}?fields=thumbnail_url,image_url&thumbnail_width=400&thumbnail_height=400`);
      const u = c.image_url || c.thumbnail_url; if (!u) continue;
      const img = await fetch(u); if (!img.ok) continue;
      const tipo = img.headers.get('content-type') || 'image/jpeg';
      prints[nome] = `data:${tipo};base64,` + Buffer.from(await img.arrayBuffer()).toString('base64');
      console.log('print novo:', nome);
    } catch (e) { console.log('sem print:', nome, e.message); }
  }

  fs.mkdirSync(OUT, { recursive: true });
  const html = require('./montar.js')(tpl, prints, data, agora);
  fs.writeFileSync(path.join(OUT, 'index.html'), html);
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
  fs.writeFileSync(path.join(OUT, 'dados.json'), JSON.stringify(data));
  fs.writeFileSync(path.join(OUT, 'prints.json'), JSON.stringify(prints));
  console.log('site/index.html gerado,', html.length, 'bytes');
})().catch((e) => { console.error(e); process.exit(1); });
