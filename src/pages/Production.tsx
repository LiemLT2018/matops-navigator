import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { getProductionOrders, type ProductionOrder } from '@/api/mockApi';
import { Plus, Search } from 'lucide-react';

export default function ProductionPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<ProductionOrder[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => { getProductionOrders().then(r => setData(r.data)); }, []);

  const filtered = data.filter(d =>
    !search || d.code.toLowerCase().includes(search.toLowerCase()) || d.product.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('production.title')}</h1>
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
                <TableHead>{t('production.orderCode')}</TableHead>
                <TableHead>{t('production.product')}</TableHead>
                <TableHead className="text-right">{t('production.quantity')}</TableHead>
                <TableHead>{t('production.stage')}</TableHead>
                <TableHead className="w-[150px]">{t('production.progress')}</TableHead>
                <TableHead>{t('production.assignee')}</TableHead>
                <TableHead>{t('production.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(row => (
                <TableRow key={row.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-mono text-sm font-medium">{row.code}</TableCell>
                  <TableCell>{row.product}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{row.quantity}</TableCell>
                  <TableCell className="text-sm">{row.stage}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={row.progress} className="h-2 flex-1" />
                      <span className="text-xs font-mono text-muted-foreground w-8">{row.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{row.assignee}</TableCell>
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
