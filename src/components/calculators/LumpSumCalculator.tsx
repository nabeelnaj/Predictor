import { useState, useMemo } from 'react';
import { DollarSign } from 'lucide-react';
import CalculatorLayout, { InputField, AreaChart, DonutChart, ResultCard, formatFullCurrency } from './CalculatorLayout';

export default function LumpSumCalculator() {
  const [amount, setAmount] = useState('100000');
  const [rate, setRate] = useState('10');
  const [years, setYears] = useState('10');

  const result = useMemo(() => {
    const P = parseFloat(amount) || 0;
    const r = (parseFloat(rate) || 0) / 100;
    const n = parseInt(years) || 0;

    if (P <= 0 || n <= 0) return { invested: 0, returns: 0, total: 0, yearlyData: [], labels: [] };

    // Guard against extreme negative rates that produce NaN
    const safeR = Math.max(r, -0.99);
    const fv = P * Math.pow(1 + safeR, n);
    const returns = fv - P;

    const yearlyData: number[] = [];
    const labels: string[] = [];
    for (let y = 1; y <= n; y++) {
      yearlyData.push(P * Math.pow(1 + safeR, y));
      labels.push(`Y${y}`);
    }

    return { invested: P, returns, total: fv, yearlyData, labels };
  }, [amount, rate, years]);

  function reset() {
    setAmount('100000');
    setRate('10');
    setYears('10');
  }

  return (
    <CalculatorLayout
      title="Lump Sum Investment Calculator"
      description="Calculate returns on a one-time investment"
      icon={<DollarSign size={20} />}
      accentColor="#8b5cf6"
      onReset={reset}
    >
      <div className="lg:col-span-2 space-y-4">
        <InputField label="Investment Amount" value={amount} onChange={setAmount} prefix="$" />
        <InputField label="Expected Annual Return Rate" value={rate} onChange={setRate} suffix="%" />
        <InputField label="Investment Period" value={years} onChange={setYears} suffix="years" />
      </div>

      <div className="lg:col-span-3 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <ResultCard label="Invested" value={formatFullCurrency(result.invested)} />
          <ResultCard label="Returns" value={formatFullCurrency(result.returns)} color="#10b981" accent />
          <ResultCard label="Total Value" value={formatFullCurrency(result.total)} color="#8b5cf6" accent />
        </div>

        <div className="p-5 bg-gray-900/50 border border-gray-800 rounded-2xl">
          <AreaChart data={result.yearlyData} labels={result.labels} color="#8b5cf6" title="Investment Growth Over Time" height={220} />
        </div>

        <div className="p-5 bg-gray-900/50 border border-gray-800 rounded-2xl">
          <DonutChart
            segments={[
              { label: 'Invested Amount', value: result.invested, color: '#6b7280' },
              { label: 'Estimated Returns', value: result.returns, color: '#8b5cf6' },
            ]}
            centerLabel="Total"
          />
        </div>
      </div>
    </CalculatorLayout>
  );
}
