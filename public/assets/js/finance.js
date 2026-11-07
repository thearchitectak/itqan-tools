// النموذج المالي لدراسة الجدوى — تُحسب جميع المؤشرات برمجيًا (لا يعتمد على الذكاء الاصطناعي في الحساب).
const num = (v, d = 0) => { const n = Number(String(v ?? '').replace(/[,\s٬]/g, '').replace(/[٠-٩]/g, x => '٠١٢٣٤٥٦٧٨٩'.indexOf(x))); return Number.isFinite(n) ? n : d; };
const pct = (v, d) => { const n = num(v, d); return n > 1 || n < -1 ? n / 100 : n; };
const sum = (a, f) => (a || []).reduce((s, x) => s + f(x), 0);

export function normalizeInputs(tech, answers) {
  const A = tech.assumptions || {};
  const years = parseInt(String(answers.studyYears || '5').replace(/[٠-٩]/g, x => '٠١٢٣٤٥٦٧٨٩'.indexOf(x))) || 5;
  const equipment = (tech.equipment || []).map(e => ({ item: String(e.item || ''), qty: Math.max(0, num(e.qty, 1)), unitCost: Math.max(0, num(e.unitCost)) }));
  const otherCapex = (tech.otherCapex || []).map(e => ({ item: String(e.item || ''), cost: Math.max(0, num(e.cost)) }));
  const preOperating = (tech.preOperating || []).map(e => ({ item: String(e.item || ''), cost: Math.max(0, num(e.cost)) }));
  const staffing = (tech.staffing || []).map(e => ({ role: String(e.role || ''), count: Math.max(0, num(e.count, 1)), monthlySalary: Math.max(0, num(e.monthlySalary)) }));
  const monthlyOpex = (tech.monthlyOpex || []).map(e => ({ item: String(e.item || ''), cost: Math.max(0, num(e.cost)) }));
  const revenueStreams = (tech.revenueStreams || []).map(e => ({ name: String(e.name || ''), unit: String(e.unit || ''), unitPrice: Math.max(0, num(e.unitPrice)), monthlyVolume: Math.max(0, num(e.monthlyVolume)), cogsPct: Math.min(0.99, Math.max(0, pct(e.cogsPct, 0))) }));
  const loanAmount = Math.max(0, num(answers.loanAmount));
  return {
    years: Math.min(15, Math.max(1, years)), equipment, otherCapex, preOperating, staffing, monthlyOpex, revenueStreams,
    growth: pct(A.annualGrowthPct, 5), inflation: pct(A.costInflationPct, 3), rampUp: Math.min(1, Math.max(0.1, pct(A.rampUpYear1Pct, 70) || 0.7)),
    discount: pct(A.discountRatePct, 10) || 0.1, tax: Math.max(0, pct(A.taxRatePct, 0)), wcMonths: Math.max(0, num(A.workingCapitalMonths, 3)), depYears: Math.max(1, Math.round(num(A.depreciationYears, 5)) || 5),
    loanAmount, loanRate: loanAmount ? pct(answers.loanRate, 0) : 0, loanYears: loanAmount ? Math.max(1, Math.round(num(answers.loanYears, 5)) || 5) : 0,
    capital: Math.max(0, num(answers.capital)), notes: A.notes || [],
  };
}

export function computeModel(I) {
  const equipmentTotal = sum(I.equipment, e => e.qty * e.unitCost);
  const otherCapexTotal = sum(I.otherCapex, e => e.cost);
  const capexTotal = equipmentTotal + otherCapexTotal;
  const preOpTotal = sum(I.preOperating, e => e.cost);
  const opexMonthly = sum(I.monthlyOpex, e => e.cost);
  const payrollMonthly = sum(I.staffing, s => s.count * s.monthlySalary);
  const workingCapital = I.wcMonths * (opexMonthly + payrollMonthly);
  const totalInvestment = capexTotal + preOpTotal + workingCapital;
  const loan = Math.min(I.loanAmount, totalInvestment);
  const equity = totalInvestment - loan;
  const baseRevenue = sum(I.revenueStreams, r => r.unitPrice * r.monthlyVolume * 12);
  const baseCogs = sum(I.revenueStreams, r => r.unitPrice * r.monthlyVolume * 12 * r.cogsPct);
  const cogsRatio = baseRevenue ? baseCogs / baseRevenue : 0;
  const depBase = capexTotal + preOpTotal;

  // جدول سداد القرض بأقساط متساوية
  const r = I.loanRate, n = I.loanYears;
  const payment = loan && n ? (r ? loan * r / (1 - Math.pow(1 + r, -n)) : loan / n) : 0;
  let balance = loan;

  const rows = [];
  let cum = -equity;
  for (let y = 1; y <= I.years; y++) {
    const factor = (y === 1 ? I.rampUp : 1) * Math.pow(1 + I.growth, y - 1);
    const revenue = baseRevenue * factor;
    const cogs = baseCogs * factor;
    const gross = revenue - cogs;
    const opex = (opexMonthly + payrollMonthly) * 12 * Math.pow(1 + I.inflation, y - 1);
    const ebitda = gross - opex;
    const depreciation = y <= I.depYears ? depBase / I.depYears : 0;
    let interest = 0, principal = 0;
    if (loan && y <= n) { interest = balance * r; principal = payment - interest; balance -= principal; }
    const ebt = ebitda - depreciation - interest;
    const tax = Math.max(0, ebt) * I.tax;
    const net = ebt - tax;
    const cashFlow = net + depreciation - principal;
    cum += cashFlow;
    rows.push({ year: y, revenue, cogs, gross, opex, ebitda, depreciation, interest, ebt, tax, net, principal, cashFlow, cumulative: cum });
  }
  const flows = [-equity, ...rows.map(x => x.cashFlow)];
  const npv = flows.reduce((s, cf, t) => s + cf / Math.pow(1 + I.discount, t), 0);
  const irrV = irr(flows);
  // فترة الاسترداد
  let payback = null, c = -equity;
  if (equity <= 0) payback = 0;
  else for (const row of rows) { const prev = c; c += row.cashFlow; if (c >= 0 && row.cashFlow > 0) { payback = row.year - 1 + (-prev / row.cashFlow); break; } }
  const y1 = rows[0] || {};
  const fixedY1 = (y1.opex || 0) + (y1.depreciation || 0) + (y1.interest || 0);
  const breakEvenRevenue = cogsRatio < 1 ? fixedY1 / (1 - cogsRatio) : null;
  const avgNet = rows.reduce((s, x) => s + x.net, 0) / (rows.length || 1);
  const totals = { equipmentTotal, otherCapexTotal, capexTotal, preOpTotal, opexMonthly, payrollMonthly, workingCapital, totalInvestment, loan, equity, baseRevenue, baseCogs, cogsRatio, payment };
  const kpis = {
    totalInvestment, equity, loan, npv, irr: irrV, paybackYears: payback, breakEvenRevenueAnnual: breakEvenRevenue, breakEvenRevenueMonthly: breakEvenRevenue != null ? breakEvenRevenue / 12 : null,
    year1Revenue: y1.revenue, year1Net: y1.net, avgAnnualNet: avgNet, roi: totalInvestment ? avgNet / totalInvestment : null,
    grossMargin: 1 - cogsRatio, capitalAvailable: I.capital, fundingGap: Math.max(0, totalInvestment - I.capital - loan), discountRate: I.discount, years: I.years,
  };
  return { inputs: I, totals, rows, kpis, flows };
}

export function irr(flows) {
  const f = (r) => flows.reduce((s, cf, t) => s + cf / Math.pow(1 + r, t), 0);
  if (!flows.some(x => x > 0) || !flows.some(x => x < 0)) return null;
  let lo = -0.99, hi = 10, flo = f(lo), fhi = f(hi);
  if (flo * fhi > 0) return null;
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2, fm = f(mid); if (Math.abs(fm) < 1e-7) return mid; if (flo * fm < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; } }
  return (lo + hi) / 2;
}

export const fmtMoney = (v, cur = '') => v == null || !Number.isFinite(v) ? '—' : Math.round(v).toLocaleString('en-US') + (cur ? ' ' + cur : '');
export const fmtPct = (v) => v == null || !Number.isFinite(v) ? '—' : (v * 100).toFixed(1) + '٪';
export const fmtYears = (v) => v == null ? 'لا يتحقق خلال مدة الدراسة' : v === 0 ? 'فوري' : `${v.toFixed(1)} سنة`;
export function currencyCode(s) { const m = String(s || '').match(/\(([A-Z]{3})\)/); return m ? m[1] : (String(s || '').match(/[A-Z]{3}/)?.[0] || ''); }
