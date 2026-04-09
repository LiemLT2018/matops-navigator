import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberDisplay } from '@/components/NumberDisplay';
import { Search, Warehouse } from 'lucide-react';
import { inventoryBalanceService, warehouseService } from '@/api/services';
import { MatOpsApiError } from '@/lib/apiClient';
import { resolveMdCompanyUuidForApi } from '@/lib/authStorage';
import type { InventoryBalanceItem, WarehouseCatalog } from '@/types/models';
import { EdTypeFind, EdWarehouseType } from '@/types/models';
import { Label } from '@/components/ui/label';
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export default function FinishedGoodsPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<InventoryBalanceItem[]>([]);
  const [fgWarehouses, setFgWarehouses] = useState<WarehouseCatalog[]>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(true);
  const [warehouseUuid, setWarehouseUuid] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    const mdCompanyUuid = resolveMdCompanyUuidForApi();
    let cancelled = false;
    setWarehousesLoading(true);
    (async () => {
      try {
        const res = await warehouseService.list({
          isPaging: 0,
          pageSize: 200,
          typeFind: EdTypeFind.CATALOG,
          ...(mdCompanyUuid ? { mdCompanyUuid } : {}),
          types: [String(EdWarehouseType.FINISHED_GOOD) as `${EdWarehouseType}`],
        });
        if (!cancelled) setFgWarehouses((res.items ?? []) as WarehouseCatalog[]);
      } catch (e) {
        if (!cancelled) setFgWarehouses([]);
        if (e instanceof MatOpsApiError) toast.error(e.errorMessage || t('errors.system'));
      } finally {
        if (!cancelled) setWarehousesLoading(false);
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
          : { warehouseTypes: [String(EdWarehouseType.FINISHED_GOOD)] }),
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
        <h1 className="text-2xl font-bold">{t('finishedGoods.title')}</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" type="button" disabled>
            {t('finishedGoods.inbound')}
          </Button>
          <Button variant="outline" type="button" disabled>
            {t('finishedGoods.outbound')}
          </Button>
        </div>
      </div>
      <Card className="industrial-shadow">
        <CardHeader className="space-y-0 pb-4">
          <div className="rounded-lg border border-border/80 bg-muted/30 p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-6">
              <div className="flex min-w-0 flex-1 flex-col gap-2 lg:max-w-[min(100%,22rem)]">
                <Label
                  htmlFor="fg-warehouse-filter"
                  className="flex items-center gap-2 text-muted-foreground font-normal"
                >
                  <Warehouse className="h-4 w-4 shrink-0 text-foreground/70" aria-hidden />
                  {t('finishedGoods.filterByWarehouse')}
                </Label>
                <Select
                  value={warehouseUuid || '__all__'}
                  disabled={warehousesLoading}
                  onValueChange={(v) => {
                    setWarehouseUuid(v === '__all__' ? '' : v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger id="fg-warehouse-filter" className="w-full bg-background">
                    <SelectValue
                      placeholder={
                        warehousesLoading ? t('common.loading') : t('finishedGoods.allFgWarehouses')
                      }
                    />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-72 min-w-[var(--radix-select-trigger-width)]">
                    <SelectItem value="__all__">{t('finishedGoods.allFgWarehouses')}</SelectItem>
                    {fgWarehouses.map((w) => (
                      <SelectItem key={w.uuid} value={w.uuid}>
                        {w.code} · {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!warehousesLoading && fgWarehouses.length === 0 ? (
                  <p className="text-xs text-amber-700 dark:text-amber-500/90">{t('finishedGoods.emptyFg')}</p>
                ) : null}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Label htmlFor="fg-balance-search" className="text-muted-foreground font-normal">
                  {t('common.search')}
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="fg-balance-search"
                    placeholder={t('common.search')}
                    value={keyword}
                    onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                    className="pl-9 bg-background"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('finishedGoods.productCode')}</TableHead>
                <TableHead>{t('finishedGoods.productName')}</TableHead>
                <TableHead>{t('finishedGoods.warehouse')}</TableHead>
                <TableHead>{t('finishedGoods.bin')}</TableHead>
                <TableHead className="text-right">{t('finishedGoods.currentStock')}</TableHead>
                <TableHead>{t('finishedGoods.uom')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {t('common.loading')}
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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
