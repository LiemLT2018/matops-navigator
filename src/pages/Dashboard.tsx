import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { NumberDisplay } from '@/components/NumberDisplay';
import { getDashboardKPI, getDashboardWarnings, getPlanVsActual } from '@/api/mockApi';
import type { DashboardKPI, Warning, PlanVsActual } from '@/api/mockApi';
import { ShoppingCart, Layers, ShoppingBag, Factory, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
  const { t } = useTranslation();
  const [kpi, setKpi] = useState<DashboardKPI | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [chartData, setChartData] = useState<PlanVsActual[]>([]);

  useEffect(() => {
    getDashboardKPI().then(r => setKpi(r.data));
    getDashboardWarnings().then(r => setWarnings(r.data));
    getPlanVsActual().then(r => setChartData(r.data));
  }, []);

  const kpiCards = kpi ? [
    { label: t('dashboard.kpi.totalSO'), value: kpi.totalSO, pending: kpi.pendingSO, active: kpi.activeSO, done: kpi.completedSO, icon: ShoppingCart, color: 'text-info' },
    { label: t('dashboard.kpi.totalBOM'), value: kpi.totalBOM, pending: kpi.pendingBOM, active: kpi.activeBOM, done: kpi.completedBOM, icon: Layers, color: 'text-accent' },
    { label: t('dashboard.kpi.totalPO'), value: kpi.totalPO, pending: kpi.pendingPO, active: kpi.activePO, done: kpi.completedPO, icon: ShoppingBag, color: 'text-success' },
    { label: t('dashboard.kpi.totalProd'), value: kpi.totalProd, pending: kpi.pendingProd, active: kpi.activeProd, done: kpi.completedProd, icon: Factory, color: 'text-warning' },
  ] : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <Card key={card.label} className="industrial-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono"><NumberDisplay value={card.value} /></div>
              <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                <span>{t('common.pending')}: {card.pending}</span>
                <span>{t('common.inProgress')}: {card.active}</span>
                <span>{t('common.completed')}: {card.done}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <Card className="lg:col-span-2 industrial-shadow">
          <CardHeader>
            <CardTitle className="text-base">{t('dashboard.planVsActual')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Bar dataKey="plan" fill="hsl(205, 70%, 55%)" name="Kế hoạch" radius={[2, 2, 0, 0]} />
                <Bar dataKey="actual" fill="hsl(28, 85%, 52%)" name="Thực tế" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Warnings */}
        <Card className="industrial-shadow">
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <CardTitle className="text-base">{t('dashboard.warnings')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[340px] overflow-auto">
            {warnings.map((w) => (
              <div key={w.id} className="flex items-start gap-3 p-3 rounded-md bg-muted/50 border border-border">
                <StatusBadge status={w.severity} className="mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm leading-tight">{w.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{w.ref} • {w.date}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
