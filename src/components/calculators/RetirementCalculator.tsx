import { useState, useMemo } from 'react';
import { Coffee } from 'lucide-react';
import CalculatorLayout, { InputField, AreaChart, DonutChart, ResultCard, formatFullCurrency } from './CalculatorLayout';

export default function RetirementCalculator() {
  const [currentAge, setCurrentAge] = useState('30');
  const [retireAge, setRetireAge] = useState('60');
  const [lifeExpectancy, setLifeExpectancy] = useState('85');
  const [monthlyExpense, setMonthlyExpense] = useState('50000');
  const [currentSavings, setCurrentSavings] = useState('500000');
  const [monthlyContribution, setMonthlyContribution] = useState('15000');
  const [preRetireReturn, setPreRetireReturn] = useState('10');
  const [postRetireReturn, setPostRetireReturn] = useState('6');
  const [inflation, setInflation] = useState('4');

  const result = useMemo(() => {
    const age = parseInt(currentAge) || 0;
    const retire = parseInt(retireAge) || 0;
    const lifeExp = parseInt(lifeExpectancy) || 0;
    const monthlyExp = parseFloat(monthlyExpense) || 0;
    const savings = parseFloat(currentSavings) || 0;
    const contribution = parseFloat(monthlyContribution) || 0;
    const preReturn = (parseFloat(preRetireReturn) || 0) / 100 / 12;
    const postReturn = (parseFloat(postRetireReturn) || 0) / 100 / 12;
    const infl = (parseFloat(inflation) || 0) / 100;

    const yearsToRetire = retire - age;
    const yearsInRetirement = lifeExp - retire;

    if (yearsToRetire <= 0 || yearsInRetirement <= 0) {
      return { corpusNeeded: 0, corpusAtRetirement: 0, shortfall: 0, futureMonthlyExp: 0, yearlyData: [], labels: [] };
    }

    // Future monthly expense at retirement (adjusted for inflation)
    const futureMonthlyExp = monthlyExp * Math.pow(1 + infl, yearsToRetire);

    // Corpus needed at retirement (PV of annuity during retirement, inflation-adjusted)
    // Using real return rate: (1+postReturn)/(1+infl) - 1
    const monthlyInfl = infl / 12;
    const realReturn = (1 + postReturn) / (1 + monthlyInfl) - 1;
    const monthsInRetirement = yearsInRetirement * 12;
    let corpusNeeded: number;
    if (Math.abs(realReturn) < 1e-10) {
      corpusNeeded = futureMonthlyExp * monthsInRetirement;
    } else {
      corpusNeeded = futureMonthlyExp * ((1 - Math.pow(1 + realReturn, -monthsInRetirement)) / realReturn);
    }

    // Corpus at retirement (current savings + monthly contributions, growing at pre-retire return)
    let corpus = savings;
    const monthsToRetire = yearsToRetire * 12;
    for (let m = 1; m <= monthsToRetire; m++) {
      corpus = corpus * (1 + preReturn) + contribution;
    }
    const corpusAtRetirement = corpus;
    const shortfall = corpusNeeded - corpusAtRetirement;

    // Yearly growth data
    const yearlyData: number[] = [];
    const labels: string[] = [];
    let tempCorpus = savings;
    for (let y = 1; y <= yearsToRetire; y++) {
      for (let m = 1; m <= 12; m++) {
        tempCorpus = tempCorpus * (1 + preReturn) + contribution;
      }
      yearlyData.push(tempCorpus);
      labels.push(`${age + y}`);
    }

    return { corpusNeeded, corpusAtRetirement, shortfall, futureMonthlyExp, yearlyData, labels };
  }, [currentAge, retireAge, lifeExpectancy, monthlyExpense, currentSavings, monthlyContribution, preRetireReturn, postRetireReturn, inflation]);

  function reset() {
    setCurrentAge('30');
    setRetireAge('60');
    setLifeExpectancy('85');
    setMonthlyExpense('50000');
    setCurrentSavings('500000');
    setMonthlyContribution('15000');
    setPreRetireReturn('10');
    setPostRetireReturn('6');
    setInflation('4');
  }

  return (
    <CalculatorLayout
      title="Retirement Calculator"
      description="Plan your retirement corpus and monthly contributions"
      icon={<Coffee size={20} />}
      accentColor="#ec4899"
      onReset={reset}
    >
      <div className="lg:col-span-2 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Current Age" value={currentAge} onChange={setCurrentAge} suffix="yrs" />
          <InputField label="Retirement Age" value={retireAge} onChange={setRetireAge} suffix="yrs" />
        </div>
        <InputField label="Life Expectancy" value={lifeExpectancy} onChange={setLifeExpectancy} suffix="yrs" />
        <InputField label="Monthly Expense (Current)" value={monthlyExpense} onChange={setMonthlyExpense} prefix="$" />
        <InputField label="Current Savings" value={currentSavings} onChange={setCurrentSavings} prefix="$" />
        <InputField label="Monthly Contribution" value={monthlyContribution} onChange={setMonthlyContribution} prefix="$" />
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Pre-Retire Return" value={preRetireReturn} onChange={setPreRetireReturn} suffix="%" />
          <InputField label="Post-Retire Return" value={postRetireReturn} onChange={setPostRetireReturn} suffix="%" />
        </div>
        <InputField label="Inflation Rate" value={inflation} onChange={setInflation} suffix="%" />
      </div>

      <div className="lg:col-span-3 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <ResultCard label="Corpus Needed" value={formatFullCurrency(result.corpusNeeded)} color="#ec4899" accent />
          <ResultCard label="Corpus at Retirement" value={formatFullCurrency(result.corpusAtRetirement)} color="#3b82f6" accent />
          <ResultCard
            label={result.shortfall > 0 ? "Shortfall" : "Surplus"}
            value={formatFullCurrency(Math.abs(result.shortfall))}
            color={result.shortfall > 0 ? "#ef4444" : "#10b981"}
            accent
          />
        </div>

        <div className="p-5 bg-gray-900/50 border border-gray-800 rounded-2xl">
          <AreaChart data={result.yearlyData} labels={result.labels} color="#ec4899" title="Corpus Growth Until Retirement" height={220} />
        </div>

        <div className="p-5 bg-gray-900/50 border border-gray-800 rounded-2xl">
          <DonutChart
            segments={[
              { label: 'Corpus at Retirement', value: result.corpusAtRetirement, color: '#3b82f6' },
              { label: 'Additional Needed', value: Math.max(result.shortfall, 0), color: '#ef4444' },
            ]}
            centerLabel="Retirement"
          />
        </div>
      </div>
    </CalculatorLayout>
  );
}
