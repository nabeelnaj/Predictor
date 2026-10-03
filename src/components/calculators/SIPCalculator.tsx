import { useState, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import CalculatorLayout, { InputField, AreaChart, DonutChart, ResultCard, formatFullCurrency } from './CalculatorLayout';

export default function SIPCalculator() {
  const [amount, setAmount] = useState('25000');
  const [rate, setRate] = useState('12');
  const [years, setYears] = useState('10');

  const result = useMemo(() => {
    const P = parseFloat(amount) || 0;
    const r = (parseFloat(rate) || 0) / 100 / 12;
    const n = (parseInt(years) || 0) * 12;

    if (P <= 0 || n <= 0) return { invested: 0, returns: 0, total: 0, yearlyData: [], labels: [] };

    const invested = P * n;
    let fv: number;
    if (r === 0) {
      fv = invested;
    } else {
      fv = P * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
    }
    const returns = fv - invested;

    const yearlyData: number[] = [];
    const labels: string[] = [];
    const totalYears = parseInt(years) || 0;
    for (let y = 1; y <= totalYears; y++) {
      const periodN = y * 12;
      let periodFV: number;
      if (r === 0) {
        periodFV = P * periodN;
      } else {
        periodFV = P * ((Math.pow(1 + r, periodN) - 1) / r) * (1 + r);
      }
      yearlyData.push(periodFV);
      labels.push(`Y${y}`);
    }

    return { invested, returns, total: fv, yearlyData, labels };
  }, [amount, rate, years]);

  function reset() {
    setAmount('25000');
    setRate('12');
    setYears('10');
  }

  return (
    <CalculatorLayout
      title="SIP Calculator"
      description="Calculate returns on your Systematic Investment Plan"
      icon={<TrendingUp size={20} />}
      accentColor="#3b82f6"
      onReset={reset}
    >
      {/* Form */}
      <div className="lg:col-span-2 space-y-4">
        <InputField label="Monthly Investment" value={amount} onChange={setAmount} prefix="$" />
        <InputField label="Expected Annual Return Rate" value={rate} onChange={setRate} suffix="%" />
        <InputField label="Investment Period" value={years} onChange={setYears} suffix="years" />
      </div>

      {/* Results */}
      <div className="lg:col-span-3 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <ResultCard label="Invested" value={formatFullCurrency(result.invested)} />
          <ResultCard label="Returns" value={formatFullCurrency(result.returns)} color="#10b981" accent />
          <ResultCard label="Total Value" value={formatFullCurrency(result.total)} color="#3b82f6" accent />
        </div>

        <div className="p-5 bg-gray-900/50 border border-gray-800 rounded-2xl">
          <AreaChart data={result.yearlyData} labels={result.labels} color="#3b82f6" title="Investment Growth Over Time" height={220} />
        </div>

        <div className="p-5 bg-gray-900/50 border border-gray-800 rounded-2xl">
          <DonutChart
            segments={[
              { label: 'Invested Amount', value: result.invested, color: '#6b7280' },
              { label: 'Estimated Returns', value: result.returns, color: '#3b82f6' },
            ]}
            centerLabel="Total"
            centerValue={formatFullCurrency(result.total)}
          />
        </div>
      </div>
    </CalculatorLayout>
  );
}
