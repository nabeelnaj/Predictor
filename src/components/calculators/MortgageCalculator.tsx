import { useState, useMemo } from 'react';
import { Home } from 'lucide-react';
import CalculatorLayout, { InputField, AreaChart, DonutChart, ResultCard, formatFullCurrency } from './CalculatorLayout';

export default function MortgageCalculator() {
  const [homePrice, setHomePrice] = useState('350000');
  const [downPayment, setDownPayment] = useState('70000');
  const [rate, setRate] = useState('6.5');
  const [years, setYears] = useState('30');
  const [propertyTax, setPropertyTax] = useState('3600');
  const [insurance, setInsurance] = useState('1200');

  const result = useMemo(() => {
    const price = parseFloat(homePrice) || 0;
    const down = parseFloat(downPayment) || 0;
    const loan = price - down;
    const r = (parseFloat(rate) || 0) / 100 / 12;
    const n = (parseInt(years) || 0) * 12;
    const monthlyTax = (parseFloat(propertyTax) || 0) / 12;
    const monthlyInsurance = (parseFloat(insurance) || 0) / 12;

    if (loan <= 0 || n <= 0) return { loanAmount: 0, monthlyPI: 0, monthlyPayment: 0, totalInterest: 0, totalPayment: 0, monthlyTax: 0, monthlyInsurance: 0, yearlyData: [], labels: [] };

    let monthlyPI: number;
    if (r === 0) {
      monthlyPI = loan / n;
    } else {
      monthlyPI = loan * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    }

    const monthlyPayment = monthlyPI + monthlyTax + monthlyInsurance;
    const totalPayment = (monthlyPI + monthlyTax + monthlyInsurance) * n;
    const totalInterest = totalPayment - loan;

    const yearlyData: number[] = [];
    const labels: string[] = [];
    let balance = loan;
    const totalYears = parseInt(years) || 0;
    for (let y = 1; y <= totalYears; y++) {
      for (let m = 1; m <= 12; m++) {
        const interest = balance * r;
        const principal = monthlyPI - interest;
        balance -= principal;
      }
      yearlyData.push(Math.max(balance, 0));
      labels.push(`Y${y}`);
    }

    return { loanAmount: loan, monthlyPI, monthlyPayment, totalInterest, totalPayment, monthlyTax, monthlyInsurance, yearlyData, labels };
  }, [homePrice, downPayment, rate, years, propertyTax, insurance]);

  function reset() {
    setHomePrice('350000');
    setDownPayment('70000');
    setRate('6.5');
    setYears('30');
    setPropertyTax('3600');
    setInsurance('1200');
  }

  return (
    <CalculatorLayout
      title="Mortgage Calculator"
      description="Calculate your monthly mortgage payment including taxes and insurance"
      icon={<Home size={20} />}
      accentColor="#0ea5e9"
      onReset={reset}
    >
      <div className="lg:col-span-2 space-y-4">
        <InputField label="Home Price" value={homePrice} onChange={setHomePrice} prefix="$" />
        <InputField label="Down Payment" value={downPayment} onChange={setDownPayment} prefix="$" />
        <InputField label="Interest Rate" value={rate} onChange={setRate} suffix="%" />
        <InputField label="Loan Term" value={years} onChange={setYears} suffix="years" />
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Annual Property Tax" value={propertyTax} onChange={setPropertyTax} prefix="$" />
          <InputField label="Annual Insurance" value={insurance} onChange={setInsurance} prefix="$" />
        </div>
      </div>

      <div className="lg:col-span-3 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <ResultCard label="Loan Amount" value={formatFullCurrency(result.loanAmount)} />
          <ResultCard label="Monthly P+I" value={formatFullCurrency(result.monthlyPI)} color="#0ea5e9" accent />
          <ResultCard label="Monthly Payment" value={formatFullCurrency(result.monthlyPayment)} color="#3b82f6" accent />
        </div>

        <div className="p-5 bg-gray-900/50 border border-gray-800 rounded-2xl">
          <AreaChart data={result.yearlyData} labels={result.labels} color="#0ea5e9" title="Loan Balance Over Time" height={220} />
        </div>

        <div className="p-5 bg-gray-900/50 border border-gray-800 rounded-2xl">
          <DonutChart
            segments={[
              { label: 'Loan Principal', value: result.loanAmount, color: '#0ea5e9' },
              { label: 'Total Interest', value: result.totalInterest, color: '#ef4444' },
              { label: 'Tax & Insurance', value: ((result.monthlyTax ?? 0) + (result.monthlyInsurance ?? 0)) * (parseInt(years) || 0) * 12, color: '#f59e0b' },
            ]}
            centerLabel="Total Cost"
          />
        </div>
      </div>
    </CalculatorLayout>
  );
}
