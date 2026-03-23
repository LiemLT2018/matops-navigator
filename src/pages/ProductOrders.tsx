import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getProductOrders, type ProductOrder } from '@/api/mockApi';
import { Plus, Search } from 'lucide-react';

export default function ProductOrdersPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<ProductOrder[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => { getProductOrders().then(r => setData(r.data)); }, []);

  const filtered = data.filter(d =>
    !search || d.code.toLowerCase().includes(search.toLowerCase()) || d.product.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('orders.productOrder.title')}</h1>
        <Button><Plus className="h-4 w-4 mr-1" />{t('common.create')}</Button>
      </div>
      <Card className="industrial-shadow">
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t('common.search')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('orders.productOrder.code')}</TableHead>
                <TableHead>{t('orders.productOrder.soRef')}</TableHead>
                <TableHead>{t('orders.productOrder.product')}</TableHead>
                <TableHead className="text-right">{t('orders.productOrder.quantity')}</TableHead>
                <TableHead>{t('orders.productOrder.dueDate')}</TableHead>
                <TableHead>{t('orders.productOrder.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(row => (
                <TableRow key={row.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-mono text-sm font-medium">{row.code}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{row.soRef}</TableCell>
                  <TableCell>{row.product}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{row.quantity}</TableCell>
                  <TableCell className="font-mono text-sm">{row.dueDate}</TableCell>
                  <TableCell><StatusBadge status={row.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
