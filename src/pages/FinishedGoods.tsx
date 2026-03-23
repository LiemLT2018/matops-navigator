import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getFinishedGoods, type FinishedGood } from '@/api/mockApi';
import { NumberDisplay } from '@/components/NumberDisplay';
import { Search } from 'lucide-react';

export default function FinishedGoodsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<FinishedGood[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => { getFinishedGoods().then(r => setData(r.data)); }, []);

  const filtered = data.filter(d =>
    !search || d.productCode.toLowerCase().includes(search.toLowerCase()) || d.productName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('finishedGoods.title')}</h1>
        <div className="flex gap-2">
          <Button variant="outline">{t('finishedGoods.inbound')}</Button>
          <Button variant="outline">{t('finishedGoods.outbound')}</Button>
        </div>
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
                <TableHead>{t('finishedGoods.productCode')}</TableHead>
                <TableHead>{t('finishedGoods.productName')}</TableHead>
                <TableHead className="text-right">{t('finishedGoods.currentStock')}</TableHead>
                <TableHead>{t('finishedGoods.soRef')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(row => (
                <TableRow key={row.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-mono text-sm font-medium">{row.productCode}</TableCell>
                  <TableCell>{row.productName}</TableCell>
                  <TableCell className="text-right font-mono text-sm"><NumberDisplay value={row.currentStock} /></TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{row.soRef}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
