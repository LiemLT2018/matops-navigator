import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
import { NumberDisplay } from '@/components/NumberDisplay';
import { getProducts, type Product } from '@/api/mockApi';

export default function ProductListPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProducts().then(res => { setData(res.data); setLoading(false); });
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t('products.list.title')}</h1>
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
                <TableHead>{t('products.list.code')}</TableHead>
                <TableHead>{t('products.list.name')}</TableHead>
                <TableHead>{t('products.list.group')}</TableHead>
                <TableHead>{t('products.list.specification')}</TableHead>
                <TableHead>{t('products.list.unit')}</TableHead>
                <TableHead className="text-right">{t('products.list.price')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('common.loading')}</TableCell></TableRow>
              ) : data.map(item => (
                <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-mono text-xs">{item.code}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.group}</TableCell>
                  <TableCell>{item.specification}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell className="text-right"><NumberDisplay value={item.price} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
