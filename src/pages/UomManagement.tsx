import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { uomService } from '@/api/services';
import { EdTypeFind, type UomCatalog, type UomCreateBody, type UomDetailWithUsage } from '@/types/models';
import { toast } from 'sonner';

const UOM_SCOPES = [
  { value: 0, labelKey: 'uom.scopes.common' },
  { value: 1, labelKey: 'uom.scopes.material' },
  { value: 2, labelKey: 'uom.scopes.product' },
] as const;

const INITIAL_FORM: UomCreateBody = { code: '', name: '', type: 0, decimalPlaces: 0, status: 1 };

/** Bộ lọc phạm vi: NVL → dùng chung + NVL; SP → dùng chung + SP; chỉ dùng chung → [0]. */
function typesFilterForScope(scope: string): number[] | undefined {
  if (scope === 'all') return undefined;
  if (scope === '0') return [0];
  if (scope === '1') return [0, 1];
  if (scope === '2') return [0, 2];
  return undefined;
}

export default function UomManagementPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<UomCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterScope, setFilterScope] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUuid, setEditingUuid] = useState<string | null>(null);
  const [form, setForm] = useState<UomCreateBody>({ ...INITIAL_FORM });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailUuid, setDetailUuid] = useState<string | null>(null);
  const [detail, setDetail] = useState<UomDetailWithUsage | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const scopeTypes = typesFilterForScope(filterScope);
      const res = await uomService.list({
        keyword: search || undefined,
        pageIndex: page,
        pageSize: 20,
        typeFind: EdTypeFind.LIST,
        ...(filterStatus !== 'all' ? { status: Number(filterStatus) } : {}),
        ...(scopeTypes != null ? { types: scopeTypes } : {}),
      });
      setData(res.items);
      setTotalCount(res.pagination.totalCount);
      setTotalPages(res.pagination.totalPage);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [search, page, filterStatus, filterScope]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openDetail = (uuid: string) => {
    setDetailUuid(uuid);
    setDetail(null);
    setDetailOpen(true);
  };

  useEffect(() => {
    if (!detailOpen || !detailUuid) return;
    let cancelled = false;
    setDetailLoading(true);
    void uomService
      .get(detailUuid)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detailOpen, detailUuid]);

  const handleCreate = () => {
    setEditingUuid(null);
    setForm({ ...INITIAL_FORM });
    setDialogOpen(true);
  };

  const handleEdit = (item: UomCatalog) => {
    setEditingUuid(item.uuid);
    setForm({
      code: item.code,
      name: item.name,
      type: item.type ?? 0,
      decimalPlaces: item.decimalPlaces ?? 0,
      status: item.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error(t('common.required'));
      return;
    }
    try {
      if (editingUuid) {
        await uomService.update(editingUuid, form);
        toast.success(`${t('common.edit')} ${t('common.success')}`);
      } else {
        await uomService.create(form);
        toast.success(`${t('common.create')} ${t('common.success')}`);
      }
      setDialogOpen(false);
      void loadData();
    } catch {
      /* interceptor */
    }
  };

  const handleDelete = async (uuid: string) => {
    try {
      await uomService.delete(uuid);
      toast.success(`${t('common.delete')} ${t('common.success')}`);
      void loadData();
      if (detailUuid === uuid) setDetailOpen(false);
    } catch {
      /* interceptor */
    }
  };

  const scopeLabel = (type?: number) => {
    const found = UOM_SCOPES.find((u) => u.value === type);
    return found ? t(found.labelKey) : '—';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t('uom.pageTitle')}</h1>
        <Button size="sm" onClick={handleCreate}>
          <Plus className="mr-1 h-4 w-4" />
          {t('common.create')}
        </Button>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2 min-w-[200px] flex-1">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                placeholder={t('common.search')}
                className="h-8"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="w-[140px]">
              <Label className="text-xs text-muted-foreground">{t('common.status')}</Label>
              <Select
                value={filterStatus}
                onValueChange={(v) => {
                  setFilterStatus(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  <SelectItem value="1">{t('uom.statusActive')}</SelectItem>
                  <SelectItem value="0">{t('uom.statusInactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[200px]">
              <Label className="text-xs text-muted-foreground">{t('uom.type')}</Label>
              <Select
                value={filterScope}
                onValueChange={(v) => {
                  setFilterScope(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {UOM_SCOPES.map((s) => (
                    <SelectItem key={s.value} value={String(s.value)}>
                      {t(s.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('uom.code')}</TableHead>
                <TableHead>{t('uom.name')}</TableHead>
                <TableHead>{t('uom.type')}</TableHead>
                <TableHead>{t('uom.decimalPlaces')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="w-[120px]">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t('common.loading')}
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t('common.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.uuid} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-xs">{item.code}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{scopeLabel(item.type)}</TableCell>
                    <TableCell>{item.decimalPlaces ?? 0}</TableCell>
                    <TableCell>
                      <StatusBadge status={item.status === 1 ? 'active' : 'inactive'} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title={t('uom.viewDetail')}
                          onClick={() => openDetail(item.uuid)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(item)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDelete(item.uuid)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-sm text-muted-foreground">
                {totalCount} {t('common.items')}
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  {t('common.previous')}
                </Button>
                <span className="flex items-center px-3 text-sm">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t('common.next')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('uom.detailTitle')}</SheetTitle>
            <SheetDescription>{detail?.code ? `${detail.code} — ${detail.name}` : ''}</SheetDescription>
          </SheetHeader>
          {detailLoading && (
            <p className="text-sm text-muted-foreground py-6">{t('common.loading')}</p>
          )}
          {!detailLoading && detail && (
            <div className="space-y-6 mt-6">
              <div>
                <h3 className="text-sm font-semibold mb-2">{t('uom.general')}</h3>
                <dl className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{t('uom.code')}</dt>
                    <dd className="font-mono">{detail.code}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{t('uom.name')}</dt>
                    <dd>{detail.name}</dd>
                  </div>
                  {detail.symbol ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">{t('uom.symbol')}</dt>
                      <dd>{detail.symbol}</dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{t('uom.type')}</dt>
                    <dd>{scopeLabel(detail.type)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{t('uom.decimalPlaces')}</dt>
                    <dd>{detail.decimalPlaces}</dd>
                  </div>
                  {detail.description ? (
                    <div className="flex flex-col gap-1">
                      <dt className="text-muted-foreground">{t('uom.description')}</dt>
                      <dd className="text-xs">{detail.description}</dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{t('common.status')}</dt>
                    <dd>
                      <StatusBadge status={detail.status === 1 ? 'active' : 'inactive'} />
                    </dd>
                  </div>
                </dl>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">{t('uom.itemsUsing')}</h3>
                {detail.itemsUsingUom.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
                ) : (
                  <ul className="text-sm space-y-1 max-h-48 overflow-y-auto border rounded-md p-2">
                    {detail.itemsUsingUom.map((row) => (
                      <li key={row.uuid}>
                        <span className="font-mono text-xs mr-2">{row.code}</span>
                        {row.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">{t('uom.categoriesUsing')}</h3>
                {detail.itemCategoriesUsingUom.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
                ) : (
                  <ul className="text-sm space-y-1 max-h-40 overflow-y-auto border rounded-md p-2">
                    {detail.itemCategoriesUsingUom.map((row) => (
                      <li key={row.uuid}>
                        <span className="font-mono text-xs mr-2">{row.code}</span>
                        {row.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUuid ? t('common.edit') : t('common.create')} — {t('uom.pageTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('uom.code')} *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                disabled={!!editingUuid}
              />
            </div>
            <div>
              <Label>{t('uom.name')} *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>{t('uom.type')}</Label>
              <Select value={String(form.type ?? 0)} onValueChange={(v) => setForm({ ...form, type: Number(v) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UOM_SCOPES.map((ut) => (
                    <SelectItem key={ut.value} value={String(ut.value)}>
                      {t(ut.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('uom.decimalPlaces')}</Label>
              <Input
                type="number"
                min={0}
                max={6}
                value={form.decimalPlaces ?? 0}
                onChange={(e) => setForm({ ...form, decimalPlaces: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handleSave()}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
