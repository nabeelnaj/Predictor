import { useState, useMemo } from 'react';
import { Target } from 'lucide-react';
import CalculatorLayout, { InputField, AreaChart, DonutChart, ResultCard, formatFullCurrency } from './CalculatorLayout';

export default function GoalBasedCalculator() {
  const [goalAmount, setGoalAmount] = useState('1000000');
  const [years, setYears] = useState('10');
  const [rate, setRate] = useState('10');
  const [currentSavings, setCurrentSavings] = useState('100000');

  const result = useMemo(() => {
    const goal = parseFloat(goalAmount) || 0;
    const t = parseInt(years) || 0;
    const r = (parseFloat(rate) || 0) / 100 / 12;
    const current = parseFloat(currentSavings) || 0;

    if (goal <= 0 || t <= 0) return { monthlyNeeded: 0, futureCurrent: 0, totalContributed: 0, goal: 0, yearlyData: [], labels: [] };

    // Future value of current savings
    const futureCurrent = current * Math.pow(1 + r, t * 12);
    const remaining = goal - futureCurrent;

    // Monthly SIP needed for remaining amount
    const n = t * 12;
    let monthlyNeeded = 0;
    if (remaining > 0 && r > 0) {
      monthlyNeeded = remaining * r / ((Math.pow(1 + r, n) - 1) * (1 + r));
    } else if (remaining > 0) {
      monthlyNeeded = remaining / n;
    }

    const totalContributed = current + monthlyNeeded * n;

    const yearlyData: number[] = [];
    const labels: string[] = [];
    let corpus = current;
    for (let y = 1; y <= t; y++) {
      for (let m = 1; m <= 12; m++) {
        corpus = corpus * (1 + r) + (remaining > 0 ? monthlyNeeded : 0);
      }
      yearlyData.push(corpus);
      labels.push(`Y${y}`);
    }

    return { monthlyNeeded, futureCurrent, totalContributed, goal, yearlyData, labels };
  }, [goalAmount, years, rate, currentSavings]);

  function reset() {
    setGoalAmount('1000000');
    setYears('10');
    setRate('10');
    setCurrentSavings('100000');
  }

  return (
    <CalculatorLayout
      title="Goal-Based Investment Calculator"
      description="Calculate how much to invest monthly to reach your financial goal"
      icon={<Target size={20} />}
      accentColor="#14b8a6"
      onReset={reset}
    >
      <div className="lg:col-span-2 space-y-4">
        <InputField label="Goal Amount" value={goalAmount} onChange={setGoalAmount} prefix="$" />
        <InputField label="Time to Goal" value={years} onChange={setYears} suffix="years" />
        <InputField label="Expected Return Rate" value={rate} onChange={setRate} suffix="%" />
        <InputField label="Current Savings" value={currentSavings} onChange={setCurrentSavings} prefix="$" />
      </div>

      <div className="lg:col-span-3 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <ResultCard label="Monthly SIP Needed" value={formatFullCurrency(result.monthlyNeeded)} color="#14b8a6" accent />
          <ResultCard label="Current Savings FV" value={formatFullCurrency(result.futureCurrent)} />
          <ResultCard label="Total Investment" value={formatFullCurrency(result.totalContributed)} />
        </div>

        <div className="p-5 bg-gray-900/50 border border-gray-800 rounded-2xl">
          <AreaChart data={result.yearlyData} labels={result.labels} color="#14b8a6" title="Growth Toward Goal" height={220} />
        </div>

        <div className="p-5 bg-gray-900/50 border border-gray-800 rounded-2xl">
          <DonutChart
            segments={[
              { label: 'Current Savings (FV)', value: result.futureCurrent, color: '#6b7280' },
              { label: 'Monthly Contributions', value: result.monthlyNeeded * (parseInt(years) || 0) * 12, color: '#14b8a6' },
            ]}
            centerLabel="Goal"
            centerValue={formatFullCurrency(result.goal)}
          />
        </div>
      </div>
    </CalculatorLayout>
  );
}
