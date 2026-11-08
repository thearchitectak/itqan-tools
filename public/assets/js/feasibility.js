import { h, $$, ico, toast, download, esc } from './ui.js';
import { normalizeInputs, computeModel, fmtMoney, fmtPct, fmtYears, currencyCode } from './finance.js';
import { MODE_INFO, MODE_IDS } from './defaults.js';
import { supportNudge } from './profile.js';
import { financialEditor, blankTechnical, manualMarket, manualSummary, verdictFor } from './feas-manual.js';

const REASONS = { credit: 'نفد الرصيد حاليًا', quota: 'تجاوز الحد اليومي', nokey: 'غير مفعّل حاليًا', auth: 'غير متاح حاليًا', disabled: 'متوقف حاليًا', offline: 'غير متاح على هذه الاستضافة' };
const PROVIDER_NAME = { anthropic: 'Claude', gemini: 'Gemini', manual: 'الوضع اليدوي' };

// نص موعد تجدد الحصة، مثل: «يتجدد غدًا الساعة 11:00 ص»
function renewText(iso) {
  if (!iso) return '';
  const d = new Date(iso); if (isNaN(d)) return '';
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(d) - day(new Date())) / 864e5);
  const when = diff <= 0 ? 'اليوم' : diff === 1 ? 'غدًا' : d.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' });
  return `يتجدد ${when} الساعة ${d.toLocaleTimeString('ar-SA-u-nu-latn', { hour: 'numeric', minute: '2-digit' })}`;
}

const DRAFT_KEY = 'itqan-feas-draft', RESULT_KEY = 'itqan-feas-result';
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } }, del(k) { try { localStorage.removeItem(k); } catch { } } };

export function renderFeasibility(body, t, CONFIG) {
  const sections = CONFIG.feasibility.sections;
  let answers = store.get(DRAFT_KEY) || {};
  let step = 0;
  let modeStatus = null, selectedMode = null;
  const modeBox = h('div');
  async function loadStatus(refresh) {
    try {
      const r = await fetch('/api/ai-status', { cache: 'no-store' });
      if (!r.ok) throw 0;
      const d = await r.json(); modeStatus = d.status;
      if (!selectedMode || !modeStatus[selectedMode]?.available) selectedMode = [d.defaultMode, ...MODE_IDS].find(m => modeStatus[m]?.available) || null;
    } catch {
      modeStatus = { anthropic: { available: false, reason: 'offline' }, gemini: { available: false, reason: 'offline' }, manual: { available: CONFIG.feasibility.modes?.manual?.enabled !== false, reason: null } };
      selectedMode = modeStatus.manual.available ? 'manual' : null;
    }
    drawModes();
  }
  function drawModes() {
    modeBox.innerHTML = '';
    if (!modeStatus) { modeBox.append(h('p', { class: 'muted' }, 'جارٍ التحقق من الطبقات المتاحة…')); return; }
    const grid = h('div', { class: 'modes' });
    for (const m of MODE_IDS) {
      const st = modeStatus[m] || { available: false, reason: 'disabled' };
      if (CONFIG.feasibility.modes?.[m]?.enabled === false) continue; // الطبقة التي أوقفها المالك لا تُعرض
      const info = MODE_INFO[m];
      const card = h('button', { type: 'button', class: 'mode' + (st.available ? '' : ' off') + (m === selectedMode ? ' on' : ''), disabled: !st.available, 'data-mode': m, 'aria-pressed': m === selectedMode ? 'true' : 'false' },
        h('span', { class: 'mode-top' }, h('b', {}, info.title), h('span', { class: 'mode-sub' }, st.available ? info.sub : (REASONS[st.reason] || 'غير متاح'))),
        h('span', { class: 'mode-desc' }, !st.available && st.resetAt ? renewText(st.resetAt) : info.desc));
      card.onclick = () => { selectedMode = m; drawModes(); };
      grid.append(card);
    }
    modeBox.append(h('h3', { style: { margin: '0 0 8px' } }, 'طريقة إعداد الدراسة'), grid);
  }
  loadStatus();
  const stepsBar = h('div', { class: 'steps' });
  const formBox = h('div');
  const nav = h('div', { class: 'actions' });
  const wizard = h('div', { class: 'panel' }, stepsBar, formBox, nav);
  const out = h('div');
  body.append(h('div', { class: 'note info', style: { marginBottom: '16px' } }, 'أجب عن الأسئلة بدقة قدر الإمكان، فكلما زادت التفاصيل زادت دقة الدراسة. في الخطوة الأخيرة تختار طريقة الإعداد: بالذكاء الاصطناعي مع البحث في أحدث بيانات السوق (من دقيقتين إلى خمس دقائق)، أو بالوضع اليدوي بإدخال أرقامك بنفسك. وفي الحالتين يحسب الموقع المؤشرات المالية برمجيًا، ويُخرج الدراسة بصيغتي Word و Excel.'), wizard, out);

  const saved = store.get(RESULT_KEY);
  if (saved?.answers && saved?.market) {
    const bar = h('div', { class: 'note ok row', style: { marginBottom: '16px' } }, h('span', {}, `لديك دراسة سابقة لمشروع «${saved.answers.projectName || ''}».`), h('span', { class: 'spacer' }),
      h('button', { class: 'btn sm', onclick: () => { bar.remove(); showReport(saved); } }, 'عرض الدراسة السابقة'));
    body.prepend(bar);
  }

  const total = sections.length + 1;
  function drawSteps() {
    stepsBar.innerHTML = '';
    [...sections.map(s => s.title), 'المراجعة والإنشاء'].forEach((tt, i) => {
      const s = h('div', { class: 'st' + (i === step ? ' on' : i < step ? ' done' : '') }, `${i + 1}. ${tt}`);
      s.onclick = () => { if (i < step || validate(step, true)) { step = i; draw(); } };
      stepsBar.append(s);
    });
  }
  function fieldEl(f) {
    const val = answers[f.id];
    let input;
    const save = () => { answers[f.id] = f.type === 'multiselect' ? $$('input:checked', input).map(x => x.value) : input.value; store.set(DRAFT_KEY, answers); };
    if (f.type === 'textarea') input = h('textarea', { class: 'input', placeholder: f.placeholder || '' }, val || '');
    else if (f.type === 'select') { input = h('select', { class: 'input' }, h('option', { value: '' }, '— اختر —'), ...(f.options || []).map(o => h('option', { value: o, selected: o === val }, o))); }
    else if (f.type === 'multiselect') input = h('div', { class: 'checks' }, ...(f.options || []).map(o => h('label', { class: 'check' }, h('input', { type: 'checkbox', value: o, checked: Array.isArray(val) && val.includes(o) }), o)));
    else input = h('input', { class: 'input', type: f.type === 'number' ? 'text' : 'text', inputmode: f.type === 'number' ? 'decimal' : null, dir: f.type === 'number' ? 'ltr' : null, placeholder: f.placeholder || '', value: val ?? '' });
    input.addEventListener('input', save); input.addEventListener('change', save);
    if (f.type === 'select' && !val && f.options?.length && f.id === 'studyYears') { input.value = f.options[1] || f.options[0]; save(); }
    return h('div', { class: 'field' + (f.type === 'textarea' || f.type === 'multiselect' ? ' wide' : ''), 'data-f': f.id },
      h('label', { class: 'lbl' }, f.label, f.required ? h('span', { class: 'req' }, ' *') : null), input, f.help ? h('small', {}, f.help) : null);
  }
  function validate(i, silent) {
    const s = sections[i]; if (!s) return true;
    for (const f of s.fields) {
      if (!f.required) continue;
      const v = answers[f.id];
      if (v == null || (Array.isArray(v) ? !v.length : !String(v).trim())) { if (!silent) { toast(`الحقل «${f.label}» مطلوب.`, true); formBox.querySelector(`[data-f="${f.id}"] .input, [data-f="${f.id}"] input`)?.focus(); } return false; }
      if (f.type === 'number' && isNaN(Number(String(v).replace(/[,\s]/g, '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))))) { if (!silent) toast(`أدخل رقمًا صحيحًا في «${f.label}».`, true); return false; }
    }
    return true;
  }
  function draw() {
    drawSteps(); formBox.innerHTML = ''; nav.innerHTML = '';
    if (step < sections.length) {
      const s = sections[step];
      formBox.append(h('h2', { style: { marginTop: 0 } }, s.title), h('div', { class: 'form-grid' }, s.fields.map(fieldEl)));
      if (step > 0) nav.append(h('button', { class: 'btn light', onclick: () => { step--; draw(); } }, ico('arrow-right', 18), 'السابق'));
      nav.append(h('button', { class: 'btn', onclick: () => { if (validate(step)) { step++; draw(); window.scrollTo({ top: 0, behavior: 'smooth' }); } } }, 'التالي', ico('arrow-left', 18)));
    } else {
      formBox.append(h('h2', { style: { marginTop: 0 } }, 'مراجعة الإجابات'));
      for (const s of sections) {
        const rows = s.fields.filter(f => answers[f.id] && String(answers[f.id]).trim()).map(f => h('tr', {}, h('th', { style: { width: '35%' } }, f.label), h('td', {}, Array.isArray(answers[f.id]) ? answers[f.id].join('، ') : answers[f.id])));
        formBox.append(h('h3', {}, s.title), h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, rows)));
      }
      formBox.append(h('div', { style: { marginTop: '22px' } }, modeBox)); drawModes();
      nav.append(h('button', { class: 'btn light', onclick: () => { step--; draw(); } }, ico('arrow-right', 18), 'تعديل الإجابات'),
        h('button', { class: 'btn', onclick: generate }, ico('sparkles', 18), 'إنشاء دراسة الجدوى'));
    }
  }
  draw();

  async function api(stage, ticket, context, mode) {
    const r = await fetch('/api/feasibility', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ stage, answers, ticket, context, mode }) });
    let d = {}; try { d = await r.json(); } catch { }
    if (!r.ok) { const e = new Error(d.error || (r.status === 404 ? 'خدمة الذكاء الاصطناعي غير متاحة على هذه الاستضافة.' : 'تعذّر الاتصال بالخادم.')); e.unavailable = !!d.unavailable || r.status === 404; e.fatal = r.status === 429 || r.status === 403; if (d.status) { modeStatus = d.status; } throw e; }
    return d;
  }
  async function retry(fn, tries = 2) { let e; for (let i = 0; i < tries; i++) { try { return await fn(); } catch (x) { e = x; if (x.unavailable || x.fatal || /مطلوب/.test(x.message)) break; } } throw e; }

  function runManual(prefill) {
    wizard.classList.add('hidden'); out.innerHTML = '';
    out.append(financialEditor({
      answers, technical: prefill || blankTechnical(answers), title: 'أرقام المشروع (الوضع اليدوي)',
      intro: 'أدخل تكاليف مشروعك وإيراداته المتوقعة، وسيحسب الموقع المؤشرات المالية ويُعدّ الدراسة بصيغتي Word و Excel فورًا ودون أي تكلفة.',
      onCancel: () => { out.innerHTML = ''; wizard.classList.remove('hidden'); },
      onDone: (tech) => {
        const model = computeModel(normalizeInputs(tech, answers));
        const result = { mode: 'manual', provider: 'manual', answers: structuredClone(answers), market: manualMarket(answers), technical: tech, summary: manualSummary(model, answers), createdAt: new Date().toISOString() };
        store.set(RESULT_KEY, result); showReport(result); window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function generate() {
    for (let i = 0; i < sections.length; i++) if (!validate(i)) { step = i; draw(); return; }
    if (!selectedMode) return toast('لا توجد طريقة متاحة لإعداد الدراسة حاليًا.', true);
    if (selectedMode === 'manual') return runManual();
    const mode = selectedMode;
    const usedProviders = new Set();
    wizard.classList.add('hidden'); out.innerHTML = '';
    const stages = [['market', 'البحث في أحدث بيانات السوق والمنافسين والأنظمة'], ['technical', 'إعداد الدراسة الفنية وتقدير التكاليف والإيرادات'], ['model', 'حساب النموذج المالي والمؤشرات'], ['summary', 'كتابة الملخص التنفيذي والتوصيات والمخاطر']];
    const log = h('ul', { class: 'gen-log' }, stages.map(([k, tt]) => h('li', { 'data-k': k }, h('span', { class: 'dot' }), tt)));
    const panel = h('div', { class: 'panel center' }, h('h2', { style: { marginTop: 0 } }, 'جارٍ إعداد دراسة الجدوى…'), h('p', { class: 'muted' }, 'لا تغلق هذه الصفحة حتى تكتمل العملية.'), log);
    out.append(panel);
    const mark = (k, s) => { const li = log.querySelector(`[data-k="${k}"]`); li.className = s; if (s === 'done') li.querySelector('.dot').textContent = '✓'; };
    let m = null, tc = null;
    try {
      mark('market', 'on');
      m = await retry(() => api('market', null, null, mode)); usedProviders.add(m.provider);
      mark('market', 'done'); mark('technical', 'on');
      tc = await retry(() => api('technical', m.ticket, { market: { projectDescription: m.data.projectDescription, market: m.data.market, legal: m.data.legal } }, mode)); usedProviders.add(tc.provider);
      mark('technical', 'done'); mark('model', 'on');
      const model = computeModel(normalizeInputs(tc.data, answers));
      if (!model.totals.baseRevenue) throw new Error('لم تتضمن الدراسة الفنية بيانات إيرادات كافية. حاول مرة أخرى.');
      mark('model', 'done'); mark('summary', 'on');
      const cur = currencyCode(answers.currency);
      const k = model.kpis;
      const kpiText = { 'إجمالي الاستثمار': fmtMoney(k.totalInvestment, cur), 'رأس المال المتاح': fmtMoney(k.capitalAvailable, cur), 'فجوة التمويل': fmtMoney(k.fundingGap, cur), 'صافي القيمة الحالية': fmtMoney(k.npv, cur), 'معدل العائد الداخلي': fmtPct(k.irr), 'فترة الاسترداد': fmtYears(k.paybackYears), 'إيرادات السنة الأولى': fmtMoney(k.year1Revenue, cur), 'صافي ربح السنة الأولى': fmtMoney(k.year1Net, cur), 'متوسط صافي الربح السنوي': fmtMoney(k.avgAnnualNet, cur), 'نقطة التعادل الشهرية (إيرادات)': fmtMoney(k.breakEvenRevenueMonthly, cur), 'هامش الربح الإجمالي': fmtPct(k.grossMargin), 'معدل الخصم': fmtPct(k.discountRate) };
      const sm = await retry(() => api('summary', tc.ticket, { kpis: kpiText, market: { swot: m.data.swot, competitors: (m.data.market?.competitors || []).slice(0, 6) } }, mode)); usedProviders.add(sm.provider);
      mark('summary', 'done');
      const used = [...usedProviders].filter(Boolean);
      const result = { mode, provider: used.join('+'), fellBack: used.some(p => p !== mode), answers: structuredClone(answers), market: m.data, technical: tc.data, summary: sm.data, createdAt: new Date().toISOString() };
      store.set(RESULT_KEY, result);
      showReport(result);
    } catch (e) {
      console.error(e);
      panel.innerHTML = '';
      const back = () => { out.innerHTML = ''; wizard.classList.remove('hidden'); step = sections.length; draw(); };
      const acts = h('div', { class: 'actions' });
      if (e.unavailable && CONFIG.feasibility.modes?.manual?.enabled !== false) {
        // انتهى الرصيد أو الحد اليومي لكل الطبقات المتاحة: إكمال الدراسة يدويًا مع الاحتفاظ بما اكتمل
        await loadStatus();
        return continueManual({ m, tc, used: [...usedProviders].filter(Boolean), mode, reason: e.message });
      }
      if (e.unavailable) {
        await loadStatus();
        const alt = MODE_IDS.find(x => x !== mode && modeStatus?.[x]?.available);
        if (alt) acts.append(h('button', { class: 'btn', onclick: () => { selectedMode = alt; alt === 'manual' ? runManual() : generate(); } }, ico(alt === 'manual' ? 'sheet' : 'sparkles', 18), alt === 'manual' ? 'المتابعة بالوضع اليدوي' : `المتابعة باستخدام ${PROVIDER_NAME[alt]}`));
      } else acts.append(h('button', { class: 'btn', onclick: generate }, ico('refresh-cw', 18), 'إعادة المحاولة'));
      acts.append(h('button', { class: 'btn light', onclick: back }, 'العودة واختيار طريقة أخرى'));
      panel.append(h('div', { class: 'note err' }, e.message), acts);
    }
  }

  function continueManual({ m, tc, used, mode, reason }) {
    wizard.classList.add('hidden'); out.innerHTML = '';
    const done = [];
    if (m) done.push('دراسة السوق والمنافسين وتحليل SWOT والدراسة القانونية');
    if (tc) done.push('الدراسة الفنية وتقديرات التكاليف والإيرادات');
    const gemini = modeStatus?.gemini;
    const notice = h('div', { class: 'note', style: { marginBottom: '12px' } },
      h('b', {}, 'تعذّر إكمال الدراسة بالذكاء الاصطناعي، فانتقلنا إلى الوضع اليدوي. '), reason || '',
      gemini?.resetAt ? ` (${renewText(gemini.resetAt)})` : '',
      done.length ? h('div', { style: { marginTop: '6px' } }, 'حُفظ ما اكتمل: ' + done.join('، ') + '.') : null,
      h('div', { style: { marginTop: '6px' } }, tc ? 'الأرقام أدناه من تقديرات الذكاء الاصطناعي، فراجعها ثم اضغط «إنشاء الدراسة» لإكمالها.' : 'أكمل أرقام المشروع أدناه، ثم اضغط «إنشاء الدراسة» لإكمالها.'));
    out.append(financialEditor({
      answers, technical: tc ? tc.data : blankTechnical(answers), title: 'إكمال الدراسة بالوضع اليدوي', notice,
      onCancel: () => { out.innerHTML = ''; wizard.classList.remove('hidden'); step = sections.length; draw(); },
      onDone: (tech) => {
        const technical = tc ? { ...tc.data, ...tech } : tech;
        const model = computeModel(normalizeInputs(technical, answers));
        const result = { mode: m ? 'hybrid' : 'manual', aiMode: mode, provider: [...used, 'manual'].join('+'), completedManually: m ? (tc ? 'summary' : 'technical') : 'all', answers: structuredClone(answers), market: m ? m.data : manualMarket(answers), technical, summary: manualSummary(model, answers), createdAt: new Date().toISOString() };
        store.set(RESULT_KEY, result); showReport(result); window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showReport(result) {
    wizard.classList.add('hidden');
    const model = computeModel(normalizeInputs(result.technical, result.answers));
    const cur = currencyCode(result.answers.currency);
    out.innerHTML = '';
    const verdictColor = /غير/.test(result.summary.verdict) ? '#fee2e2' : /بشروط/.test(result.summary.verdict) ? '#fef3c7' : '#dcfce7';
    const k = model.kpis;
    const editBtn = h('button', { class: 'btn light', onclick: () => editNumbers(result) }, ico('sheet', 18), 'تعديل الأرقام وإعادة الحساب');
    const aiNames = String(result.provider || '').split('+').filter(p => p && p !== 'manual').map(p => PROVIDER_NAME[p] || p).join(' و ');
    const byLine = result.mode === 'manual' ? 'أُعدّت بالوضع اليدوي اعتمادًا على أرقامك' : result.mode === 'hybrid' ? `أُعدّت باستخدام ${aiNames}، وأُكملت بالوضع اليدوي` : `أُعدّت باستخدام ${aiNames || PROVIDER_NAME[result.mode]}`;
    const fbNote = result.fellBack ? h('div', { class: 'note' }, `تعذّر استخدام ${PROVIDER_NAME[result.mode]} أثناء الإعداد، فأُكملت الدراسة تلقائيًا باستخدام Gemini.`)
      : result.mode === 'hybrid' ? h('div', { class: 'note' }, result.completedManually === 'summary' ? 'أعدّ الذكاء الاصطناعي دراسة السوق والدراسة الفنية، وأُكمل الملخص والتوصيات بالوضع اليدوي بعد تجاوز الحد المتاح.' : 'أعدّ الذكاء الاصطناعي دراسة السوق، وأُكملت الأرقام والملخص بالوضع اليدوي بعد تجاوز الحد المتاح.') : null;
    const editedNote = result.edited ? h('div', { class: 'note info' }, 'عُدّلت أرقام هذه الدراسة يدويًا، وأُعيد حساب المؤشرات والحكم على الجدوى.') : null;
    const dlWord = h('button', { class: 'btn' }, ico('file-text', 18), 'تنزيل الدراسة (Word)');
    const dlXls = h('button', { class: 'btn' }, ico('sheet', 18), 'تنزيل النموذج المالي (Excel)');
    dlWord.onclick = async () => { dlWord.disabled = true; try { const m = await import('./feas-export.js'); download(await m.buildDocx(result, model, CONFIG), `دراسة-جدوى-${safeName(result.answers.projectName)}.docx`); } catch (e) { console.error(e); toast('تعذّر إنشاء ملف Word: ' + e.message, true); } dlWord.disabled = false; };
    dlXls.onclick = async () => { dlXls.disabled = true; try { const m = await import('./feas-export.js'); download(await m.buildXlsx(result, model, CONFIG), `النموذج-المالي-${safeName(result.answers.projectName)}.xlsx`); } catch (e) { console.error(e); toast('تعذّر إنشاء ملف Excel: ' + e.message, true); } dlXls.disabled = false; };
    const rows = model.rows;
    const tbl = (head, data) => h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('tr', {}, head.map(x => h('th', {}, x))), data.map(r => h('tr', {}, r.map((c, i) => h('td', { class: typeof c === 'number' ? 'n' : '' }, typeof c === 'number' ? fmtMoney(c) : c))))));
    const list = (a) => h('ul', {}, (a || []).map(x => h('li', {}, x)));
    out.append(h('div', { class: 'panel report' },
      h('div', { class: 'row' }, h('h1', { style: { margin: 0, fontSize: '24px' } }, 'دراسة جدوى: ' + (result.answers.projectName || '')), h('span', { class: 'spacer' }), dlWord, dlXls),
      h('p', { class: 'muted' }, `${result.answers.city || ''}، ${result.answers.country || ''} — ${byLine} في ${new Date(result.createdAt).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn')}`),
      fbNote, editedNote,
      h('div', { class: 'verdict', style: { background: verdictColor } }, 'الحكم على الجدوى: ' + (result.summary.verdict || '—')),
      h('div', { class: 'kpis' }, [['إجمالي الاستثمار', fmtMoney(k.totalInvestment, cur)], ['صافي القيمة الحالية', fmtMoney(k.npv, cur)], ['معدل العائد الداخلي', fmtPct(k.irr)], ['فترة الاسترداد', fmtYears(k.paybackYears)], ['إيرادات السنة الأولى', fmtMoney(k.year1Revenue, cur)], ['نقطة التعادل الشهرية', fmtMoney(k.breakEvenRevenueMonthly, cur)]].map(([a, b]) => h('div', { class: 'kpi' }, h('span', {}, a), h('b', {}, b)))),
      k.fundingGap > 0 ? h('div', { class: 'note' }, `تنبيه: إجمالي الاستثمار المطلوب يتجاوز رأس المال المتاح والتمويل بمقدار ${fmtMoney(k.fundingGap, cur)}.`) : null,
      h('h2', {}, 'الملخص التنفيذي'), ...String(result.summary.executiveSummary || '').split(/\n+/).map(p => h('p', {}, p)),
      h('p', {}, h('b', {}, 'مسوّغات الحكم: '), result.summary.verdictReason || ''),
      h('h2', {}, 'دراسة السوق'), h('p', {}, result.market.market?.overview || ''), h('p', {}, h('b', {}, 'حجم السوق: '), result.market.market?.marketSize || ''),
      h('h3', {}, 'المنافسون'), tbl(['المنافس', 'النوع', 'نقاط القوة', 'نقاط الضعف'], (result.market.market?.competitors || []).map(c => [c.name, c.type, c.strengths, c.weaknesses])),
      h('h3', {}, 'تحليل SWOT'), tbl(['نقاط القوة', 'نقاط الضعف', 'الفرص', 'التهديدات'], [[list(result.market.swot?.strengths), list(result.market.swot?.weaknesses), list(result.market.swot?.opportunities), list(result.market.swot?.threats)]]),
      h('h2', {}, 'التكاليف الاستثمارية'), tbl(['البند', `التكلفة (${cur})`], [...model.inputs.equipment.map(e => [`${e.item} × ${e.qty}`, e.qty * e.unitCost]), ...model.inputs.otherCapex.map(e => [e.item, e.cost]), ...model.inputs.preOperating.map(e => [e.item + ' (ما قبل التشغيل)', e.cost]), ['رأس المال العامل', model.totals.workingCapital], [h('b', {}, 'الإجمالي'), model.totals.totalInvestment]]),
      h('h2', {}, 'القوائم المالية التقديرية'), tbl(['البند', ...rows.map(r => 'السنة ' + r.year)], [['الإيرادات', ...rows.map(r => r.revenue)], ['تكلفة المبيعات', ...rows.map(r => r.cogs)], ['المصروفات التشغيلية', ...rows.map(r => r.opex)], ['الإهلاك', ...rows.map(r => r.depreciation)], ['الفوائد', ...rows.map(r => r.interest)], ['الضريبة أو الزكاة', ...rows.map(r => r.tax)], ['صافي الربح', ...rows.map(r => r.net)], ['صافي التدفق النقدي', ...rows.map(r => r.cashFlow)], ['التدفق التراكمي', ...rows.map(r => r.cumulative)]]),
      h('h2', {}, 'المخاطر'), tbl(['الخطر', 'الاحتمال', 'الأثر', 'طريقة الحد منه'], (result.summary.risks || []).map(r => [r.risk, r.likelihood, r.impact, r.mitigation])),
      h('h2', {}, 'التوصيات'), list(result.summary.recommendations),
      h('p', { class: 'muted', style: { marginTop: '24px' } }, 'هذا عرض مختصر. تجد الدراسة كاملة بجميع أقسامها في ملف Word، والنموذج المالي القابل للتعديل بالمعادلات في ملف Excel.'),
      supportNudge(CONFIG),
      h('div', { class: 'actions' }, editBtn, h('button', { class: 'btn light', onclick: () => { out.innerHTML = ''; wizard.classList.remove('hidden'); step = 0; draw(); } }, ico('refresh-cw', 18), 'إعداد دراسة جديدة أو تعديل الإجابات'))));
  }

  function editNumbers(result) {
    out.innerHTML = '';
    out.append(financialEditor({
      answers: result.answers, technical: result.technical, title: 'تعديل أرقام الدراسة', action: 'إعادة الحساب',
      intro: 'عدّل أي رقم، ثم اضغط «إعادة الحساب» لتحديث المؤشرات وملفي Word و Excel.',
      onCancel: () => showReport(result),
      onDone: (tech) => {
        const r = structuredClone(result); r.technical = { ...r.technical, ...tech };
        const model = computeModel(normalizeInputs(r.technical, r.answers));
        if (r.mode === 'manual' || r.mode === 'hybrid') r.summary = manualSummary(model, r.answers);
        else { const ms = manualSummary(model, r.answers); r.summary = { ...r.summary, verdict: verdictFor(model), executiveSummary: ms.executiveSummary + '\n' + (r.summary.executiveSummary || '').split('\n').slice(1).join('\n'), verdictReason: ms.verdictReason }; r.edited = true; }
        store.set(RESULT_KEY, r); showReport(r); window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
const safeName = (s) => String(s || 'مشروع').replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 60) || 'مشروع';
