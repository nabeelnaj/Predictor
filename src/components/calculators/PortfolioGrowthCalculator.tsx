import { useState, useMemo } from 'react';
import { LineChart } from 'lucide-react';
import CalculatorLayout, { InputField, DonutChart, ResultCard, formatFullCurrency } from './CalculatorLayout';

export default function PortfolioGrowthCalculator() {
  const [initial, setInitial] = useState('100000');
  const [annualReturn, setAnnualReturn] = useState('10');
  const [years, setYears] = useState('20');
  const [volatility, setVolatility] = useState('15');

  const result = useMemo(() => {
    const P = parseFloat(initial) || 0;
    const r = (parseFloat(annualReturn) || 0) / 100;
    const t = parseInt(years) || 0;
    const vol = (parseFloat(volatility) || 0) / 100;

    if (P <= 0 || t <= 0) return { expected: 0, best: 0, worst: 0, profit: 0, yearlyExpected: [], yearlyBest: [], yearlyWorst: [], labels: [] };

    const expected = P * Math.pow(1 + r, t);
    const best = P * Math.pow(1 + r + vol, t);
    const worst = P * Math.pow(1 + Math.max(r - vol, -0.5), t);
    const profit = expected - P;

    const yearlyExpected: number[] = [];
    const yearlyBest: number[] = [];
    const yearlyWorst: number[] = [];
    const labels: string[] = [];
    for (let y = 1; y <= t; y++) {
      yearlyExpected.push(P * Math.pow(1 + r, y));
      yearlyBest.push(P * Math.pow(1 + r + vol, y));
      yearlyWorst.push(P * Math.pow(1 + Math.max(r - vol, -0.5), y));
      labels.push(`Y${y}`);
    }

    return { expected, best, worst, profit, yearlyExpected, yearlyBest, yearlyWorst, labels };
  }, [initial, annualReturn, years, volatility]);

  function reset() {
    setInitial('100000');
    setAnnualReturn('10');
    setYears('20');
    setVolatility('15');
  }

  return (
    <CalculatorLayout
      title="Portfolio Growth Calculator"
      description="Project your portfolio growth with optimistic, expected, and pessimistic scenarios"
      icon={<LineChart size={20} />}
      accentColor="#a855f7"
      onReset={reset}
    >
      <div className="lg:col-span-2 space-y-4">
        <InputField label="Initial Portfolio Value" value={initial} onChange={setInitial} prefix="$" />
        <InputField label="Expected Annual Return" value={annualReturn} onChange={setAnnualReturn} suffix="%" />
        <InputField label="Volatility (Std Dev)" value={volatility} onChange={setVolatility} suffix="%" />
        <InputField label="Time Horizon" value={years} onChange={setYears} suffix="years" />
      </div>

      <div className="lg:col-span-3 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <ResultCard label="Expected Value" value={formatFullCurrency(result.expected)} color="#a855f7" accent />
          <ResultCard label="Best Case" value={formatFullCurrency(result.best)} color="#10b981" accent />
          <ResultCard label="Worst Case" value={formatFullCurrency(result.worst)} color="#ef4444" accent />
        </div>

        <div className="p-5 bg-gray-900/50 border border-gray-800 rounded-2xl">
          <p className="text-xs font-medium text-gray-400 mb-2">Portfolio Growth Scenarios</p>
          <svg viewBox="0 0 600 220" className="w-full" style={{ height: 'auto' }}>
            {/* Expected */}
            <path
              d={buildPath(result.yearlyExpected, 600, 220)}
              fill="none"
              stroke="#a855f7"
              strokeWidth="2"
            />
            {/* Best */}
            <path
              d={buildPath(result.yearlyBest, 600, 220)}
              fill="none"
              stroke="#10b981"
              strokeWidth="1.5"
              strokeDasharray="4"
            />
            {/* Worst */}
            <path
              d={buildPath(result.yearlyWorst, 600, 220)}
              fill="none"
              stroke="#ef4444"
              strokeWidth="1.5"
              strokeDasharray="4"
            />
            {/* Legend */}
            <rect x="20" y="10" width="8" height="2" fill="#a855f7" />
            <text x="32" y="14" fill="#9ca3af" fontSize="9">Expected</text>
            <rect x="90" y="10" width="8" height="2" fill="#10b981" />
            <text x="102" y="14" fill="#9ca3af" fontSize="9">Best Case</text>
            <rect x="160" y="10" width="8" height="2" fill="#ef4444" />
            <text x="172" y="14" fill="#9ca3af" fontSize="9">Worst Case</text>
          </svg>
        </div>

        <div className="p-5 bg-gray-900/50 border border-gray-800 rounded-2xl">
          <DonutChart
            segments={[
              { label: 'Initial Investment', value: parseFloat(initial) || 0, color: '#6b7280' },
              { label: 'Expected Profit', value: result.profit, color: '#a855f7' },
            ]}
            centerLabel="Expected"
          />
        </div>
      </div>
    </CalculatorLayout>
  );
}

function buildPath(data: number[], width: number, height: number): string {
  if (data.length === 0) return '';
  const padding = { top: 25, right: 20, bottom: 25, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  return data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartW;
    const y = padding.top + chartH - ((d - min) / range) * chartH;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
}
