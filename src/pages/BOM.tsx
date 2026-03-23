import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getBOMs, getBOMDetail, type BOMMaster, type BOMDetail } from '@/api/mockApi';
import { Plus, Search, ChevronDown, ChevronRight, Upload, LayoutGrid, List } from 'lucide-react';
import { NumberDisplay } from '@/components/NumberDisplay';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export default function BOMPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<BOMMaster[]>([]);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'master' | 'list'>('list');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bomDetails, setBomDetails] = useState<Record<string, BOMDetail[]>>({});

  useEffect(() => { getBOMs().then(r => setData(r.data)); }, []);

  const handleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    if (!bomDetails[id]) {
      const res = await getBOMDetail(id);
      setBomDetails(prev => ({ ...prev, [id]: res.data }));
    }
    setExpandedId(id);
  };

  const filtered = data.filter(d =>
    !search || d.code.toLowerCase().includes(search.toLowerCase()) || d.product.toLowerCase().includes(search.toLowerCase())
  );

  const renderBOMDetailTable = (details: BOMDetail[]) => (
    <div className="bg-muted/30 p-4 border-t border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('bom.materialCode')}</TableHead>
            <TableHead>{t('bom.materialName')}</TableHead>
            <TableHead>{t('bom.specification')}</TableHead>
            <TableHead>{t('bom.unit')}</TableHead>
            <TableHead className="text-right">{t('bom.quantity')}</TableHead>
            <TableHead>{t('bom.note')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {details.map(d => (
            <TableRow key={d.id}>
              <TableCell className="font-mono text-sm">{d.materialCode}</TableCell>
              <TableCell>{d.materialName}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{d.specification}</TableCell>
              <TableCell>{d.unit}</TableCell>
              <TableCell className="text-right font-mono"><NumberDisplay value={d.quantity} /></TableCell>
              <TableCell className="text-sm text-muted-foreground">{d.note}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('bom.title')}</h1>
        <div className="flex gap-2">
          <Button variant="outline"><Upload className="h-4 w-4 mr-1" />{t('bom.importExcel')}</Button>
          <Button><Plus className="h-4 w-4 mr-1" />{t('common.create')}</Button>
        </div>
      </div>
      <Card className="industrial-shadow">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t('common.search')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex border border-border rounded-md overflow-hidden">
              <Button variant={viewMode === 'master' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('master')} className="rounded-none">
                <LayoutGrid className="h-4 w-4 mr-1" />{t('bom.masterView')}
              </Button>
              <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="rounded-none">
                <List className="h-4 w-4 mr-1" />{t('bom.listView')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {viewMode === 'list' && <TableHead className="w-10"></TableHead>}
                <TableHead>{t('bom.code')}</TableHead>
                <TableHead>{t('bom.product')}</TableHead>
                <TableHead>{t('bom.customer')}</TableHead>
                <TableHead>{t('bom.version')}</TableHead>
                <TableHead>{t('bom.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(row => (
                <Collapsible key={row.id} open={expandedId === row.id} asChild>
                  <>
                    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => viewMode === 'list' ? handleExpand(row.id) : undefined}>
                      {viewMode === 'list' && (
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleExpand(row.id); }}>
                              {expandedId === row.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                      )}
                      <TableCell className="font-mono text-sm font-medium">{row.code}</TableCell>
                      <TableCell>{row.product}</TableCell>
                      <TableCell className="text-muted-foreground">{row.customer}</TableCell>
                      <TableCell className="font-mono text-sm">{row.version}</TableCell>
                      <TableCell><StatusBadge status={row.status} /></TableCell>
                    </TableRow>
                    {viewMode === 'list' && (
                      <CollapsibleContent asChild>
                        <tr>
                          <td colSpan={6} className="p-0">
                            {bomDetails[row.id] && renderBOMDetailTable(bomDetails[row.id])}
                          </td>
                        </tr>
                      </CollapsibleContent>
                    )}
                  </>
                </Collapsible>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
