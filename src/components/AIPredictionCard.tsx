import { Brain, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';

interface AIPrediction {
  symbol: string;
  period: string;
  trendDirection: 'bullish' | 'bearish' | 'neutral';
  trendProbability: number;
  predictedLow: number;
  predictedHigh: number;
  predictedLowPct: string;
  predictedHighPct: string;
  confidence: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
  summary: string;
}

interface AIPredictionCardProps {
  prediction: AIPrediction | null;
}

export default function AIPredictionCard({ prediction }: AIPredictionCardProps) {
  if (!prediction) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
        <p className="text-sm text-gray-400">AI prediction unavailable</p>
      </div>
    );
  }

  const { trendDirection, trendProbability, predictedLow, predictedHigh, predictedLowPct, predictedHighPct, confidence, sentiment, sentimentScore, summary } = prediction;

  const trendColor = trendDirection === 'bullish' ? 'text-green-500' : trendDirection === 'bearish' ? 'text-red-500' : 'text-yellow-500';
  const trendBg = trendDirection === 'bullish' ? 'bg-green-500/10 border-green-500/20' : trendDirection === 'bearish' ? 'bg-red-500/10 border-red-500/20' : 'bg-yellow-500/10 border-yellow-500/20';
  const TrendIcon = trendDirection === 'bullish' ? TrendingUp : trendDirection === 'bearish' ? TrendingDown : Minus;

  const sentimentColor = sentiment === 'positive' ? '#22c55e' : sentiment === 'negative' ? '#ef4444' : '#eab308';

  const lowNum = predictedLow;
  const highNum = predictedHigh;
  const currentPrice = (lowNum + highNum) / 2 / (1 + (parseFloat(trendDirection === 'bullish' ? '0.04' : trendDirection === 'bearish' ? '-0.04' : '0')));

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
          <Brain size={18} className="text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">AI Prediction</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{prediction.period} outlook</p>
        </div>
        <div className={`ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold uppercase ${trendBg} ${trendColor}`}>
          <TrendIcon size={12} />
          {trendDirection}
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Trend Probability</div>
            <div className={`text-xl font-bold ${trendColor}`}>{trendProbability}%</div>
            <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${trendDirection === 'bullish' ? 'bg-green-500' : trendDirection === 'bearish' ? 'bg-red-500' : 'bg-yellow-500'}`} style={{ width: `${trendProbability}%` }} />
            </div>
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">AI Confidence</div>
            <div className="text-xl font-bold text-blue-500">{confidence}%</div>
            <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${confidence}%` }} />
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">30-Day Price Range Forecast</div>
          <div className="relative h-10 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="absolute top-0 bottom-0 bg-blue-500/0 bg-white/20 border-2 border-blue-500/40 rounded-full" style={{
              left: `${Math.max(5, ((lowNum - currentPrice * 0.85) / (currentPrice * 0.3)) * 100)}%`,
              right: `${Math.max(5, 100 - ((highNum - currentPrice * 0.85) / (currentPrice * 0.3)) * 100)}%`,
            }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-6 bg-gray-600 dark:bg-gray-400 rounded-full" style={{
              left: `calc(${Math.max(10, Math.min(90, ((currentPrice - currentPrice * 0.85) / (currentPrice * 0.3)) * 100))}% - 6px)`,
            }} />
          </div>
          <div className="flex justify-between mt-2 text-xs">
            <div>
              <span className="text-red-500 font-semibold">${lowNum.toFixed(2)}</span>
              <span className="text-gray-400 ml-1">({predictedLowPct}%)</span>
            </div>
            <div className="text-gray-500 text-xs">Current</div>
            <div>
              <span className="text-green-500 font-semibold">${highNum.toFixed(2)}</span>
              <span className="text-gray-400 ml-1">(+{predictedHighPct}%)</span>
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">News Sentiment</div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${sentimentScore * 100}%`, backgroundColor: sentimentColor }} />
            </div>
            <span className="text-xs font-semibold capitalize" style={{ color: sentimentColor }}>{sentiment}</span>
          </div>
        </div>

        <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
          <AlertCircle size={15} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{summary}</p>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500">
          AI predictions are for informational purposes only and do not constitute financial advice. Past performance does not guarantee future results.
        </p>
      </div>
    </div>
  );
}
