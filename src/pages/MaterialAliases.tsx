import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
import { getMaterialAliases, type MaterialAlias } from '@/api/mockApi';

export default function MaterialAliasesPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<MaterialAlias[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMaterialAliases().then(res => { setData(res.data); setLoading(false); });
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t('materials.aliases.title')}</h1>
        <Button size="sm"><Plus className="mr-1 h-4 w-4" />{t('common.create')}</Button>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder={t('common.search')} className="max-w-sm h-8" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('materials.aliases.alias')}</TableHead>
                <TableHead>{t('materials.aliases.materialCode')}</TableHead>
                <TableHead>{t('materials.aliases.materialName')}</TableHead>
                <TableHead>{t('materials.aliases.source')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{t('common.loading')}</TableCell></TableRow>
              ) : data.map(item => (
                <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{item.alias}</TableCell>
                  <TableCell className="font-mono text-xs">{item.materialCode}</TableCell>
                  <TableCell>{item.materialName}</TableCell>
                  <TableCell className="text-muted-foreground">{item.source}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
