import type { SaleRecord } from '@/types';
import { formatMoney } from '@/lib/currency';

export function RevenueChart({ sales, currency }: { sales: SaleRecord[]; currency: string }) {
  const days: { label: string; date: string; revenue: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    const revenue = sales.filter((s) => s.date === iso).reduce((sum, s) => sum + s.totalRevenue, 0);
    days.push({ label: d.toLocaleDateString('en-GB', { weekday: 'short' }), date: iso, revenue });
  }

  const max = Math.max(...days.map((d) => d.revenue), 1);
  const width = 560;
  const height = 180;
  const barGap = 16;
  const barWidth = (width - barGap * (days.length - 1)) / days.length;

  return (
    <svg viewBox={`0 0 ${width} ${height + 32}`} className="w-full h-auto" role="img" aria-label="Revenue for the last 7 days">
      {days.map((d, i) => {
        const barHeight = Math.max((d.revenue / max) * height, d.revenue > 0 ? 4 : 0);
        const x = i * (barWidth + barGap);
        const y = height - barHeight;
        return (
          <g key={d.date}>
            <title>
              {d.label}: {formatMoney(d.revenue, currency)}
            </title>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={4}
              fill={d.revenue > 0 ? 'url(#barGradient)' : '#262626'}
            />
            <text x={x + barWidth / 2} y={height + 20} textAnchor="middle" fontSize="11" fill="#a3a3a3">
              {d.label}
            </text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
    </svg>
  );
}
