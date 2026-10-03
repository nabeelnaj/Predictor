import { useState, useMemo } from 'react';
import { TrendingDown } from 'lucide-react';
import CalculatorLayout, { InputField, AreaChart, DonutChart, ResultCard, formatFullCurrency } from './CalculatorLayout';

export default function SWPCalculator() {
  const [amount, setAmount] = useState('1000000');
  const [withdrawal, setWithdrawal] = useState('20000');
  const [rate, setRate] = useState('8');
  const [years, setYears] = useState('15');

  const result = useMemo(() => {
    const PV = parseFloat(amount) || 0;
    const W = parseFloat(withdrawal) || 0;
    const r = (parseFloat(rate) || 0) / 100 / 12;
    const n = (parseInt(years) || 0) * 12;

    if (PV <= 0 || W <= 0 || n <= 0) return { totalWithdrawn: 0, balance: 0, yearlyData: [], labels: [] };

    let balance = PV;
    let actualWithdrawn = 0;
    const yearlyData: number[] = [];
    const labels: string[] = [];
    const totalYears = parseInt(years) || 0;

    for (let y = 1; y <= totalYears; y++) {
      for (let m = 1; m <= 12; m++) {
        balance = balance * (1 + r) - W;
        if (balance < 0) {
          actualWithdrawn += W + balance; // partial withdrawal
          balance = 0;
        } else {
          actualWithdrawn += W;
        }
      }
      yearlyData.push(balance);
      labels.push(`Y${y}`);
    }

    return { totalWithdrawn: actualWithdrawn, balance, yearlyData, labels };
  }, [amount, withdrawal, rate, years]);

  function reset() {
    setAmount('1000000');
    setWithdrawal('20000');
    setRate('8');
    setYears('15');
  }

  return (
    <CalculatorLayout
      title="SWP Calculator"
      description="Calculate Systematic Withdrawal Plan from your investment"
      icon={<TrendingDown size={20} />}
      accentColor="#f59e0b"
      onReset={reset}
    >
      <div className="lg:col-span-2 space-y-4">
        <InputField label="Total Investment" value={amount} onChange={setAmount} prefix="$" />
        <InputField label="Monthly Withdrawal" value={withdrawal} onChange={setWithdrawal} prefix="$" />
        <InputField label="Expected Annual Return Rate" value={rate} onChange={setRate} suffix="%" />
        <InputField label="Withdrawal Period" value={years} onChange={setYears} suffix="years" />
      </div>

      <div className="lg:col-span-3 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <ResultCard label="Total Withdrawn" value={formatFullCurrency(result.totalWithdrawn)} color="#f59e0b" accent />
          <ResultCard label="Final Balance" value={formatFullCurrency(result.balance)} color={result.balance > 0 ? '#10b981' : '#ef4444'} accent />
          <ResultCard label="Total Period" value={`${years} years`} />
        </div>

        <div className="p-5 bg-gray-900/50 border border-gray-800 rounded-2xl">
          <AreaChart data={result.yearlyData} labels={result.labels} color="#f59e0b" title="Remaining Balance Over Time" height={220} />
        </div>

        <div className="p-5 bg-gray-900/50 border border-gray-800 rounded-2xl">
          <DonutChart
            segments={[
              { label: 'Total Withdrawn', value: result.totalWithdrawn, color: '#f59e0b' },
              { label: 'Final Balance', value: result.balance, color: '#10b981' },
            ]}
            centerLabel="Summary"
          />
        </div>
      </div>
    </CalculatorLayout>
  );
}
