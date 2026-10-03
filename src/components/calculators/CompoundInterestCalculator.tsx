import { useState, useMemo } from 'react';
import { Percent } from 'lucide-react';
import CalculatorLayout, { InputField, AreaChart, DonutChart, ResultCard, formatFullCurrency } from './CalculatorLayout';

export default function CompoundInterestCalculator() {
  const [principal, setPrincipal] = useState('50000');
  const [rate, setRate] = useState('8');
  const [years, setYears] = useState('10');
  const [compounding, setCompounding] = useState('12');

  const result = useMemo(() => {
    const P = parseFloat(principal) || 0;
    const r = (parseFloat(rate) || 0) / 100;
    const n = Math.max(parseInt(compounding) || 1, 1);
    const t = parseInt(years) || 0;

    if (P <= 0 || t <= 0) return { principal: 0, interest: 0, total: 0, yearlyData: [], labels: [] };

    const fv = P * Math.pow(1 + r / n, n * t);
    const interest = fv - P;

    const yearlyData: number[] = [];
    const labels: string[] = [];
    for (let y = 1; y <= t; y++) {
      yearlyData.push(P * Math.pow(1 + r / n, n * y));
      labels.push(`Y${y}`);
    }

    return { principal: P, interest, total: fv, yearlyData, labels };
  }, [principal, rate, years, compounding]);

  function reset() {
    setPrincipal('50000');
    setRate('8');
    setYears('10');
    setCompounding('12');
  }

  return (
    <CalculatorLayout
      title="Compound Interest Calculator"
      description="Calculate compound interest on your investment"
      icon={<Percent size={20} />}
      accentColor="#06b6d4"
      onReset={reset}
    >
      <div className="lg:col-span-2 space-y-4">
        <InputField label="Principal Amount" value={principal} onChange={setPrincipal} prefix="$" />
        <InputField label="Annual Interest Rate" value={rate} onChange={setRate} suffix="%" />
        <InputField label="Time Period" value={years} onChange={setYears} suffix="years" />
        <InputField label="Compounding Frequency (per year)" value={compounding} onChange={setCompounding} placeholder="12 = monthly" />
      </div>

      <div className="lg:col-span-3 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <ResultCard label="Principal" value={formatFullCurrency(result.principal)} />
          <ResultCard label="Interest" value={formatFullCurrency(result.interest)} color="#06b6d4" accent />
          <ResultCard label="Total Value" value={formatFullCurrency(result.total)} color="#10b981" accent />
        </div>

        <div className="p-5 bg-gray-900/50 border border-gray-800 rounded-2xl">
          <AreaChart data={result.yearlyData} labels={result.labels} color="#06b6d4" title="Compound Growth Over Time" height={220} />
        </div>

        <div className="p-5 bg-gray-900/50 border border-gray-800 rounded-2xl">
          <DonutChart
            segments={[
              { label: 'Principal', value: result.principal, color: '#6b7280' },
              { label: 'Compound Interest', value: result.interest, color: '#06b6d4' },
            ]}
            centerLabel="Total"
          />
        </div>
      </div>
    </CalculatorLayout>
  );
}
