import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { NumberDisplay } from '@/components/NumberDisplay';
import { Search } from 'lucide-react';
import { inventoryBalanceService, warehouseService } from '@/api/services';
import { MatOpsApiError } from '@/lib/apiClient';
import { resolveMdCompanyUuidForApi } from '@/lib/authStorage';
import type { InventoryBalanceItem, WarehouseCatalog } from '@/types/models';
import { EdTypeFind } from '@/types/models';
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import { toast } from 'sonner';

export default function WarehousePage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<InventoryBalanceItem[]>([]);
  const [rmWarehouses, setRmWarehouses] = useState<WarehouseCatalog[]>([]);
  const [warehouseUuid, setWarehouseUuid] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    const mdCompanyUuid = resolveMdCompanyUuidForApi();
    let cancelled = false;
    (async () => {
      try {
        const res = await warehouseService.list({
          isPaging: 0,
          pageSize: 200,
          typeFind: EdTypeFind.CATALOG,
          ...(mdCompanyUuid ? { mdCompanyUuid } : {}),
          types: ['RAW_MATERIAL'],
        });
        if (!cancelled) setRmWarehouses((res.items ?? []) as WarehouseCatalog[]);
      } catch (e) {
        if (!cancelled) setRmWarehouses([]);
        if (e instanceof MatOpsApiError) toast.error(e.errorMessage || t('errors.system'));
      }
    })();
    return () => { cancelled = true; };
  }, [t]);

  const loadBalances = useCallback(async (pg: number, kw: string, wh: string) => {
    const mdCompanyUuid = resolveMdCompanyUuidForApi();
    setLoading(true);
    try {
      const res = await inventoryBalanceService.list({
        keyword: kw.trim() || undefined,
        isPaging: 1,
        pageIndex: pg,
        pageSize,
        typeFind: EdTypeFind.LIST,
        ...(mdCompanyUuid ? { mdCompanyUuid } : {}),
        ...(wh
          ? { mdWarehouseUuid: wh }
          : { warehouseTypes: ['RAW_MATERIAL'] }),
      });
      setRows(res.items ?? []);
      setTotalPage(res.pagination?.totalPage ?? 1);
    } catch (e) {
      setRows([]);
      if (e instanceof MatOpsApiError) {
        toast.error(e.errorMessage || t('errors.system'));
      } else {
        toast.error(t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  }, [pageSize, t]);

  useEffect(() => {
    void loadBalances(page, keyword, warehouseUuid);
  }, [page, keyword, warehouseUuid, loadBalances]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{t('warehouse.title')}</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" type="button" disabled>{t('warehouse.inbound')}</Button>
          <Button variant="outline" type="button" disabled>{t('warehouse.outbound')}</Button>
        </div>
      </div>
      <Card className="industrial-shadow">
        <CardHeader className="space-y-3 pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="grid gap-2 min-w-[220px] max-w-md">
              <span className="text-sm text-muted-foreground">{t('warehouse.warehouseFilter')}</span>
              <Select
                value={warehouseUuid || '__all__'}
                onValueChange={(v) => {
                  setWarehouseUuid(v === '__all__' ? '' : v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('warehouse.allRmWarehouses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t('warehouse.allRmWarehouses')}</SelectItem>
                  {rmWarehouses.map((w) => (
                    <SelectItem key={w.uuid} value={w.uuid}>
                      {w.code} — {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={keyword}
                onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!loading && rmWarehouses.length === 0 && (
            <p className="px-6 py-4 text-sm text-muted-foreground">{t('warehouse.emptyRm')}</p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('warehouse.materialCode')}</TableHead>
                <TableHead>{t('warehouse.materialName')}</TableHead>
                <TableHead>{t('warehouse.warehouseCol')}</TableHead>
                <TableHead>{t('warehouse.bin')}</TableHead>
                <TableHead className="text-right">{t('warehouse.onHand')}</TableHead>
                <TableHead className="text-right">{t('warehouse.reserved')}</TableHead>
                <TableHead className="text-right">{t('warehouse.available')}</TableHead>
                <TableHead>{t('warehouse.unit')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {t('common.loading')}
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {t('common.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.uuid} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono text-sm font-medium">{row.itemCode || '—'}</TableCell>
                    <TableCell>{row.itemName || '—'}</TableCell>
                    <TableCell className="text-sm">
                      <span className="font-mono">{row.warehouseCode || '—'}</span>
                      {row.warehouseName ? (
                        <span className="text-muted-foreground"> · {row.warehouseName}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {row.warehouseBinCode ?? '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      <NumberDisplay value={Number(row.onhandQty ?? 0)} />
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      <NumberDisplay value={Number(row.reservedQty ?? 0)} />
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      <NumberDisplay value={Number(row.availableQty ?? 0)} />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{row.uomCode || '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {totalPage > 1 && (
            <div className="flex justify-center py-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => page > 1 && setPage(page - 1)}
                      className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(totalPage, 5) }, (_, i) => {
                    const p = Math.max(1, Math.min(page - 2, totalPage - 4)) + i;
                    return p <= totalPage ? (
                      <PaginationItem key={p}>
                        <PaginationLink
                          isActive={p === page}
                          onClick={() => setPage(p)}
                          className="cursor-pointer"
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    ) : null;
                  })}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => page < totalPage && setPage(page + 1)}
                      className={page >= totalPage ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
