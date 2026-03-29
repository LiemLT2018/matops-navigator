import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getPurchaseRequests, type PurchaseRequest } from '@/api/mockApi';
import { formatCurrency } from '@/utils/formatNumber';
import { Plus, Search } from 'lucide-react';
import { DatePresetSelect } from '@/components/DatePresetSelect';
import type { DatePresetKey } from '@/types/api';

type DateFilter = DatePresetKey | 'all';

export default function PurchaseRequestsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<PurchaseRequest[]>([]);
  const [search, setSearch] = useState('');
  const [preset, setPreset] = useState<DateFilter>('this_month');

  useEffect(() => { getPurchaseRequests().then(r => setData(r.data)); }, []);

  const filtered = data.filter(d =>
    !search || d.code.toLowerCase().includes(search.toLowerCase()) || d.requester.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('purchasing.request.title')}</h1>
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
                <TableHead>{t('purchasing.request.code')}</TableHead>
                <TableHead>{t('purchasing.request.requester')}</TableHead>
                <TableHead>{t('purchasing.request.department')}</TableHead>
                <TableHead>{t('purchasing.request.date')}</TableHead>
                <TableHead>{t('purchasing.request.bomRef')}</TableHead>
                <TableHead className="text-right">{t('purchasing.order.totalAmount')}</TableHead>
                <TableHead>{t('purchasing.request.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(row => (
                <TableRow key={row.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-mono text-sm font-medium">{row.code}</TableCell>
                  <TableCell>{row.requester}</TableCell>
                  <TableCell>{row.department}</TableCell>
                  <TableCell className="font-mono text-sm">{row.date}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {row.bomRefs.map(ref => (
                        <Badge key={ref} variant="outline" className="text-xs font-mono">{ref}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(row.totalAmount)}</TableCell>
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
