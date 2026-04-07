import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { itemAliasService, itemService } from '@/api/services';
import type { ItemAliasDetail } from '@/types/models';
import { EdItemAliasType, EdTypeFind } from '@/types/models';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SuggestInputText } from '@/components/SuggestInputText';
import type { SuggestData } from '@/api/suggestApi';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MatOpsApiError } from '@/lib/apiClient';

type RowDisplay = ItemAliasDetail & { materialCode: string; materialName: string };

function aliasTypeLabel(t: (k: string) => string, type: number): string {
  switch (type) {
    case EdItemAliasType.COMMON_NAME:
      return t('materials.aliases.typeCommon');
    case EdItemAliasType.SUPPLIER_NAME:
      return t('materials.aliases.typeSupplier');
    case EdItemAliasType.SEARCH_KEYWORD:
      return t('materials.aliases.typeKeyword');
    default:
      return String(type);
  }
}

async function enrichWithItems(rows: ItemAliasDetail[]): Promise<RowDisplay[]> {
  const uuids = [...new Set(rows.map((r) => r.mdItemUuid))];
  const cache = new Map<string, { code: string; name: string }>();
  await Promise.all(
    uuids.map(async (uuid) => {
      try {
        const it = await itemService.get(uuid);
        cache.set(uuid, { code: it.code, name: it.name });
      } catch {
        cache.set(uuid, { code: '—', name: '—' });
      }
    }),
  );
  return rows.map((row) => {
    const it = cache.get(row.mdItemUuid);
    return {
      ...row,
      materialCode: it?.code ?? '—',
      materialName: it?.name ?? '—',
    };
  });
}

export default function MaterialAliasesPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<RowDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ItemAliasDetail | null>(null);
  const [formMdItemUuid, setFormMdItemUuid] = useState('');
  const [formMaterialName, setFormMaterialName] = useState('');
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<string>(String(EdItemAliasType.COMMON_NAME));
  const [formDescription, setFormDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ItemAliasDetail | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const types =
        typeFilter === 'all'
          ? undefined
          : [Number(typeFilter)];
      const res = await itemAliasService.list({
        pageIndex: page,
        pageSize: 20,
        isPaging: 1,
        typeFind: EdTypeFind.DETAIL_LIST,
        keyword: keyword.trim() || undefined,
        types,
      });
      const enriched = await enrichWithItems(res.items);
      setData(enriched);
      setTotalPages(res.pagination.totalPage);
      setTotalCount(res.pagination.totalCount);
    } catch (e) {
      setData([]);
      if (e instanceof MatOpsApiError) {
        toast.error(e.errorMessage);
      } else {
        toast.error(t('errors.system'));
      }
    } finally {
      setLoading(false);
    }
  }, [page, keyword, typeFilter, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditing(null);
    setFormMdItemUuid('');
    setFormMaterialName('');
    setFormName('');
    setFormType(String(EdItemAliasType.COMMON_NAME));
    setFormDescription('');
    setDialogOpen(true);
  };

  const openEdit = (row: RowDisplay) => {
    setEditing(row);
    setFormMdItemUuid(row.mdItemUuid);
    setFormMaterialName(row.materialName);
    setFormName(row.name);
    setFormType(String(row.type));
    setFormDescription(row.description ?? '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formMdItemUuid.trim() || !formName.trim()) {
      toast.error(t('login.fillAll'));
      return;
    }
    setSaving(true);
    try {
      const body = {
        mdItemUuid: formMdItemUuid.trim(),
        name: formName.trim(),
        type: Number(formType),
        description: formDescription.trim() || null,
      };
      if (editing) {
        await itemAliasService.update(editing.uuid, body);
        toast.success(t('common.edit') + ' — OK');
      } else {
        await itemAliasService.create(body);
        toast.success(t('common.create') + ' — OK');
      }
      setDialogOpen(false);
      loadData();
    } catch (e) {
      if (e instanceof MatOpsApiError) {
        toast.error(e.errorMessage);
      } else {
        toast.error(t('errors.system'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await itemAliasService.delete(deleteTarget.uuid);
      toast.success(t('common.delete') + ' — OK');
      setDeleteTarget(null);
      loadData();
    } catch (e) {
      if (e instanceof MatOpsApiError) {
        toast.error(e.errorMessage);
      } else {
        toast.error(t('errors.system'));
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t('materials.aliases.title')}</h1>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          {t('common.create')}
        </Button>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                className="h-9 pl-9"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setKeyword(searchInput);
                    setPage(1);
                  }
                }}
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('materials.aliases.typeAll')}</SelectItem>
                <SelectItem value={String(EdItemAliasType.COMMON_NAME)}>
                  {t('materials.aliases.typeCommon')}
                </SelectItem>
                <SelectItem value={String(EdItemAliasType.SUPPLIER_NAME)}>
                  {t('materials.aliases.typeSupplier')}
                </SelectItem>
                <SelectItem value={String(EdItemAliasType.SEARCH_KEYWORD)}>
                  {t('materials.aliases.typeKeyword')}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="secondary"
              size="sm"
              className="h-9"
              onClick={() => {
                setKeyword(searchInput);
                setPage(1);
              }}
            >
              {t('common.search')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('materials.aliases.alias')}</TableHead>
                <TableHead>{t('materials.aliases.materialCode')}</TableHead>
                <TableHead>{t('materials.aliases.materialName')}</TableHead>
                <TableHead>{t('materials.aliases.type')}</TableHead>
                <TableHead>{t('materials.aliases.description')}</TableHead>
                <TableHead>{t('materials.aliases.createdAt')}</TableHead>
                <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    {t('common.loading')}
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    {t('common.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.uuid} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="font-mono text-xs">{item.materialCode}</TableCell>
                    <TableCell>{item.materialName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {aliasTypeLabel(t, item.type)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {item.description || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString()
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(item)}
                          title={t('common.edit')}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteTarget(item)}
                          title={t('common.delete')}
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
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-sm text-muted-foreground">
              {t('common.total')}: {totalCount} {t('common.rows')}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                ←
              </Button>
              <span className="text-sm">
                {t('common.page')} {page} {t('common.of')} {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                →
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? t('materials.aliases.editTitle') : t('materials.aliases.createTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>{t('materials.aliases.selectMaterial')}</Label>
              <div className="mt-1 space-y-2">
                <SuggestInputText
                  type="material"
                  value={formMaterialName}
                  selectedUuid={formMdItemUuid}
                  onChange={(v) => {
                    setFormMaterialName(v);
                    setFormMdItemUuid('');
                  }}
                  onSelect={(item: SuggestData) => {
                    setFormMaterialName(item.name);
                    setFormMdItemUuid(item.uuid);
                  }}
                  placeholder={t('bom.materialName')}
                />
                <Input
                  className="font-mono text-xs"
                  placeholder="mdItemUuid (UUID vật tư)"
                  value={formMdItemUuid}
                  onChange={(e) => setFormMdItemUuid(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>{t('materials.aliases.alias')}</Label>
              <Input className="mt-1" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div>
              <Label>{t('materials.aliases.type')}</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={String(EdItemAliasType.COMMON_NAME)}>
                    {t('materials.aliases.typeCommon')}
                  </SelectItem>
                  <SelectItem value={String(EdItemAliasType.SUPPLIER_NAME)}>
                    {t('materials.aliases.typeSupplier')}
                  </SelectItem>
                  <SelectItem value={String(EdItemAliasType.SEARCH_KEYWORD)}>
                    {t('materials.aliases.typeKeyword')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('materials.aliases.description')}</Label>
              <Textarea
                className="mt-1"
                rows={2}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {t('materials.aliases.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
