import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { productOrderService, type ProductOrderListRow } from '@/api/services';
import { Plus, Search } from 'lucide-react';
import { EdTypeFind } from '@/types/models';
import { MatOpsApiError } from '@/lib/apiClient';
import { toast } from 'sonner';
import { productOrderStatusToBadge } from '@/utils/transactionStatus';

function shortId(uuid: string | null | undefined): string {
  if (!uuid) return '—';
  return `${uuid.slice(0, 8)}…`;
}

export default function ProductOrdersPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<ProductOrderListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productOrderService.list({
        keyword: search.trim() || undefined,
        typeFind: EdTypeFind.LIST,
        isPaging: 0,
        pageIndex: 1,
        pageSize: 200,
      });
      setRows(res.items);
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
  }, [search, t]);

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
        <h1 className="text-2xl font-bold">{t('orders.productOrder.title')}</h1>
        <Button>
          <Plus className="h-4 w-4 mr-1" />
          {t('common.create')}
        </Button>
      </div>
      <Card className="industrial-shadow">
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('orders.productOrder.code')}</TableHead>
                <TableHead>{t('orders.productOrder.soRef')}</TableHead>
                <TableHead>{t('orders.productOrder.orderDate')}</TableHead>
                <TableHead className="text-right">{t('orders.productOrder.priority')}</TableHead>
                <TableHead>{t('orders.productOrder.remark')}</TableHead>
                <TableHead>{t('orders.productOrder.status')}</TableHead>
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
                      title={row.trxSalesOrderUuid ?? ''}
                    >
                      {shortId(row.trxSalesOrderUuid)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {row.orderDate ? String(row.orderDate).slice(0, 10) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{row.priority}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={row.remark ?? ''}>
                      {row.remark || '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={productOrderStatusToBadge(row.status)} />
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
