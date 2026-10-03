import { useState, useMemo } from 'react';
import { PiggyBank } from 'lucide-react';
import CalculatorLayout, { InputField, AreaChart, DonutChart, ResultCard, formatFullCurrency } from './CalculatorLayout';

export default function SavingsCalculator() {
  const [initial, setInitial] = useState('10000');
  const [monthly, setMonthly] = useState('2000');
  const [rate, setRate] = useState('7');
  const [years, setYears] = useState('15');

  const result = useMemo(() => {
    const P = parseFloat(initial) || 0;
    const M = parseFloat(monthly) || 0;
    const r = (parseFloat(rate) || 0) / 100 / 12;
    const n = (parseInt(years) || 0) * 12;

    if (P < 0 || n <= 0) return { totalContributed: 0, interest: 0, total: 0, yearlyData: [], labels: [] };

    // FV of initial + FV of monthly contributions
    const fvInitial = P * Math.pow(1 + r, n);
    let fvMonthly = 0;
    if (r > 0) {
      fvMonthly = M * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
    } else {
      fvMonthly = M * n;
    }

    const total = fvInitial + fvMonthly;
    const totalContributed = P + M * n;
    const interest = total - totalContributed;

    const yearlyData: number[] = [];
    const labels: string[] = [];
    const totalYears = parseInt(years) || 0;
    let corpus = P;
    for (let y = 1; y <= totalYears; y++) {
      for (let m = 1; m <= 12; m++) {
        corpus = corpus * (1 + r) + M;
      }
      yearlyData.push(corpus);
      labels.push(`Y${y}`);
    }

    return { totalContributed, interest, total, yearlyData, labels };
  }, [initial, monthly, rate, years]);

  function reset() {
    setInitial('10000');
    setMonthly('2000');
    setRate('7');
    setYears('15');
  }

  return (
    <CalculatorLayout
      title="Savings Calculator"
      description="Calculate growth of your savings with regular contributions"
      icon={<PiggyBank size={20} />}
      accentColor="#22c55e"
      onReset={reset}
    >
      <div className="lg:col-span-2 space-y-4">
        <InputField label="Initial Savings" value={initial} onChange={setInitial} prefix="$" />
        <InputField label="Monthly Contribution" value={monthly} onChange={setMonthly} prefix="$" />
        <InputField label="Annual Interest Rate" value={rate} onChange={setRate} suffix="%" />
        <InputField label="Time Period" value={years} onChange={setYears} suffix="years" />
      </div>

      <div className="lg:col-span-3 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <ResultCard label="Total Contributed" value={formatFullCurrency(result.totalContributed)} />
          <ResultCard label="Interest Earned" value={formatFullCurrency(result.interest)} color="#22c55e" accent />
          <ResultCard label="Total Savings" value={formatFullCurrency(result.total)} color="#3b82f6" accent />
        </div>

        <div className="p-5 bg-gray-900/50 border border-gray-800 rounded-2xl">
          <AreaChart data={result.yearlyData} labels={result.labels} color="#22c55e" title="Savings Growth Over Time" height={220} />
        </div>

        <div className="p-5 bg-gray-900/50 border border-gray-800 rounded-2xl">
          <DonutChart
            segments={[
              { label: 'Total Contributed', value: result.totalContributed, color: '#6b7280' },
              { label: 'Interest Earned', value: result.interest, color: '#22c55e' },
            ]}
            centerLabel="Total"
          />
        </div>
      </div>
    </CalculatorLayout>
  );
}
