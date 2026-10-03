import { useState } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Percent, Landmark, Repeat,
  Coffee, Target, Flame, CreditCard, Home, PiggyBank, LineChart,
  ChevronLeft, Calculator as CalcIcon
} from 'lucide-react';

import SIPCalculator from '../components/calculators/SIPCalculator';
import SWPCalculator from '../components/calculators/SWPCalculator';
import LumpSumCalculator from '../components/calculators/LumpSumCalculator';
import CompoundInterestCalculator from '../components/calculators/CompoundInterestCalculator';
import FDCalculator from '../components/calculators/FDCalculator';
import RDCalculator from '../components/calculators/RDCalculator';
import RetirementCalculator from '../components/calculators/RetirementCalculator';
import GoalBasedCalculator from '../components/calculators/GoalBasedCalculator';
import InflationCalculator from '../components/calculators/InflationCalculator';
import LoanEMICalculator from '../components/calculators/LoanEMICalculator';
import MortgageCalculator from '../components/calculators/MortgageCalculator';
import SavingsCalculator from '../components/calculators/SavingsCalculator';
import PortfolioGrowthCalculator from '../components/calculators/PortfolioGrowthCalculator';

interface CalcDef {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  component: React.ComponentType;
}

const CALCULATORS: CalcDef[] = [
  { id: 'sip', name: 'SIP Calculator', description: 'Systematic Investment Plan returns', icon: <TrendingUp size={18} />, color: '#3b82f6', component: SIPCalculator },
  { id: 'swp', name: 'SWP Calculator', description: 'Systematic Withdrawal Plan', icon: <TrendingDown size={18} />, color: '#f59e0b', component: SWPCalculator },
  { id: 'lumpsum', name: 'Lump Sum Calculator', description: 'One-time investment returns', icon: <DollarSign size={18} />, color: '#8b5cf6', component: LumpSumCalculator },
  { id: 'compound', name: 'Compound Interest', description: 'Compound interest growth', icon: <Percent size={18} />, color: '#06b6d4', component: CompoundInterestCalculator },
  { id: 'fd', name: 'FD Calculator', description: 'Fixed Deposit maturity', icon: <Landmark size={18} />, color: '#10b981', component: FDCalculator },
  { id: 'rd', name: 'RD Calculator', description: 'Recurring Deposit maturity', icon: <Repeat size={18} />, color: '#f97316', component: RDCalculator },
  { id: 'retirement', name: 'Retirement Calculator', description: 'Plan your retirement corpus', icon: <Coffee size={18} />, color: '#ec4899', component: RetirementCalculator },
  { id: 'goal', name: 'Goal-Based Investment', description: 'Reach your financial goals', icon: <Target size={18} />, color: '#14b8a6', component: GoalBasedCalculator },
  { id: 'inflation', name: 'Inflation Calculator', description: 'Impact of inflation on savings', icon: <Flame size={18} />, color: '#ef4444', component: InflationCalculator },
  { id: 'emi', name: 'Loan EMI Calculator', description: 'Calculate loan installments', icon: <CreditCard size={18} />, color: '#6366f1', component: LoanEMICalculator },
  { id: 'mortgage', name: 'Mortgage Calculator', description: 'Home loan with tax & insurance', icon: <Home size={18} />, color: '#0ea5e9', component: MortgageCalculator },
  { id: 'savings', name: 'Savings Calculator', description: 'Growth with regular savings', icon: <PiggyBank size={18} />, color: '#22c55e', component: SavingsCalculator },
  { id: 'portfolio', name: 'Portfolio Growth', description: 'Multi-scenario projections', icon: <LineChart size={18} />, color: '#a855f7', component: PortfolioGrowthCalculator },
];

interface CalculatorsProps {
  initialCalc?: string;
}

export default function Calculators({ initialCalc }: CalculatorsProps) {
  const [activeCalc, setActiveCalc] = useState<string | null>(initialCalc ?? null);

  const active = CALCULATORS.find(c => c.id === activeCalc);
  const ActiveComponent = active?.component;

  if (active && ActiveComponent) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] pt-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => setActiveCalc(null)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-6 no-print"
          >
            <ChevronLeft size={16} /> All Calculators
          </button>
          <ActiveComponent />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <CalcIcon size={20} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Financial Calculators</h1>
              <p className="text-gray-500 text-sm">Plan your investments, loans, and financial goals</p>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {CALCULATORS.map(calc => (
            <button
              key={calc.id}
              onClick={() => setActiveCalc(calc.id)}
              className="group p-5 bg-gray-900/50 border border-gray-800 rounded-2xl hover:border-gray-700 hover:bg-gray-900 transition-all text-left"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-105"
                style={{ background: `${calc.color}15`, color: calc.color }}
              >
                {calc.icon}
              </div>
              <h3 className="font-semibold text-white text-sm mb-1 group-hover:text-blue-400 transition-colors">
                {calc.name}
              </h3>
              <p className="text-xs text-gray-500">{calc.description}</p>
            </button>
          ))}
        </div>

        {/* Info banner */}
        <div className="mt-8 p-5 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
          <div className="flex items-start gap-3">
            <CalcIcon size={18} className="text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-300 font-medium mb-1">All calculators include charts and downloadable results</p>
              <p className="text-xs text-gray-500">Each calculator provides detailed breakdowns, visual charts, and the ability to download or print your results. Calculations are for educational purposes only.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
