import { useState } from 'react';
import { useCandles, type CandleData } from '../hooks/useStockData';
import { formatDate, formatDateTime } from '../lib/finnhub';

interface StockChartProps {
  symbol: string;
  currentPrice: number;
  predictionLow?: number;
  predictionHigh?: number;
}

const TIMEFRAMES = [
  { label: '1D', days: 1 },
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '1Y', days: 365 },
  { label: 'ALL', days: 730 },
];

export default function StockChart({ symbol, currentPrice, predictionLow, predictionHigh }: StockChartProps) {
  const [tf, setTf] = useState(TIMEFRAMES[2]);
  const [chartType, setChartType] = useState<'line' | 'candle'>('line');
  const { candles, loading } = useCandles(symbol, tf.days);

  if (loading || !candles || candles.c.length === 0) {
    return (
      <div className="rounded-xl bg-gray-800/30 flex items-center justify-center h-[250px] sm:h-[280px]">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Guard against NaN/invalid candle data
  if (candles.l.some(isNaN) || candles.h.some(isNaN) || candles.c.some(isNaN)) {
    return (
      <div className="rounded-xl bg-gray-800/30 flex items-center justify-center h-[250px] sm:h-[280px] text-gray-500 text-sm">
        Invalid chart data
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ChartSVG
        candles={candles}
        currentPrice={currentPrice}
        predictionLow={predictionLow}
        predictionHigh={predictionHigh}
        chartType={chartType}
        setChartType={setChartType}
        tf={tf}
        setTf={setTf}
      />
    </div>
  );
}

function ChartSVG({
  candles,
  currentPrice,
  predictionLow,
  predictionHigh,
  chartType,
  setChartType,
  tf,
  setTf,
}: {
  candles: CandleData;
  currentPrice: number;
  predictionLow?: number;
  predictionHigh?: number;
  chartType: 'line' | 'candle';
  setChartType: (t: 'line' | 'candle') => void;
  tf: typeof TIMEFRAMES[number];
  setTf: (t: typeof TIMEFRAMES[number]) => void;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const closes = candles.c;
  const highs = candles.h;
  const lows = candles.l;

  void currentPrice; // passed to parent, used in hover context
  const minPrice = Math.min(...lows) * 0.995;
  const maxPrice = Math.max(...highs) * 1.005;
  const priceRange = maxPrice - minPrice;

  const W = 800;
  const H = 280;
  const PAD = { top: 16, right: 16, bottom: 32, left: 52 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const count = closes.length;
  const toX = (i: number) => PAD.left + (i / Math.max(1, count - 1)) * chartW;
  const toY = (price: number) => PAD.top + ((maxPrice - price) / priceRange) * chartH;

  const linePath = closes.map((c, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(c)}`).join(' ');
  const areaPath = linePath + ` L${toX(count - 1)},${H - PAD.bottom} L${toX(0)},${H - PAD.bottom} Z`;

  const isUp = closes[closes.length - 1] >= closes[0];
  const lineColor = isUp ? '#22c55e' : '#ef4444';

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => minPrice + f * priceRange);
  const xStep = Math.max(1, Math.floor(count / 5));
  const xTicks: { index: number; label: string }[] = [];
  for (let i = 0; i < count; i += xStep) {
    xTicks.push({ index: i, label: formatDate(candles.t[i]) });
  }
  if (xTicks.length === 0 || xTicks[xTicks.length - 1].index !== count - 1) {
    xTicks.push({ index: count - 1, label: formatDate(candles.t[count - 1]) });
  }
  // Limit to 6 ticks
  if (xTicks.length > 6) {
    const step = Math.ceil(xTicks.length / 6);
    const filtered: { index: number; label: string }[] = [];
    for (let i = 0; i < xTicks.length; i += step) {
      filtered.push(xTicks[i]);
    }
    // Ensure last tick is included
    if (filtered[filtered.length - 1].index !== count - 1) {
      filtered.push(xTicks[xTicks.length - 1]);
    }
    xTicks.splice(0, xTicks.length, ...filtered);
  }

  const hovered = hoveredIndex !== null ? {
    date: formatDate(candles.t[hoveredIndex]),
    time: formatDateTime(candles.t[hoveredIndex]),
    open: candles.o[hoveredIndex],
    high: candles.h[hoveredIndex],
    low: candles.l[hoveredIndex],
    close: candles.c[hoveredIndex],
    volume: candles.v[hoveredIndex],
  } : null;

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {TIMEFRAMES.map(t => (
            <button
              key={t.label}
              onClick={() => setTf(t)}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                tf.label === t.label
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-gray-800 p-0.5 rounded-lg">
          <button
            onClick={() => setChartType('line')}
            className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
              chartType === 'line' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Line
          </button>
          <button
            onClick={() => setChartType('candle')}
            className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
              chartType === 'candle' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Candle
          </button>
        </div>
      </div>

      <div className="relative rounded-xl bg-gray-800/30 overflow-hidden">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: 'auto', minHeight: 200, maxHeight: 280 }}
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * W;
            const idx = Math.round(((x - PAD.left) / chartW) * (count - 1));
            setHoveredIndex(Math.max(0, Math.min(count - 1, idx)));
          }}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.2" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>

          {yTicks.map((v, i) => (
            <g key={i}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={toY(v)}
                y2={toY(v)}
                stroke="currentColor"
                strokeOpacity="0.05"
                strokeWidth="1"
                className="text-gray-500"
              />
              <text
                x={PAD.left - 8}
                y={toY(v) + 4}
                textAnchor="end"
                fontSize="10"
                fill="currentColor"
                opacity="0.4"
                className="text-gray-400"
              >
                ${v.toFixed(0)}
              </text>
            </g>
          ))}

          {xTicks.map((t, i) => (
            <text
              key={i}
              x={toX(t.index)}
              y={H - PAD.bottom + 16}
              textAnchor="middle"
              fontSize="9"
              fill="currentColor"
              opacity="0.4"
              className="text-gray-400"
            >
              {t.label}
            </text>
          ))}

          {chartType === 'line' ? (
            <>
              <path d={areaPath} fill="url(#areaGrad)" />
              <path
                d={linePath}
                fill="none"
                stroke={lineColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          ) : (
            candles.c.map((_, i) => {
              const x = toX(i);
              const open = candles.o[i];
              const close = candles.c[i];
              const high = candles.h[i];
              const low = candles.l[i];
              const candleUp = close >= open;
              const col = candleUp ? '#22c55e' : '#ef4444';
              const cw = Math.max(2, chartW / count * 0.7);
              return (
                <g key={i}>
                  <line x1={x} x2={x} y1={toY(high)} y2={toY(low)} stroke={col} strokeWidth="1" />
                  <rect
                    x={x - cw / 2}
                    y={toY(Math.max(open, close))}
                    width={cw}
                    height={Math.max(1, Math.abs(toY(open) - toY(close)))}
                    fill={col}
                    rx="1"
                  />
                </g>
              );
            })
          )}

          {predictionLow && predictionHigh && (
            <rect
              x={toX(count - 1)}
              y={toY(predictionHigh)}
              width={chartW * 0.12}
              height={toY(predictionLow) - toY(predictionHigh)}
              fill="#3b82f6"
              fillOpacity="0.15"
              rx="4"
            />
          )}

          {hovered && hoveredIndex !== null && (
            <>
              <line
                x1={toX(hoveredIndex)}
                x2={toX(hoveredIndex)}
                y1={PAD.top}
                y2={H - PAD.bottom}
                stroke="currentColor"
                strokeOpacity="0.2"
                strokeWidth="1"
                strokeDasharray="4 3"
                className="text-gray-400"
              />
              <circle
                cx={toX(hoveredIndex)}
                cy={toY(closes[hoveredIndex])}
                r="4"
                fill={lineColor}
                stroke="#0a0a0f"
                strokeWidth="2"
              />
            </>
          )}
        </svg>

        {hovered && (
          <div className="absolute top-3 left-14 bg-gray-900/95 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl pointer-events-none backdrop-blur-sm">
            <div className="font-semibold text-white mb-1">{hovered.date}</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-gray-400">
              <span>O: <span className="text-white">${hovered.open.toFixed(2)}</span></span>
              <span>H: <span className="text-green-400">${hovered.high.toFixed(2)}</span></span>
              <span>C: <span className="text-white">${hovered.close.toFixed(2)}</span></span>
              <span>L: <span className="text-red-400">${hovered.low.toFixed(2)}</span></span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
