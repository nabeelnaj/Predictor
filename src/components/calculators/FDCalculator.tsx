import { useState, useMemo } from 'react';
import { Landmark } from 'lucide-react';
import CalculatorLayout, { InputField, AreaChart, DonutChart, ResultCard, formatFullCurrency } from './CalculatorLayout';

export default function FDCalculator() {
  const [amount, setAmount] = useState('100000');
  const [rate, setRate] = useState('6.5');
  const [years, setYears] = useState('5');
  const [compounding, setCompounding] = useState('4');

  const result = useMemo(() => {
    const P = parseFloat(amount) || 0;
    const r = (parseFloat(rate) || 0) / 100;
    const n = Math.max(parseInt(compounding) || 4, 1);
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
  }, [amount, rate, years, compounding]);

  function reset() {
    setAmount('100000');
    setRate('6.5');
    setYears('5');
    setCompounding('4');
  }

  return (
    <CalculatorLayout
      title="Fixed Deposit (FD) Calculator"
      description="Calculate maturity value of your fixed deposit"
      icon={<Landmark size={20} />}
      accentColor="#10b981"
      onReset={reset}
    >
      <div className="lg:col-span-2 space-y-4">
        <InputField label="Deposit Amount" value={amount} onChange={setAmount} prefix="$" />
        <InputField label="Interest Rate" value={rate} onChange={setRate} suffix="%" />
        <InputField label="Time Period" value={years} onChange={setYears} suffix="years" />
        <InputField label="Compounding Frequency (per year)" value={compounding} onChange={setCompounding} placeholder="4 = quarterly" />
      </div>

      <div className="lg:col-span-3 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <ResultCard label="Principal" value={formatFullCurrency(result.principal)} />
          <ResultCard label="Interest Earned" value={formatFullCurrency(result.interest)} color="#10b981" accent />
          <ResultCard label="Maturity Value" value={formatFullCurrency(result.total)} color="#3b82f6" accent />
        </div>

        <div className="p-5 bg-gray-900/50 border border-gray-800 rounded-2xl">
          <AreaChart data={result.yearlyData} labels={result.labels} color="#10b981" title="FD Growth Over Time" height={220} />
        </div>

        <div className="p-5 bg-gray-900/50 border border-gray-800 rounded-2xl">
          <DonutChart
            segments={[
              { label: 'Principal', value: result.principal, color: '#6b7280' },
              { label: 'Interest Earned', value: result.interest, color: '#10b981' },
            ]}
            centerLabel="Maturity"
          />
        </div>
      </div>
    </CalculatorLayout>
  );
}
