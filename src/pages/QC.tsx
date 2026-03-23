import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getQCInspections, type QCInspection } from '@/api/mockApi';
import { Plus, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function QCPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<QCInspection[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => { getQCInspections().then(r => setData(r.data)); }, []);

  const filtered = data.filter(d =>
    !search || d.code.toLowerCase().includes(search.toLowerCase()) || d.product.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('qc.title')}</h1>
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
                <TableHead>{t('qc.inspectionCode')}</TableHead>
                <TableHead>{t('qc.product')}</TableHead>
                <TableHead>{t('qc.inspector')}</TableHead>
                <TableHead>{t('qc.date')}</TableHead>
                <TableHead>{t('qc.criteria')}</TableHead>
                <TableHead>{t('qc.result')}</TableHead>
                <TableHead>{t('qc.notes')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(row => (
                <TableRow key={row.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-mono text-sm font-medium">{row.code}</TableCell>
                  <TableCell>{row.product}</TableCell>
                  <TableCell>{row.inspector}</TableCell>
                  <TableCell className="font-mono text-sm">{row.date}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {row.criteria.map(c => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell><StatusBadge status={row.result} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{row.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
