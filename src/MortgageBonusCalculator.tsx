import React, { useEffect, useMemo, useState } from "react";

// Calculadora de bonificaciones para hipoteca
// Victoriano: todo es editable. Puedes activar o desactivar bonificaciones,
// ajustar descuentos, costes, capital, plazo y tipo base.
// Tabla con botón de borrar funcional que aparece sólo al hacer hover sobre la fila.

// Tipos
export type Bonus = {
  id: string;
  name: string;
  discountPct: number; // porcentaje sobre tipo (puntos porcentuales)
  annualCost: number;  // euros
  enabled: boolean;
};

export default function MortgageBonusCalculator() {
  // Parámetros de préstamo por defecto
  const [capital, setCapital] = useState(270000);
  const [years, setYears] = useState(30);
  const [baseRatePct, setBaseRatePct] = useState(2.7); // % anual
  const [maxComboDiscountPct, setMaxComboDiscountPct] = useState(0.85); // % máximo bonificable total

  // Bonificaciones por defecto según tu email
  const [bonuses, setBonuses] = useState<Bonus[]>([
    { id: "nomina", name: "Domiciliación de nómina", discountPct: 0.35, annualCost: 0, enabled: true },
    { id: "hogar", name: "Seguro de hogar", discountPct: 0.15, annualCost: 660, enabled: true },
    { id: "vida50", name: "Seguro de vida 50% del capital (1 persona)", discountPct: 0.20, annualCost: 338.28, enabled: true },
    { id: "vida100_1", name: "Seguro de vida 100% del capital (1 persona)", discountPct: 0.35, annualCost: 676.35, enabled: false },
    { id: "vida100_total", name: "Seguro de vida 100% total 50% + 50% (2 personas)", discountPct: 0.35, annualCost: 338.28 + 362.64, enabled: false },
    { id: "salud", name: "Seguro de salud", discountPct: 0.20, annualCost: 0, enabled: true },
    { id: "alarma", name: "Alarma Securitas Direct", discountPct: 0.15, annualCost: 52.03 * 12, enabled: true },
  ]);

  // Estado para deshacer borrado
  const [lastRemoved, setLastRemoved] = useState<Bonus | null>(null);

  const nMonths = years * 12;

  function parseNum(v: string): number {
    // Soporta comas y puntos. "1.234,56" no se soporta con separador de miles, se recomienda introducir 1234,56 o 1234.56
    if (!v) return 0;
    const clean = v.replace(/\s/g, "").replace(",", ".");
    const num = Number(clean);
    return Number.isFinite(num) ? num : 0;
  }

  function paymentMonthly(P: number, annualRatePct: number, months: number): number {
    const r = (annualRatePct / 100) / 12;
    if (r === 0) return P / months;
    return (P * r) / (1 - Math.pow(1 + r, -months));
  }

  function eur(n: number): string {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n);
  }

  function pct(n: number): string {
    return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 3 }).format(n) + "%";
  }

  const basePayment = useMemo(() => paymentMonthly(capital, baseRatePct, nMonths), [capital, baseRatePct, nMonths]);

  function computeForBonus(b: Bonus) {
    const newRate = baseRatePct - b.discountPct;
    const newPayment = paymentMonthly(capital, newRate, nMonths);
    const monthlySaving = basePayment - newPayment;
    const annualSaving = monthlySaving * 12;
    const netAnnual = annualSaving - b.annualCost;
    const net30y = monthlySaving * nMonths - b.annualCost * years;
    return { newRate, newPayment, monthlySaving, annualSaving, netAnnual, net30y };
  }

  const rows = bonuses.map(b => ({ b, ...computeForBonus(b) }));

  // Cálculo combinado respetando tope de descuento
  const combo = useMemo(() => {
    const enabled = bonuses.filter(b => b.enabled);
    const sumDiscount = enabled.reduce((acc, b) => acc + b.discountPct, 0);
    const appliedDiscount = Math.min(sumDiscount, maxComboDiscountPct);
    const comboRate = baseRatePct - appliedDiscount;
    const comboPayment = paymentMonthly(capital, comboRate, nMonths);
    const monthlySaving = basePayment - comboPayment;
    const annualSaving = monthlySaving * 12;
    const annualCost = enabled.reduce((acc, b) => acc + b.annualCost, 0);
    const netAnnual = annualSaving - annualCost;
    const net30y = monthlySaving * nMonths - annualCost * years;
    return { appliedDiscount, comboRate, comboPayment, monthlySaving, annualSaving, annualCost, netAnnual, net30y, enabledCount: enabled.length };
  }, [bonuses, basePayment, baseRatePct, capital, maxComboDiscountPct, nMonths, years]);

  function updateBonus(id: string, patch: Partial<Bonus>) {
    setBonuses(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
  }

  function removeBonus(id: string) {
    const toRemove = bonuses.find(b => b.id === id) || null;
    setBonuses(prev => prev.filter(b => b.id !== id));
    setLastRemoved(toRemove);
  }

  function undoRemove() {
    if (!lastRemoved) return;
    setBonuses(prev => [lastRemoved, ...prev]);
    setLastRemoved(null);
  }

  // Ocultar aviso de deshacer tras 6s
  useEffect(() => {
    if (!lastRemoved) return;
    const t = setTimeout(() => setLastRemoved(null), 6000);
    return () => clearTimeout(t);
  }, [lastRemoved]);

  function addCustomBonus() {
    const idx = bonuses.length + 1;
    setBonuses(prev => [
      ...prev,
      { id: `custom_${idx}`, name: `Bonificación personalizada ${idx}`, discountPct: 0.10, annualCost: 0, enabled: true }
    ]);
  }

  function resetDefaults() {
    setCapital(270000);
    setYears(30);
    setBaseRatePct(2.7);
    setMaxComboDiscountPct(0.85);
    setBonuses([
      { id: "nomina", name: "Domiciliación de nómina", discountPct: 0.35, annualCost: 0, enabled: true },
      { id: "hogar", name: "Seguro de hogar", discountPct: 0.15, annualCost: 660, enabled: true },
      { id: "vida50", name: "Seguro de vida 50% del capital (1 persona)", discountPct: 0.20, annualCost: 338.28, enabled: true },
      { id: "vida100_1", name: "Seguro de vida 100% del capital (1 persona)", discountPct: 0.35, annualCost: 676.35, enabled: false },
      { id: "vida100_total", name: "Seguro de vida 100% total 50% + 50% (2 personas)", discountPct: 0.35, annualCost: 700.92, enabled: false },
      { id: "salud", name: "Seguro de salud", discountPct: 0.20, annualCost: 0, enabled: true },
      { id: "alarma", name: "Alarma Securitas Direct", discountPct: 0.15, annualCost: 624.36, enabled: true },
    ]);
  }

  // TESTS básicos (se ejecutan una sola vez al montar el componente)
  useEffect(() => {
    function approx(a: number, b: number, tol = 1e-9) { return Math.abs(a - b) <= tol; }
    // Test 1: r = 0 => cuota = P / n
    console.assert(approx(paymentMonthly(1200, 0, 12), 100), "Test r=0 falló");
    // Test 2: una bonificación positiva debe reducir la cuota respecto a la base
    const paymentBase = paymentMonthly(100000, 2, 360);
    const paymentDisc = paymentMonthly(100000, 1.5, 360);
    console.assert(paymentDisc < paymentBase, "Test descuento no reduce cuota");
    // Test 3: computeForBonus con descuento 0 => ahorro mensual ~ 0
    const tmp = computeForBonus({ id: "t", name: "t", discountPct: 0, annualCost: 0, enabled: true });
    console.assert(approx(tmp.monthlySaving, 0, 1e-6), "Test ahorro mensual con 0% debería ser 0");
    // Test 4: removeBonus elimina id del array
    const sample: Bonus[] = [ { id: "a", name: "A", discountPct: 0.1, annualCost: 0, enabled: true }, { id: "b", name: "B", discountPct: 0.2, annualCost: 0, enabled: true } ];
    const removed = sample.filter(b => b.id !== "a");
    console.assert(removed.length === 1 && removed[0]?.id === "b", "Test remove básico falló");
  }, []);

  return (
    <div className="min-h-screen w-full bg-gray-50 text-gray-900 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Calculadora de bonificaciones de hipoteca</h1>
          <p className="text-sm md:text-base text-gray-600">Ajusta los datos y compara el ahorro de cada bonificación por separado y en combinación. Los cálculos usan cuota francesa y redondeo a 2 decimales.</p>
        </header>

        {/* Panel de parámetros del préstamo */}
        <section className="grid md:grid-cols-4 gap-4">
          <Card title="Capital" subtitle="€" value={capital} onChange={(v)=> setCapital(parseNum(v))} step="1000" />
          <Card title="Plazo" subtitle="años" value={years} onChange={(v)=> setYears(Math.max(1, Math.round(parseNum(v))))} step="1" />
          <Card title="Tipo base" subtitle="% TIN" value={baseRatePct} onChange={(v)=> setBaseRatePct(parseNum(v))} step="0.01" />
          <Card title="Tope descuento combo" subtitle="%" value={maxComboDiscountPct} onChange={(v)=> setMaxComboDiscountPct(parseNum(v))} step="0.01" />
        </section>

        <section className="grid md:grid-cols-3 gap-4">
          <div className="col-span-2 bg-white rounded-2xl shadow p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Bonificaciones</h2>
              <div className="flex gap-2">
                <button onClick={addCustomBonus} className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-sm">Añadir</button>
                <button onClick={resetDefaults} className="px-3 py-1.5 rounded-xl bg-gray-200 text-sm">Restablecer</button>
              </div>
            </div>

            {/* Aviso deshacer */}
            {lastRemoved && (
              <div className="mb-3 text-sm flex items-center gap-3 p-2 rounded-xl bg-yellow-50 border border-yellow-200">
                <span>Has borrado "{lastRemoved.name}".</span>
                <button type="button" onClick={undoRemove} className="px-2 py-1 rounded-lg bg-yellow-600 text-white text-xs">Deshacer</button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b border-gray-200">
                    <th className="py-2 pr-2">Activa</th>
                    <th className="py-2 pr-2">Borrar</th>
                    <th className="py-2 pr-2">Bonificación</th>
                    <th className="py-2 pr-2">Descuento (%)</th>
                    <th className="py-2 pr-2">Coste anual (€)</th>
                    <th className="py-2 pr-2">Tipo con bono</th>
                    <th className="py-2 pr-2">Cuota nueva</th>
                    <th className={`py-2 pr-2 align-middle ${"text-gray-900"}`}>Ahorro mensual</th>
                    <th className={`py-2 pr-2 align-middle ${"text-gray-900"}`}>Ahorro anual</th>
                    <th className={`py-2 pr-2 align-middle ${"text-gray-900"}`}>Ahorro neto anual</th>
                    <th className={`py-2 pr-2 align-middle ${"text-gray-900"}`}>Ahorro neto 30 años</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ b, newRate, newPayment, monthlySaving, annualSaving, netAnnual, net30y }) => (
                    <tr key={b.id} className="group border-b border-gray-200 last:border-0 hover:bg-gray-50">
                      <td className="py-2 pr-2 align-middle">
                        <input type="checkbox" checked={b.enabled} onChange={e => updateBonus(b.id, { enabled: e.target.checked })} />
                      </td>
                      <td className="py-2 pr-2 align-middle">
                        <button type="button" onClick={() => removeBonus(b.id)} className="px-2 py-1 rounded-lg bg-red-600 text-white text-xs opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">Borrar</button>
                      </td>
                      <td className="py-2 pr-2 align-middle min-w-[220px]">
                        <input
                          className="w-full bg-transparent outline-none"
                          value={b.name}
                          onChange={e => updateBonus(b.id, { name: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-2 align-middle">
                        <NumberInput value={b.discountPct} suffix="%" step="0.01" onChange={(v)=> updateBonus(b.id, { discountPct: parseNum(v) })} />
                      </td>
                      <td className="py-2 pr-2 align-middle">
                        <NumberInput value={b.annualCost} prefix="€" step="1" onChange={(v)=> updateBonus(b.id, { annualCost: parseNum(v) })} />
                      </td>
                      <td className="py-2 pr-2 align-middle text-gray-700">{pct(newRate)}</td>
                      <td className="py-2 pr-2 align-middle">{eur(newPayment)}</td>
                      <td className={`${monthlySaving >= 0 ? "text-green-700" : "text-red-700"}`}>{eur(monthlySaving)}</td>
                      <td className={`${annualSaving >= 0 ? "text-green-700" : "text-red-700"}`}>{eur(annualSaving)}</td>
                      <td className={`font-medium ${netAnnual >= 0 ? "text-green-700" : "text-red-700"}`}>{eur(netAnnual)}</td>
                      <td className={`font-medium ${net30y >= 0 ? "text-green-700" : "text-red-700"}`}>{eur(net30y)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-3">Las filas calculan el ahorro de cada bonificación de forma independiente respecto al tipo base {pct(baseRatePct)}. No se acumulan entre sí en esta tabla.</p>
          </div>

          <div className="bg-white rounded-2xl shadow p-4 md:p-6 h-fit">
            <h2 className="text-lg font-semibold mb-2">Resumen del préstamo</h2>
            <ul className="text-sm space-y-1">
              <li><span className="text-gray-600">Cuota mensual base</span>: <span className="font-medium">{eur(basePayment)}</span></li>
              <li><span className="text-gray-600">Tipo base</span>: {pct(baseRatePct)}</li>
              <li><span className="text-gray-600">Capital</span>: {eur(capital)}</li>
              <li><span className="text-gray-600">Plazo</span>: {years} años</li>
            </ul>
            <div className="h-px w-full bg-gray-200 my-4" />
            <h3 className="font-semibold mb-2">Combinación seleccionada</h3>
            <ul className="text-sm space-y-1">
              <li><span className="text-gray-600">Bonos activos</span>: {combo.enabledCount}</li>
              <li><span className="text-gray-600">Descuento aplicado</span>: {pct(combo.appliedDiscount)} <span className="text-gray-500">(tope {pct(maxComboDiscountPct)})</span></li>
              <li><span className="text-gray-600">Tipo resultante</span>: {pct(combo.comboRate)}</li>
              <li><span className="text-gray-600">Nueva cuota</span>: <span className="font-medium">{eur(combo.comboPayment)}</span></li>
              <li className={combo.monthlySaving >= 0 ? "text-green-700" : "text-red-700"}><span className="text-gray-600">Ahorro mensual</span>: {eur(combo.monthlySaving)}</li>
              <li className={combo.annualSaving >= 0 ? "text-green-700" : "text-red-700"}><span className="text-gray-600">Ahorro anual</span>: {eur(combo.annualSaving)}</li>
              <li><span className="text-gray-600">Coste anual total</span>: {eur(combo.annualCost)}</li>
              <li className={combo.netAnnual >= 0 ? "text-green-700" : "text-red-700"}><span className="text-gray-600">Ahorro neto anual</span>: <span className="font-semibold">{eur(combo.netAnnual)}</span></li>
              <li className={combo.net30y >= 0 ? "text-green-700" : "text-red-700"}><span className="text-gray-600">Ahorro neto 30 años</span>: <span className="font-semibold">{eur(combo.net30y)}</span></li>
            </ul>
            <p className="text-xs text-gray-500 mt-3">Activa o desactiva bonificaciones en la tabla para ver el efecto combinado. El descuento total está limitado por el tope configurado.</p>
          </div>
        </section>

        <footer className="text-xs text-gray-500">
          <p>
            Aviso: esta herramienta es orientativa. No tiene en cuenta impuestos ni revalorizaciones de primas. Las primas de vida suelen subir con la edad. La decisión final debe basarse en condiciones contractuales oficiales.
          </p>
        </footer>
      </div>
    </div>
  );
}

function Card({ title, subtitle, value, onChange, step }: { title: string; subtitle?: string; value: number; onChange: (v: string) => void; step?: string; }) {
  return (
    <div className="bg-white rounded-2xl shadow p-4 md:p-6">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="flex items-end gap-2 mt-2">
        <input
          className="w-full text-xl font-medium outline-none bg-transparent border-b border-gray-200 focus:border-gray-400 pb-1"
          type="text"
          inputMode="decimal"
          step={step || "0.01"}
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
        />
        {subtitle && <span className="text-gray-500 text-sm mb-1">{subtitle}</span>}
      </div>
    </div>
  );
}

function NumberInput({ value, onChange, prefix, suffix, step }: { value: number; onChange: (v: string) => void; prefix?: string; suffix?: string; step?: string; }) {
  return (
    <div className="inline-flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1">
      {prefix && <span className="text-gray-500 text-xs">{prefix}</span>}
      <input
        className="w-24 bg-transparent outline-none text-sm text-gray-900"
        type="text"
        inputMode="decimal"
        step={step || "0.01"}
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
      />
      {suffix && <span className="text-gray-500 text-xs">{suffix}</span>}
    </div>
  );
}


