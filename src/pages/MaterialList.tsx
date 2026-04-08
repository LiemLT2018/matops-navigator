import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search, Edit, Trash2, Loader2 } from 'lucide-react';
import { NumberDisplay } from '@/components/NumberDisplay';
import { StatusBadge } from '@/components/StatusBadge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { itemService, itemCategoryService, uomService } from '@/api/services';
import { MatOpsApiError } from '@/lib/apiClient';
import { resolveMdCompanyUuidForApi } from '@/lib/authStorage';
import {
  EdTypeFind,
  EdItemCategoryType,
  type ItemDetail,
  type ItemCreateBody,
  type ItemCategoryCatalog,
  type UomCatalog,
} from '@/types/models';
import { toast } from 'sonner';

/** `GetItemsQuery.CategoryTypes` — nhóm NVL (0) hoặc bán TP (1). */
const MATERIAL_LIST_CATEGORY_TYPES: EdItemCategoryType[] = [
  EdItemCategoryType.RAW_MATERIAL,
  EdItemCategoryType.SEMI_FINISHED,
];

/** Nhóm hàng khi tạo — cùng tập loại với danh sách. */
const MATERIAL_LOOKUP_CATEGORY_TYPES = MATERIAL_LIST_CATEGORY_TYPES;

function nestedCategory(row: ItemDetail): { name?: string; code?: string } | null {
  const r = row as ItemDetail & { ItemCategory?: { name?: string; code?: string } };
  return row.itemCategory ?? r.ItemCategory ?? null;
}

function nestedUom(row: ItemDetail): { code?: string; name?: string } | null {
  const r = row as ItemDetail & { Uom?: { code?: string; name?: string } };
  return row.uom ?? r.Uom ?? null;
}

function pickStandardCost(row: ItemDetail): number | null {
  const ex = row as ItemDetail & { StandardCost?: number | null };
  const v = row.standardCost ?? ex.StandardCost;
  if (v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

type CreateForm = {
  code: string;
  name: string;
  mdItemCategoryUuid: string;
  mdUomUuid: string;
  type: EdItemCategoryType;
  specification: string;
  standardCost: string;
};

const emptyCreateForm = (): CreateForm => ({
  code: '',
  name: '',
  mdItemCategoryUuid: '',
  mdUomUuid: '',
  type: EdItemCategoryType.RAW_MATERIAL,
  specification: '',
  standardCost: '',
});

export default function MaterialListPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<ItemDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreateForm);
  const [saving, setSaving] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [categories, setCategories] = useState<ItemCategoryCatalog[]>([]);
  const [uoms, setUoms] = useState<UomCatalog[]>([]);

  const loadData = useCallback(async () => {
    const mdCompanyUuid = resolveMdCompanyUuidForApi();
    setLoading(true);
    try {
      const res = await itemService.list({
        typeFind: EdTypeFind.DETAIL_LIST,
        isPaging: 1,
        pageIndex: page,
        pageSize: 20,
        keyword: search.trim() || undefined,
        ...(mdCompanyUuid ? { mdCompanyUuid } : {}),
        categoryTypes: [...MATERIAL_LIST_CATEGORY_TYPES],
      });
      setData(res.items ?? []);
      setTotalCount(res.pagination?.totalCount ?? 0);
      setTotalPages(res.pagination?.totalPage ?? 1);
    } catch (e) {
      setData([]);
      setTotalCount(0);
      setTotalPages(1);
      if (e instanceof MatOpsApiError) {
        toast.error(e.errorMessage || t('errors.system'));
      } else {
        toast.error(t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!dialogOpen) return;
    let cancelled = false;
    setLookupLoading(true);
    (async () => {
      try {
        const [catRes, uomRes] = await Promise.all([
          itemCategoryService.list({
            typeFind: EdTypeFind.CATALOG,
            isPaging: 0,
            pageSize: 500,
            types: [...MATERIAL_LOOKUP_CATEGORY_TYPES],
          }),
          uomService.list({
            typeFind: EdTypeFind.CATALOG,
            isPaging: 0,
            pageSize: 500,
            types: [0],
          }),
        ]);
        if (!cancelled) {
          setCategories(catRes.items ?? []);
          setUoms(uomRes.items ?? []);
        }
      } catch (e) {
        if (!cancelled) {
          setCategories([]);
          setUoms([]);
          if (e instanceof MatOpsApiError) {
            toast.error(e.errorMessage || t('errors.system'));
          } else {
            toast.error(t('materials.list.lookupLoadError'));
          }
        }
      } finally {
        if (!cancelled) setLookupLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dialogOpen, t]);

  const openCreate = () => {
    if (!resolveMdCompanyUuidForApi()) {
      toast.error(t('errors.missingCompany'));
      return;
    }
    setCreateForm(emptyCreateForm());
    setDialogOpen(true);
  };

  const submitCreate = async () => {
    const mdCompanyUuid = resolveMdCompanyUuidForApi();
    if (!mdCompanyUuid) {
      toast.error(t('errors.missingCompany'));
      return;
    }
    const code = createForm.code.trim();
    const name = createForm.name.trim();
    if (!code || !name) {
      toast.error(t('common.required'));
      return;
    }
    if (!createForm.mdItemCategoryUuid) {
      toast.error(t('materials.list.validationCategory'));
      return;
    }
    if (!createForm.mdUomUuid) {
      toast.error(t('materials.list.validationUom'));
      return;
    }

    const scRaw = createForm.standardCost.trim();
    let standardCost: number | undefined;
    if (scRaw !== '') {
      const n = Number(scRaw);
      if (!Number.isFinite(n) || n < 0) {
        toast.error(t('common.error'));
        return;
      }
      standardCost = n;
    }

    const mdType =
      createForm.type === EdItemCategoryType.SEMI_FINISHED
        ? EdItemCategoryType.SEMI_FINISHED
        : EdItemCategoryType.RAW_MATERIAL;

    const body: ItemCreateBody = {
      mdCompanyUuid,
      mdItemCategoryUuid: createForm.mdItemCategoryUuid,
      mdUomUuid: createForm.mdUomUuid,
      code,
      name,
      type: mdType,
      specification: createForm.specification.trim() || undefined,
      standardCost,
      minStockQty: 0,
      maxStockQty: 0,
      reorderQty: 0,
      isStockItem: 1,
      isPurchaseItem: 1,
      isProductionItem: 0,
      isSaleItem: 0,
      status: 1,
    };

    setSaving(true);
    try {
      await itemService.create(body);
      toast.success(t('common.create') + ' ' + t('errors.success'));
      setDialogOpen(false);
      setCreateForm(emptyCreateForm());
      await loadData();
    } catch (e) {
      if (e instanceof MatOpsApiError) {
        toast.error(e.errorMessage || t('errors.system'));
      } else {
        toast.error(t('common.error'));
      }
    } finally {
      setSaving(false);
    }
  };

  const canSubmit =
    !saving &&
    !lookupLoading &&
    createForm.code.trim() !== '' &&
    createForm.name.trim() !== '' &&
    createForm.mdItemCategoryUuid !== '' &&
    createForm.mdUomUuid !== '';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('materials.list.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('materials.list.filterScopeHint')}</p>
        </div>
        <Button size="sm" className="shrink-0 self-start sm:self-center" type="button" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />{t('common.create')}
        </Button>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              placeholder={t('common.search')}
              className="max-w-sm h-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('materials.list.code')}</TableHead>
                <TableHead>{t('materials.list.name')}</TableHead>
                <TableHead>{t('materials.list.group')}</TableHead>
                <TableHead className="hidden md:table-cell max-w-[180px]">{t('materials.list.specification')}</TableHead>
                <TableHead>{t('materials.list.unit')}</TableHead>
                <TableHead className="text-right">{t('materials.list.price')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {t('common.loading')}
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {t('common.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => {
                  const cat = nestedCategory(item);
                  const u = nestedUom(item);
                  const groupLabel = cat?.name ?? cat?.code ?? '—';
                  const unitLabel = u?.code ?? u?.name ?? '—';
                  const rowEx = item as ItemDetail & { Specification?: string | null };
                  const specRaw = item.specification ?? rowEx.Specification;
                  const spec = specRaw?.trim() ? specRaw : '—';
                  const price = pickStandardCost(item);
                  return (
                    <TableRow key={item.uuid} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-xs">{item.code}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{groupLabel}</TableCell>
                      <TableCell className="hidden md:table-cell max-w-[180px] truncate text-sm" title={spec !== '—' ? spec : undefined}>
                        {spec}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{unitLabel}</TableCell>
                      <TableCell className="text-right">
                        {price != null ? <NumberDisplay value={price} /> : '—'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.status === 1 ? 'active' : 'inactive'} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          {(totalPages > 1 || totalCount > 0) && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-sm text-muted-foreground">
                {totalCount} {t('common.items')}
              </span>
              {totalPages > 1 ? (
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    {t('common.previous')}
                  </Button>
                  <span className="flex items-center px-3 text-sm">
                    {page} / {totalPages}
                  </span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    {t('common.next')}
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[min(90vh,40rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('materials.list.createDialogTitle')}</DialogTitle>
          </DialogHeader>
          {lookupLoading ? (
            <div className="flex justify-center py-10 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('materials.list.category')}</Label>
                <Select
                  value={createForm.mdItemCategoryUuid || '__none__'}
                  onValueChange={(v) =>
                    setCreateForm((f) => ({ ...f, mdItemCategoryUuid: v === '__none__' ? '' : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('materials.list.selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t('materials.list.selectCategory')}</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.uuid} value={c.uuid}>
                        {c.code} · {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('materials.list.uom')}</Label>
                <Select
                  value={createForm.mdUomUuid || '__none__'}
                  onValueChange={(v) =>
                    setCreateForm((f) => ({ ...f, mdUomUuid: v === '__none__' ? '' : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('materials.list.selectUom')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t('materials.list.selectUom')}</SelectItem>
                    {uoms.map((u) => (
                      <SelectItem key={u.uuid} value={u.uuid}>
                        {u.code} · {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('materials.list.itemType')}</Label>
                <Select
                  value={String(createForm.type)}
                  onValueChange={(v) =>
                    setCreateForm((f) => ({
                      ...f,
                      type: Number(v) as EdItemCategoryType,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(EdItemCategoryType.RAW_MATERIAL)}>
                      {t('materials.list.typeRawMaterialMd')}
                    </SelectItem>
                    <SelectItem value={String(EdItemCategoryType.SEMI_FINISHED)}>
                      {t('materials.list.typeSemiFinishedMd')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ml-code">{t('materials.list.code')}</Label>
                <Input
                  id="ml-code"
                  value={createForm.code}
                  onChange={(e) => setCreateForm((f) => ({ ...f, code: e.target.value }))}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ml-name">{t('materials.list.name')}</Label>
                <Input
                  id="ml-name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ml-spec">{t('materials.list.specification')}</Label>
                <Input
                  id="ml-spec"
                  value={createForm.specification}
                  onChange={(e) => setCreateForm((f) => ({ ...f, specification: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ml-cost">{t('materials.list.standardCost')}</Label>
                <Input
                  id="ml-cost"
                  type="number"
                  min={0}
                  step="0.01"
                  value={createForm.standardCost}
                  onChange={(e) => setCreateForm((f) => ({ ...f, standardCost: e.target.value }))}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setDialogOpen(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="button" disabled={!canSubmit || lookupLoading} onClick={() => void submitCreate()}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                  {t('common.saving')}
                </>
              ) : (
                t('common.save')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
