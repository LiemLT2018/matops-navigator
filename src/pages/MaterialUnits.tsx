import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/StatusBadge';
import { uomService } from '@/api/services';
import type { UomCatalog, UomCreateBody } from '@/types/models';
import { toast } from 'sonner';

export default function MaterialUnitsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<UomCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUuid, setEditingUuid] = useState<string | null>(null);
  const [form, setForm] = useState<UomCreateBody>({ code: '', name: '', decimalPlaces: 0, status: 1 });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await uomService.list({ keyword: search || undefined, pageIndex: page, pageSize: 20 });
      setData(res.items);
      setTotalCount(res.pagination.totalCount);
      setTotalPages(res.pagination.totalPage);
    } catch {
      // API failed — show empty
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [search, page]);

  const handleCreate = () => {
    setEditingUuid(null);
    setForm({ code: '', name: '', decimalPlaces: 0, status: 1 });
    setDialogOpen(true);
  };

  const handleEdit = async (item: UomCatalog) => {
    setEditingUuid(item.uuid);
    setForm({ code: item.code, name: item.name, decimalPlaces: 0, status: item.status });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingUuid) {
        await uomService.update(editingUuid, form);
        toast.success(t('common.edit') + ' ' + t('common.success'));
      } else {
        await uomService.create(form);
        toast.success(t('common.create') + ' ' + t('common.success'));
      }
      setDialogOpen(false);
      loadData();
    } catch {
      // Error handled by apiClient interceptor
    }
  };

  const handleDelete = async (uuid: string) => {
    try {
      await uomService.delete(uuid);
      toast.success(t('common.delete') + ' ' + t('common.success'));
      loadData();
    } catch { /* handled */ }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t('materials.units.title')}</h1>
        <Button size="sm" onClick={handleCreate}><Plus className="mr-1 h-4 w-4" />{t('common.create')}</Button>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search')}
              className="max-w-sm h-8"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('materials.units.code')}</TableHead>
                <TableHead>{t('materials.units.name')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{t('common.loading')}</TableCell></TableRow>
              ) : data.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{t('common.noData')}</TableCell></TableRow>
              ) : data.map(item => (
                <TableRow key={item.uuid} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-mono text-xs">{item.code}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell><StatusBadge status={item.status === 1 ? 'active' : 'inactive'} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(item)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item.uuid)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUuid ? t('common.edit') : t('common.create')} {t('materials.units.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('materials.units.code')}</Label>
              <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} disabled={!!editingUuid} />
            </div>
            <div>
              <Label>{t('materials.units.name')}</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
