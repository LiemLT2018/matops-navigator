import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getWarehouseItems, type WarehouseItem } from '@/api/mockApi';
import { NumberDisplay } from '@/components/NumberDisplay';
import { Search, AlertTriangle } from 'lucide-react';

export default function WarehousePage() {
  const { t } = useTranslation();
  const [data, setData] = useState<WarehouseItem[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => { getWarehouseItems().then(r => setData(r.data)); }, []);

  const filtered = data.filter(d =>
    !search || d.materialCode.toLowerCase().includes(search.toLowerCase()) || d.materialName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('warehouse.title')}</h1>
        <div className="flex gap-2">
          <Button variant="outline">{t('warehouse.inbound')}</Button>
          <Button variant="outline">{t('warehouse.outbound')}</Button>
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
                <TableHead>{t('warehouse.materialCode')}</TableHead>
                <TableHead>{t('warehouse.materialName')}</TableHead>
                <TableHead className="text-right">{t('warehouse.currentStock')}</TableHead>
                <TableHead className="text-right">{t('warehouse.minStock')}</TableHead>
                <TableHead>{t('warehouse.unit')}</TableHead>
                <TableHead>{t('warehouse.location')}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(row => {
                const isLow = row.currentStock < row.minStock;
                return (
                  <TableRow key={row.id} className={`cursor-pointer hover:bg-muted/50 ${isLow ? 'bg-destructive/5' : ''}`}>
                    <TableCell className="font-mono text-sm font-medium">{row.materialCode}</TableCell>
                    <TableCell>{row.materialName}</TableCell>
                    <TableCell className={`text-right font-mono text-sm ${isLow ? 'text-destructive font-bold' : ''}`}>
                      <NumberDisplay value={row.currentStock} />
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm"><NumberDisplay value={row.minStock} /></TableCell>
                    <TableCell>{row.unit}</TableCell>
                    <TableCell className="font-mono text-sm">{row.location}</TableCell>
                    <TableCell>{isLow && <AlertTriangle className="h-4 w-4 text-warning" />}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
