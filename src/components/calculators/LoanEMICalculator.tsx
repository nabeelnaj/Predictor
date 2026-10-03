import { useState, useMemo } from 'react';
import { CreditCard } from 'lucide-react';
import CalculatorLayout, { InputField, AreaChart, DonutChart, ResultCard, formatFullCurrency } from './CalculatorLayout';

export default function LoanEMICalculator() {
  const [amount, setAmount] = useState('500000');
  const [rate, setRate] = useState('9');
  const [years, setYears] = useState('5');

  const result = useMemo(() => {
    const P = parseFloat(amount) || 0;
    const r = (parseFloat(rate) || 0) / 100 / 12;
    const n = (parseInt(years) || 0) * 12;

    if (P <= 0 || n <= 0) return { emi: 0, totalPayment: 0, totalInterest: 0, yearlyData: [], labels: [] };

    let emi: number;
    if (r === 0) {
      emi = P / n;
    } else {
      emi = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    }

    const totalPayment = emi * n;
    const totalInterest = totalPayment - P;

    // Yearly balance data
    const yearlyData: number[] = [];
    const labels: string[] = [];
    let balance = P;
    const totalYears = parseInt(years) || 0;
    for (let y = 1; y <= totalYears; y++) {
      for (let m = 1; m <= 12; m++) {
        const interest = balance * r;
        const principal = emi - interest;
        balance -= principal;
      }
      yearlyData.push(Math.max(balance, 0));
      labels.push(`Y${y}`);
    }

    return { emi, totalPayment, totalInterest, yearlyData, labels };
  }, [amount, rate, years]);

  function reset() {
    setAmount('500000');
    setRate('9');
    setYears('5');
  }

  return (
    <CalculatorLayout
      title="Loan EMI Calculator"
      description="Calculate your Equated Monthly Installment for any loan"
      icon={<CreditCard size={20} />}
      accentColor="#6366f1"
      onReset={reset}
    >
      <div className="lg:col-span-2 space-y-4">
        <InputField label="Loan Amount" value={amount} onChange={setAmount} prefix="$" />
        <InputField label="Interest Rate" value={rate} onChange={setRate} suffix="%" />
        <InputField label="Loan Tenure" value={years} onChange={setYears} suffix="years" />
      </div>

      <div className="lg:col-span-3 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <ResultCard label="Monthly EMI" value={formatFullCurrency(result.emi)} color="#6366f1" accent />
          <ResultCard label="Total Interest" value={formatFullCurrency(result.totalInterest)} color="#ef4444" accent />
          <ResultCard label="Total Payment" value={formatFullCurrency(result.totalPayment)} color="#f59e0b" accent />
        </div>

        <div className="p-5 bg-gray-900/50 border border-gray-800 rounded-2xl">
          <AreaChart data={result.yearlyData} labels={result.labels} color="#6366f1" title="Outstanding Balance Over Time" height={220} />
        </div>

        <div className="p-5 bg-gray-900/50 border border-gray-800 rounded-2xl">
          <DonutChart
            segments={[
              { label: 'Principal', value: parseFloat(amount) || 0, color: '#6366f1' },
              { label: 'Total Interest', value: result.totalInterest, color: '#ef4444' },
            ]}
            centerLabel="Total Payment"
          />
        </div>
      </div>
    </CalculatorLayout>
  );
}
