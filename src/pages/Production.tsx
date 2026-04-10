import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { productionOrderService, type ProductionOrderListRow } from '@/api/services';
import { Plus, Search } from 'lucide-react';
import { EdTypeFind } from '@/types/models';
import { MatOpsApiError } from '@/lib/apiClient';
import { toast } from 'sonner';
import { productionOrderStatusToBadge } from '@/utils/transactionStatus';

function shortId(uuid: string): string {
  if (!uuid) return '—';
  return `${uuid.slice(0, 8)}…`;
}

export default function ProductionPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<ProductionOrderListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productionOrderService.list({
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
        <h1 className="text-2xl font-bold">{t('production.title')}</h1>
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
                <TableHead>{t('production.orderCode')}</TableHead>
                <TableHead>{t('production.productOrderRef')}</TableHead>
                <TableHead>{t('production.productionDate')}</TableHead>
                <TableHead>{t('production.remark')}</TableHead>
                <TableHead>{t('production.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {t('common.loading')}
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {t('common.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.uuid} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono text-sm font-medium">{row.code}</TableCell>
                    <TableCell
                      className="font-mono text-xs text-muted-foreground"
                      title={row.trxProductOrderUuid}
                    >
                      {shortId(row.trxProductOrderUuid)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {row.productionDate ? String(row.productionDate).slice(0, 10) : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[220px] truncate" title={row.remark ?? ''}>
                      {row.remark || '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={productionOrderStatusToBadge(row.status)} />
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
