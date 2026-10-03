import { useState, useMemo } from 'react';
import { Repeat } from 'lucide-react';
import CalculatorLayout, { InputField, AreaChart, DonutChart, ResultCard, formatFullCurrency } from './CalculatorLayout';

export default function RDCalculator() {
  const [amount, setAmount] = useState('10000');
  const [rate, setRate] = useState('7');
  const [years, setYears] = useState('5');

  const result = useMemo(() => {
    const P = parseFloat(amount) || 0;
    const r = (parseFloat(rate) || 0) / 100 / 4; // quarterly compounding
    const n = (parseInt(years) || 0) * 4;

    if (P <= 0 || n <= 0) return { invested: 0, interest: 0, total: 0, yearlyData: [], labels: [] };

    // RD formula: quarterly compounding of monthly deposits
    // Standard RD formula: FV = P * [((1+i)^n - 1) / (1 - (1+i)^(-1/3))] where i = quarterly rate
    let total: number;
    if (r === 0) {
      total = P * 12 * (parseInt(years) || 0);
    } else {
      // Using the standard RD formula for monthly deposits with quarterly compounding
      total = P * ((Math.pow(1 + r, n) - 1) / (1 - Math.pow(1 + r, -1/3)));
    }
    const invested = P * 12 * (parseInt(years) || 0);
    const interest = total - invested;

    const yearlyData: number[] = [];
    const labels: string[] = [];
    const totalYears = parseInt(years) || 0;
    for (let y = 1; y <= totalYears; y++) {
      const quarters = y * 4;
      let val: number;
      if (r === 0) {
        val = P * 12 * y;
      } else {
        val = P * ((Math.pow(1 + r, quarters) - 1) / (1 - Math.pow(1 + r, -1/3)));
      }
      yearlyData.push(val);
      labels.push(`Y${y}`);
    }

    return { invested, interest, total, yearlyData, labels };
  }, [amount, rate, years]);

  function reset() {
    setAmount('10000');
    setRate('7');
    setYears('5');
  }

  return (
    <CalculatorLayout
      title="Recurring Deposit (RD) Calculator"
      description="Calculate maturity value of your recurring deposit"
      icon={<Repeat size={20} />}
      accentColor="#f97316"
      onReset={reset}
    >
      <div className="lg:col-span-2 space-y-4">
        <InputField label="Monthly Deposit" value={amount} onChange={setAmount} prefix="$" />
        <InputField label="Interest Rate" value={rate} onChange={setRate} suffix="%" />
        <InputField label="Time Period" value={years} onChange={setYears} suffix="years" />
      </div>

      <div className="lg:col-span-3 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <ResultCard label="Total Invested" value={formatFullCurrency(result.invested)} />
          <ResultCard label="Interest Earned" value={formatFullCurrency(result.interest)} color="#f97316" accent />
          <ResultCard label="Maturity Value" value={formatFullCurrency(result.total)} color="#3b82f6" accent />
        </div>

        <div className="p-5 bg-gray-900/50 border border-gray-800 rounded-2xl">
          <AreaChart data={result.yearlyData} labels={result.labels} color="#f97316" title="RD Growth Over Time" height={220} />
        </div>

        <div className="p-5 bg-gray-900/50 border border-gray-800 rounded-2xl">
          <DonutChart
            segments={[
              { label: 'Total Invested', value: result.invested, color: '#6b7280' },
              { label: 'Interest Earned', value: result.interest, color: '#f97316' },
            ]}
            centerLabel="Maturity"
          />
        </div>
      </div>
    </CalculatorLayout>
  );
}
