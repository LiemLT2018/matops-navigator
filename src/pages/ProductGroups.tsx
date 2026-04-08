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

/** `GetItemCategoriesQuery.Types` — nhóm sản phẩm = loại thành phẩm (2). */
const LIST_TYPES: EdItemCategoryType[] = [EdItemCategoryType.FINISHED_GOOD];

/** Khớp `ItemCategoryCodeRule.GetPrefix` cho type 2 → `TP`. */
const CODE_PREFIX_HINT = 'TP';

export default function ProductGroupsPage() {
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
    type: EdItemCategoryType.FINISHED_GOOD,
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
      type: EdItemCategoryType.FINISHED_GOOD,
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
        type: EdItemCategoryType.FINISHED_GOOD,
        parentItemCategoryUuid: d.parentItemCategoryUuid ?? undefined,
      });
      setDialogOpen(true);
    } catch (e) {
      if (e instanceof MatOpsApiError) {
        toast.error(e.errorMessage || t('errors.system'));
      } else {
        toast.error(t('products.groups.loadDetailFailed'));
      }
    } finally {
      setLoadingUuid(null);
    }
  };

  const handleSave = async () => {
    const name = form.name?.trim() ?? '';
    const code = form.code?.trim() ?? '';
    if (!name) {
      toast.error(t('products.groups.nameRequired'));
      return;
    }
    if (!editingUuid && !code) {
      toast.error(t('products.groups.codeRequired'));
      return;
    }

    setSaving(true);
    try {
      const body: ItemCategoryCreateBody = {
        ...form,
        name,
        code: editingUuid ? form.code : code,
        type: EdItemCategoryType.FINISHED_GOOD,
      };
      if (editingUuid) {
        await itemCategoryService.update(editingUuid, body);
        toast.success(t('common.edit') + ' ' + t('errors.success'));
      } else {
        await itemCategoryService.create(body);
        toast.success(t('common.create') + ' ' + t('errors.success'));
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
    if (!window.confirm(t('products.groups.deleteConfirm'))) return;
    try {
      await itemCategoryService.delete(uuid);
      toast.success(t('common.delete') + ' ' + t('errors.success'));
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
          <h1 className="text-2xl font-bold text-foreground">{t('products.groups.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('products.groups.filterScopeHint')}</p>
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
                <TableHead>{t('products.groups.code')}</TableHead>
                <TableHead>{t('products.groups.name')}</TableHead>
                <TableHead className="hidden md:table-cell max-w-[220px]">{t('products.groups.description')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {t('common.loading')}
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {t('common.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.uuid} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-xs">{item.code}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell
                      className="hidden md:table-cell max-w-[220px] text-sm text-muted-foreground truncate"
                      title={item.description ?? undefined}
                    >
                      {item.description?.trim() ? item.description : '—'}
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
              {editingUuid ? t('common.edit') : t('common.create')} {t('products.groups.title')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pg-code">{t('products.groups.code')}</Label>
              <Input
                id="pg-code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                disabled={!!editingUuid}
                placeholder={`${CODE_PREFIX_HINT}-...`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pg-name">{t('products.groups.name')}</Label>
              <Input
                id="pg-name"
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
                  <SelectItem value="1">{t('products.groups.statusActive')}</SelectItem>
                  <SelectItem value="0">{t('products.groups.statusInactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">{t('products.groups.apiTypeNote')}</p>
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
