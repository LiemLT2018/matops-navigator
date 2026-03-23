import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Link2 } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { getUndefinedMaterials, type UndefinedMaterial } from '@/api/mockApi';

export default function UndefinedMaterialsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<UndefinedMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUndefinedMaterials().then(res => { setData(res.data); setLoading(false); });
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t('materials.undefined.title')}</h1>
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
                <TableHead>{t('materials.undefined.name')}</TableHead>
                <TableHead>{t('materials.undefined.specification')}</TableHead>
                <TableHead>{t('materials.undefined.source')}</TableHead>
                <TableHead>{t('materials.undefined.createdDate')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('common.loading')}</TableCell></TableRow>
              ) : data.map(item => (
                <TableRow key={item.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.specification}</TableCell>
                  <TableCell className="text-muted-foreground">{item.source}</TableCell>
                  <TableCell>{item.createdDate}</TableCell>
                  <TableCell><StatusBadge status={item.status} /></TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm"><Link2 className="mr-1 h-3 w-3" />{t('materials.undefined.link')}</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
