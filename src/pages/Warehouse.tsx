import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NumberDisplay } from '@/components/NumberDisplay';
import { Search, AlertTriangle, Plus } from 'lucide-react';
import { inventoryBalanceService, warehouseService } from '@/api/services';
import type { InventoryBalanceItem, WarehouseCatalog } from '@/types/models';

export default function WarehousePage() {
  const { t } = useTranslation();
  const [data, setData] = useState<InventoryBalanceItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseCatalog[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    warehouseService.list({ typeFind: 0, isPaging: 0 })
      .then(res => setWarehouses(res.items as unknown as WarehouseCatalog[]))
      .catch(() => {});
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await inventoryBalanceService.list({
        keyword: search || undefined,
        pageIndex: page,
        pageSize: 20,
        mdWarehouseUuid: selectedWarehouse !== 'all' ? selectedWarehouse : undefined,
      });
      setData(res.items);
      setTotalCount(res.pagination.totalCount);
      setTotalPages(res.pagination.totalPage);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [search, page, selectedWarehouse]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('warehouse.title')}</h1>
        <div className="flex gap-2">
          <Button variant="outline">{t('warehouse.inbound')}</Button>
          <Button variant="outline">{t('warehouse.outbound')}</Button>
        </div>
      </div>
      <Card className="industrial-shadow">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t('common.search')} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            {warehouses.length > 0 && (
              <Select value={selectedWarehouse} onValueChange={v => { setSelectedWarehouse(v); setPage(1); }}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder={t('warehouse.title')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {warehouses.map(w => (
                    <SelectItem key={w.uuid} value={w.uuid}>{w.code} — {w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item UUID</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">{t('warehouse.currentStock')}</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Avg Cost</TableHead>
                <TableHead>Last Txn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t('common.loading')}</TableCell></TableRow>
              ) : data.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t('common.noData')}</TableCell></TableRow>
              ) : data.map(row => (
                <TableRow key={row.uuid} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-mono text-xs">{row.mdItemUuid.slice(0, 8)}…</TableCell>
                  <TableCell className="font-mono text-xs">{row.mdWarehouseUuid.slice(0, 8)}…</TableCell>
                  <TableCell className="text-right font-mono text-sm"><NumberDisplay value={row.onhandQty} /></TableCell>
                  <TableCell className="text-right font-mono text-sm"><NumberDisplay value={row.reservedQty} /></TableCell>
                  <TableCell className="text-right font-mono text-sm"><NumberDisplay value={row.availableQty} /></TableCell>
                  <TableCell className="text-right font-mono text-sm"><NumberDisplay value={row.avgCost} /></TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{row.lastTxnAt ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-sm text-muted-foreground">{totalCount} {t('common.items')}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('common.previous')}</Button>
                <span className="flex items-center px-3 text-sm">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>{t('common.next')}</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
