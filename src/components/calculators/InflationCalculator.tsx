import { useState, useMemo } from 'react';
import { TrendingDown } from 'lucide-react';
import CalculatorLayout, { InputField, AreaChart, ResultCard, formatFullCurrency } from './CalculatorLayout';

export default function InflationCalculator() {
  const [amount, setAmount] = useState('100000');
  const [rate, setRate] = useState('4');
  const [years, setYears] = useState('20');

  const result = useMemo(() => {
    const P = parseFloat(amount) || 0;
    const r = (parseFloat(rate) || 0) / 100;
    const t = parseInt(years) || 0;

    if (P <= 0 || t <= 0) return { futureValue: 0, lostValue: 0, yearlyData: [], labels: [] };

    const futureValue = P * Math.pow(1 + r, t);
    const lostValue = futureValue - P;

    const yearlyData: number[] = [];
    const labels: string[] = [];
    for (let y = 1; y <= t; y++) {
      yearlyData.push(P * Math.pow(1 + r, y));
      labels.push(`Y${y}`);
    }

    return { futureValue, lostValue, yearlyData, labels };
  }, [amount, rate, years]);

  function reset() {
    setAmount('100000');
    setRate('4');
    setYears('20');
  }

  return (
    <CalculatorLayout
      title="Inflation Calculator"
      description="See how inflation affects the value of your money over time"
      icon={<TrendingDown size={20} />}
      accentColor="#ef4444"
      onReset={reset}
    >
      <div className="lg:col-span-2 space-y-4">
        <InputField label="Current Amount" value={amount} onChange={setAmount} prefix="$" />
        <InputField label="Inflation Rate" value={rate} onChange={setRate} suffix="%" />
        <InputField label="Time Period" value={years} onChange={setYears} suffix="years" />
      </div>

      <div className="lg:col-span-3 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <ResultCard label="Future Cost" value={formatFullCurrency(result.futureValue)} color="#ef4444" accent />
          <ResultCard label="Value Lost to Inflation" value={formatFullCurrency(result.lostValue)} color="#f59e0b" accent />
          <ResultCard label={`Purchasing Power in ${years} yrs`} value={formatFullCurrency(parseFloat(amount) || 0)} />
        </div>

        <div className="p-5 bg-gray-900/50 border border-gray-800 rounded-2xl">
          <AreaChart data={result.yearlyData} labels={result.labels} color="#ef4444" title="Cost Increase Due to Inflation" height={220} />
        </div>

        <div className="p-5 bg-gray-900/50 border border-gray-800 rounded-2xl">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Current Purchasing Power</span>
              <span className="text-white font-semibold">{formatFullCurrency(parseFloat(amount) || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Future Equivalent Cost</span>
              <span className="text-red-400 font-semibold">{formatFullCurrency(result.futureValue)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-gray-800">
              <span className="text-gray-400">Purchasing Power Erosion</span>
              <span className="text-orange-400 font-bold">{((result.lostValue / (parseFloat(amount) || 1)) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </CalculatorLayout>
  );
}
