import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { DatePresetSelect } from '@/components/DatePresetSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { salesOrderService, type SalesOrderListRow } from '@/api/services';
import { Plus, Search } from 'lucide-react';
import type { DatePresetKey } from '@/types/api';
import { getDateRange, type DateRange } from '@/utils/dateRange';
import { EdTypeFind } from '@/types/models';
import { MatOpsApiError } from '@/lib/apiClient';
import { toast } from 'sonner';
import { salesOrderStatusToBadge } from '@/utils/transactionStatus';

type DateFilter = DatePresetKey | 'all';

function shortId(uuid: string): string {
  if (!uuid) return '—';
  return `${uuid.slice(0, 8)}…`;
}

function orderDateMs(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

export default function SalesOrdersPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<SalesOrderListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<DateFilter>('this_month');
  const [dateRange, setDateRange] = useState<DateRange | null>(() => getDateRange('this_month'));
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await salesOrderService.list({
        keyword: search.trim() || undefined,
        typeFind: EdTypeFind.LIST,
        isPaging: 0,
        pageIndex: 1,
        pageSize: 200,
      });
      let items = res.items;
      if (dateRange) {
        const from = orderDateMs(dateRange.fromDate);
        const to = orderDateMs(dateRange.toDate);
        items = items.filter((r) => {
          const od = orderDateMs(r.orderDate);
          return od >= from && od <= to;
        });
      }
      setRows(items);
    } catch (e) {
      setRows([]);
      if (e instanceof MatOpsApiError) {
        toast.error(e.errorMessage || t('errors.system'));
      } else {
        toast.error(t('errors.system'));
      }
    } finally {
      setLoading(false);
    }
  }, [search, dateRange, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = rows.filter(
    (d) =>
      !search.trim() ||
      d.code.toLowerCase().includes(search.toLowerCase()) ||
      (d.remark?.toLowerCase().includes(search.toLowerCase()) ?? false),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('orders.salesOrder.title')}</h1>
        <Button>
          <Plus className="h-4 w-4 mr-1" />
          {t('common.create')}
        </Button>
      </div>
      <Card className="industrial-shadow">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <DatePresetSelect
              value={preset}
              onChange={(p, range) => {
                setPreset(p);
                setDateRange(range);
              }}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('orders.salesOrder.code')}</TableHead>
                <TableHead>{t('orders.salesOrder.customer')}</TableHead>
                <TableHead>{t('orders.salesOrder.orderDate')}</TableHead>
                <TableHead>{t('orders.salesOrder.deliveryDate')}</TableHead>
                <TableHead className="text-right">{t('orders.salesOrder.currency')}</TableHead>
                <TableHead>{t('orders.salesOrder.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t('common.loading')}
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t('common.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.uuid} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono text-sm font-medium">{row.code}</TableCell>
                    <TableCell
                      className="font-mono text-xs text-muted-foreground"
                      title={row.mdBusinessPartnerUuid}
                    >
                      {shortId(row.mdBusinessPartnerUuid)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {row.orderDate ? String(row.orderDate).slice(0, 10) : '—'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {row.expectedDeliveryDate ? String(row.expectedDeliveryDate).slice(0, 10) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{row.currencyCode || '—'}</TableCell>
                    <TableCell>
                      <StatusBadge status={salesOrderStatusToBadge(row.status)} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
