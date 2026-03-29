import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { NumberDisplay } from '@/components/NumberDisplay';
import { DatePresetSelect } from '@/components/DatePresetSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getSalesOrders, type SalesOrder } from '@/api/mockApi';
import { formatCurrency } from '@/utils/formatNumber';
import { Plus, Search } from 'lucide-react';
import type { DatePresetKey } from '@/types/api';

type DateFilter = DatePresetKey | 'all';

export default function SalesOrdersPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<SalesOrder[]>([]);
  const [preset, setPreset] = useState<DateFilter>('this_month');
  const [search, setSearch] = useState('');

  useEffect(() => { getSalesOrders().then(r => setData(r.data)); }, []);

  const filtered = data.filter(d =>
    !search || d.code.toLowerCase().includes(search.toLowerCase()) || d.customer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('orders.salesOrder.title')}</h1>
        <Button><Plus className="h-4 w-4 mr-1" />{t('common.create')}</Button>
      </div>
      <Card className="industrial-shadow">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t('common.search')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <DatePresetSelect value={preset} onChange={(p) => setPreset(p)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('orders.salesOrder.code')}</TableHead>
                <TableHead>{t('orders.salesOrder.customer')}</TableHead>
                <TableHead>{t('orders.salesOrder.orderDate')}</TableHead>
                <TableHead>{t('orders.salesOrder.deliveryDate')}</TableHead>
                <TableHead className="text-right">{t('orders.salesOrder.amount')}</TableHead>
                <TableHead>{t('orders.salesOrder.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(row => (
                <TableRow key={row.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-mono text-sm font-medium">{row.code}</TableCell>
                  <TableCell>{row.customer}</TableCell>
                  <TableCell className="font-mono text-sm">{row.orderDate}</TableCell>
                  <TableCell className="font-mono text-sm">{row.deliveryDate}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(row.amount)}</TableCell>
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
