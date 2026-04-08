import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search, Edit, Trash2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { itemCategoryService } from '@/api/services';
import { MatOpsApiError } from '@/lib/apiClient';
import {
  EdTypeFind,
  EdItemCategoryType,
  type ItemCategoryCatalog,
  type ItemCategoryCreateBody,
} from '@/types/models';
import { toast } from 'sonner';

/** Khớp `GetItemCategoriesQuery.Types` — chỉ NVL (0) và bán thành phẩm (1). */
const LIST_TYPES: EdItemCategoryType[] = [
  EdItemCategoryType.RAW_MATERIAL,
  EdItemCategoryType.SEMI_FINISHED,
];

/** Prefix gợi ý mã — khớp `ItemCategoryCodeRule.GetPrefix` trên API. */
function codePrefixHint(type: EdItemCategoryType | undefined): string {
  return type === EdItemCategoryType.SEMI_FINISHED ? 'NVL' : 'SP';
}

export default function MaterialGroupsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<ItemCategoryCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUuid, setEditingUuid] = useState<string | null>(null);
  const [loadingUuid, setLoadingUuid] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ItemCategoryCreateBody>({
    code: '',
    name: '',
    status: 1,
    type: EdItemCategoryType.RAW_MATERIAL,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await itemCategoryService.list({
        typeFind: EdTypeFind.LIST,
        isPaging: 1,
        pageIndex: page,
        pageSize: 20,
        keyword: search.trim() || undefined,
        types: [...LIST_TYPES],
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

  const handleCreate = () => {
    setEditingUuid(null);
    setForm({
      code: '',
      name: '',
      status: 1,
      type: EdItemCategoryType.RAW_MATERIAL,
      parentItemCategoryUuid: undefined,
    } satisfies ItemCategoryCreateBody);
    setDialogOpen(true);
  };

  const handleEdit = async (item: ItemCategoryCatalog) => {
    setLoadingUuid(item.uuid);
    try {
      const d = await itemCategoryService.get(item.uuid);
      setEditingUuid(item.uuid);
      setForm({
        code: d.code,
        name: d.name,
        status: d.status,
        type: d.type ?? EdItemCategoryType.RAW_MATERIAL,
        parentItemCategoryUuid: d.parentItemCategoryUuid ?? undefined,
      });
      setDialogOpen(true);
    } catch (e) {
      if (e instanceof MatOpsApiError) {
        toast.error(e.errorMessage || t('errors.system'));
      } else {
        toast.error(t('materials.groups.loadDetailFailed'));
      }
    } finally {
      setLoadingUuid(null);
    }
  };

  const handleSave = async () => {
    const name = form.name?.trim() ?? '';
    const code = form.code?.trim() ?? '';
    if (!name) {
      toast.error(t('materials.groups.nameRequired'));
      return;
    }
    if (!editingUuid && !code) {
      toast.error(t('materials.groups.codeRequired'));
      return;
    }

    setSaving(true);
    try {
      const rawType = form.type ?? EdItemCategoryType.RAW_MATERIAL;
      const categoryType =
        rawType === EdItemCategoryType.SEMI_FINISHED
          ? EdItemCategoryType.SEMI_FINISHED
          : EdItemCategoryType.RAW_MATERIAL;

      const body: ItemCategoryCreateBody = {
        ...form,
        name,
        code: editingUuid ? form.code : code,
        type: categoryType,
      };
      if (editingUuid) {
        await itemCategoryService.update(editingUuid, body);
        toast.success(t('common.edit') + ' ' + t('common.success'));
      } else {
        await itemCategoryService.create(body);
        toast.success(t('common.create') + ' ' + t('common.success'));
      }
      setDialogOpen(false);
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

  const handleDelete = async (uuid: string) => {
    if (!window.confirm(t('materials.groups.deleteConfirm'))) return;
    try {
      await itemCategoryService.delete(uuid);
      toast.success(t('common.delete') + ' ' + t('common.success'));
      await loadData();
    } catch (e) {
      if (e instanceof MatOpsApiError) {
        toast.error(e.errorMessage || t('errors.system'));
      } else {
        toast.error(t('common.error'));
      }
    }
  };

  const canSave =
    !saving &&
    (form.name?.trim() ?? '').length > 0 &&
    (!!editingUuid || (form.code?.trim() ?? '').length > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('materials.groups.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('materials.groups.filterScopeHint')}</p>
        </div>
        <Button size="sm" className="shrink-0 self-start sm:self-center" onClick={handleCreate}>
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
                <TableHead>{t('materials.groups.code')}</TableHead>
                <TableHead>{t('materials.groups.name')}</TableHead>
                <TableHead className="hidden md:table-cell max-w-[200px]">{t('materials.groups.description')}</TableHead>
                <TableHead className="w-[120px]">{t('materials.groups.categoryType')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
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
                    <TableCell className="hidden md:table-cell max-w-[200px] text-sm text-muted-foreground truncate" title={item.description ?? undefined}>
                      {item.description?.trim() ? item.description : '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.type === EdItemCategoryType.SEMI_FINISHED
                        ? t('materials.groups.typeSemiFinished')
                        : t('materials.groups.typeRawMaterial')}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status === 1 ? 'active' : 'inactive'} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={loadingUuid !== null}
                          onClick={() => void handleEdit(item)}
                        >
                          {loadingUuid === item.uuid ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Edit className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => void handleDelete(item.uuid)}
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

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingUuid(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUuid ? t('common.edit') : t('common.create')} {t('materials.groups.title')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('materials.groups.categoryType')}</Label>
              <Select
                value={String(form.type ?? EdItemCategoryType.RAW_MATERIAL)}
                onValueChange={(v) =>
                  setForm({ ...form, type: Number(v) as EdItemCategoryType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={String(EdItemCategoryType.RAW_MATERIAL)}>
                    {t('materials.groups.typeRawMaterial')}
                  </SelectItem>
                  <SelectItem value={String(EdItemCategoryType.SEMI_FINISHED)}>
                    {t('materials.groups.typeSemiFinished')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ig-code">{t('materials.groups.code')}</Label>
              <Input
                id="ig-code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                disabled={!!editingUuid}
                placeholder={`${codePrefixHint(form.type)}-...`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ig-name">{t('materials.groups.name')}</Label>
              <Input
                id="ig-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('common.status')}</Label>
              <Select
                value={String(form.status ?? 1)}
                onValueChange={(v) => setForm({ ...form, status: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t('materials.groups.statusActive')}</SelectItem>
                  <SelectItem value="0">{t('materials.groups.statusInactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">{t('materials.groups.apiTypeNote')}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handleSave()} disabled={!canSave}>
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
