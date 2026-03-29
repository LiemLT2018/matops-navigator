import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DatePresetSelect } from '@/components/DatePresetSelect';
import { NumberDisplay } from '@/components/NumberDisplay';
import { getBOMs, getBOMDetail, getBOMChildRefs, searchMaterials, searchBOMs, type BOMMaster, type BOMDetail, type BOMChildRef, type MaterialSuggest } from '@/api/mockApi';
import { Plus, Search, ChevronDown, ChevronRight, Upload, LayoutGrid, List, Edit, Copy, Trash2, Download, X, Save } from 'lucide-react';
import type { DatePresetKey } from '@/types/api';
import { toast } from 'sonner';
import { SuggestInputText } from '@/components/SuggestInputText';
import type { SuggestData } from '@/api/suggestApi';

type DateFilter = DatePresetKey | 'all';

interface FormChildBOM {
  _key: string; bomCode: string; bomName: string; quantity: string; unit: string; note: string;
}
interface FormMaterial {
  _key: string; materialCode: string; materialName: string; specification: string; unit: string; quantity: string; manufacturer: string; note: string;
}

const emptyChildBOM = (): FormChildBOM => ({ _key: crypto.randomUUID(), bomCode: '', bomName: '', quantity: '', unit: 'Bộ', note: '' });
const emptyMaterial = (): FormMaterial => ({ _key: crypto.randomUUID(), materialCode: '', materialName: '', specification: '', unit: '', quantity: '', manufacturer: '', note: '' });

const removeViDiacritics = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

// Suggest dropdown component
function SuggestInput({ value, onChange, onSelect, suggestions, placeholder, disabled }: {
  value: string; onChange: (v: string) => void; onSelect: (item: MaterialSuggest) => void;
  suggestions: MaterialSuggest[]; placeholder?: string; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Input value={value} onChange={e => { onChange(e.target.value); setOpen(true); }} onFocus={() => value && setOpen(true)}
        placeholder={placeholder} disabled={disabled} className="h-8 text-sm" />
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 w-full max-h-48 overflow-auto bg-popover border border-border rounded-md shadow-lg mt-1">
          {suggestions.map(s => (
            <div key={s.id} className="px-3 py-2 text-sm hover:bg-accent cursor-pointer flex flex-col"
              onClick={() => { onSelect(s); setOpen(false); }}>
              <span className="font-medium">{s.name}</span>
              <span className="text-xs text-muted-foreground">{s.code} — {s.specification} — {s.manufacturer}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BOMSuggestInput({ value, onChange, onSelect, suggestions, placeholder }: {
  value: string; onChange: (v: string) => void; onSelect: (item: BOMMaster) => void;
  suggestions: BOMMaster[]; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Input value={value} onChange={e => { onChange(e.target.value); setOpen(true); }} onFocus={() => value && setOpen(true)}
        placeholder={placeholder} className="h-8 text-sm" />
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 w-full max-h-48 overflow-auto bg-popover border border-border rounded-md shadow-lg mt-1">
          {suggestions.map(s => (
            <div key={s.id} className="px-3 py-2 text-sm hover:bg-accent cursor-pointer"
              onClick={() => { onSelect(s); setOpen(false); }}>
              <span className="font-medium">{s.code}</span> — {s.product}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BOMPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<BOMMaster[]>([]);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'master' | 'list'>('list');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bomDetails, setBomDetails] = useState<Record<string, BOMDetail[]>>({});
  const [bomChildRefs, setBomChildRefs] = useState<Record<string, BOMChildRef[]>>({});
  const [preset, setPreset] = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingBOM, setEditingBOM] = useState<BOMMaster | null>(null);

  // Form state
  const [formProduct, setFormProduct] = useState('');
  const [formCustomer, setFormCustomer] = useState('');
  const [formVersion, setFormVersion] = useState('v1.0');
  const [formChildBOMs, setFormChildBOMs] = useState<FormChildBOM[]>([emptyChildBOM()]);
  const [formMaterials, setFormMaterials] = useState<FormMaterial[]>([emptyMaterial()]);

  // Suggest states (kept for BOM suggest only)
  const [bomSuggestions, setBomSuggestions] = useState<Record<string, BOMMaster[]>>({});

  const loadData = useCallback(async () => {
    const res = await getBOMs({ page, pageSize: 10, status: statusFilter !== 'all' ? statusFilter : undefined, keyword: search || undefined });
    setData(res.data);
    setTotalPages(res.pagination.totalPages);
    setTotalCount(res.pagination.totalCount);
  }, [page, statusFilter, search]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    if (!bomDetails[id]) {
      const [detRes, childRes] = await Promise.all([getBOMDetail(id), getBOMChildRefs(id)]);
      setBomDetails(prev => ({ ...prev, [id]: detRes.data }));
      setBomChildRefs(prev => ({ ...prev, [id]: childRes.data }));
    }
    setExpandedId(id);
  };

  const handleMasterClick = async (row: BOMMaster) => {
    if (viewMode === 'master') {
      // Load detail and show in form for editing
      const [detRes, childRes] = await Promise.all([getBOMDetail(row.id), getBOMChildRefs(row.id)]);
      setEditingBOM(row);
      setFormProduct(row.product);
      setFormCustomer(row.customer);
      setFormVersion(row.version);
      setFormChildBOMs(childRes.data.length > 0
        ? childRes.data.map(c => ({ _key: crypto.randomUUID(), bomCode: c.bomCode, bomName: c.bomName, quantity: String(c.quantity), unit: c.unit, note: c.note }))
        : [emptyChildBOM()]);
      setFormMaterials(detRes.data.length > 0
        ? detRes.data.map(d => ({ _key: crypto.randomUUID(), materialCode: d.materialCode, materialName: d.materialName, specification: d.specification, unit: d.unit, quantity: String(d.quantity), manufacturer: '', note: d.note }))
        : [emptyMaterial()]);
      setShowForm(true);
    }
  };

  const handleCreate = () => {
    setEditingBOM(null);
    setFormProduct(''); setFormCustomer(''); setFormVersion('v1.0');
    setFormChildBOMs([emptyChildBOM()]);
    setFormMaterials([emptyMaterial()]);
    setShowForm(true);
  };

  const handleCloseForm = () => { setShowForm(false); setEditingBOM(null); };

  const handleSave = () => {
    toast.success(editingBOM ? t('common.edit') + ' BOM ' + t('errors.success') : t('bom.createBOM') + ' ' + t('errors.success'));
    setShowForm(false);
    setEditingBOM(null);
  };

  // Material suggest handler using SuggestInputText callbacks
  const handleMatFieldChange = (index: number, field: keyof FormMaterial, value: string) => {
    const updated = [...formMaterials];
    updated[index] = { ...updated[index], [field]: value };
    // Clear materialCode when name changes manually
    if (field === 'materialName') {
      updated[index].materialCode = '';
    }
    setFormMaterials(updated);
  };

  const handleMatSuggestSelect = (index: number, field: keyof FormMaterial, item: SuggestData) => {
    const updated = [...formMaterials];
    if (field === 'materialName') {
      updated[index] = { ...updated[index], materialName: item.name, materialCode: item.uuid };
    } else {
      updated[index] = { ...updated[index], [field]: item.name };
    }
    setFormMaterials(updated);
  };

  // BOM suggest handler
  const handleBomNameChange = async (key: string, value: string, index: number) => {
    const updated = [...formChildBOMs];
    updated[index] = { ...updated[index], bomName: value, bomCode: '' };
    setFormChildBOMs(updated);
    if (value.length >= 1) {
      const res = await searchBOMs(value);
      setBomSuggestions(prev => ({ ...prev, [key]: res.data }));
    } else {
      setBomSuggestions(prev => ({ ...prev, [key]: [] }));
    }
  };

  const handleBomSelect = (key: string, bom: BOMMaster, index: number) => {
    const updated = [...formChildBOMs];
    updated[index] = { ...updated[index], bomCode: bom.code, bomName: bom.product };
    setFormChildBOMs(updated);
    setBomSuggestions(prev => ({ ...prev, [key]: [] }));
  };

  // Add rows
  const isChildBOMRowComplete = (row: FormChildBOM) => row.bomName && row.quantity;
  const isMaterialRowComplete = (row: FormMaterial) => row.materialName && row.quantity && row.unit;

  const addChildBOMRow = () => {
    const last = formChildBOMs[formChildBOMs.length - 1];
    if (last && !isChildBOMRowComplete(last)) { toast.warning(t('bom.fillAllFields')); return; }
    setFormChildBOMs([...formChildBOMs, emptyChildBOM()]);
  };

  const addMaterialRow = () => {
    const last = formMaterials[formMaterials.length - 1];
    if (last && !isMaterialRowComplete(last)) { toast.warning(t('bom.fillAllFields')); return; }
    setFormMaterials([...formMaterials, emptyMaterial()]);
  };

  const statuses = ['all', 'draft', 'pending', 'in_progress', 'approved', 'completed'];

  const renderBOMDetailTable = (details: BOMDetail[], childRefs: BOMChildRef[]) => (
    <div className="bg-muted/30 p-4 border-t border-border space-y-4">
      {childRefs.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 text-foreground">{t('bom.childBOMs')} ({childRefs.length})</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('bom.bomCode')}</TableHead>
                <TableHead>{t('bom.bomName')}</TableHead>
                <TableHead className="text-right">{t('bom.quantity')}</TableHead>
                <TableHead>{t('bom.unit')}</TableHead>
                <TableHead>{t('bom.note')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {childRefs.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-sm">{c.bomCode}</TableCell>
                  <TableCell>{c.bomName}</TableCell>
                  <TableCell className="text-right font-mono"><NumberDisplay value={c.quantity} /></TableCell>
                  <TableCell>{c.unit}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.note}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <div>
        <h4 className="text-sm font-semibold mb-2 text-foreground">{t('bom.materialList')} ({details.length})</h4>
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
    </div>
  );

  const renderForm = () => (
    <Card className="industrial-shadow border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{editingBOM ? t('bom.editBOM') + ': ' + editingBOM.code : t('bom.createBOM')}</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCloseForm}><X className="h-4 w-4 mr-1" />{t('common.cancel')}</Button>
            <Button size="sm" onClick={handleSave}><Save className="h-4 w-4 mr-1" />{t('bom.saveBOM')}</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic info */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">{t('bom.product')}</label>
            <Input value={formProduct} onChange={e => setFormProduct(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">{t('bom.customer')}</label>
            <Input value={formCustomer} onChange={e => setFormCustomer(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">{t('bom.version')}</label>
            <Input value={formVersion} onChange={e => setFormVersion(e.target.value)} />
          </div>
        </div>

        {/* Child BOMs */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">{t('bom.childBOMs')}</h3>
            <Button variant="outline" size="sm" onClick={addChildBOMRow}><Plus className="h-3 w-3 mr-1" />{t('bom.addRow')}</Button>
          </div>
          <div className="border border-border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">{t('bom.bomCode')}</TableHead>
                  <TableHead>{t('bom.bomName')}</TableHead>
                  <TableHead className="w-[100px]">{t('bom.quantity')}</TableHead>
                  <TableHead className="w-[100px]">{t('bom.unit')}</TableHead>
                  <TableHead>{t('bom.note')}</TableHead>
                  <TableHead className="w-[80px]">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formChildBOMs.map((row, i) => (
                  <TableRow key={row._key}>
                    <TableCell className="p-1"><Input value={row.bomCode} disabled className="h-8 text-sm font-mono bg-muted/50" /></TableCell>
                    <TableCell className="p-1">
                      <BOMSuggestInput value={row.bomName} onChange={v => handleBomNameChange(row._key, v, i)}
                        onSelect={b => handleBomSelect(row._key, b, i)} suggestions={bomSuggestions[row._key] || []}
                        placeholder={t('bom.bomName')} />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input type="number" value={row.quantity} onChange={e => { const u = [...formChildBOMs]; u[i] = { ...u[i], quantity: e.target.value }; setFormChildBOMs(u); }} className="h-8 text-sm" />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input value={row.unit} onChange={e => { const u = [...formChildBOMs]; u[i] = { ...u[i], unit: e.target.value }; setFormChildBOMs(u); }} className="h-8 text-sm" />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input value={row.note} onChange={e => { const u = [...formChildBOMs]; u[i] = { ...u[i], note: e.target.value }; setFormChildBOMs(u); }} className="h-8 text-sm" />
                    </TableCell>
                    <TableCell className="p-1">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFormChildBOMs([...formChildBOMs, { ...row, _key: crypto.randomUUID() }])}><Copy className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => formChildBOMs.length > 1 && setFormChildBOMs(formChildBOMs.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Materials */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">{t('bom.materialList')}</h3>
            <Button variant="outline" size="sm" onClick={addMaterialRow}><Plus className="h-3 w-3 mr-1" />{t('bom.addRow')}</Button>
          </div>
          <div className="border border-border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">{t('bom.materialCode')}</TableHead>
                  <TableHead>{t('bom.materialName')}</TableHead>
                  <TableHead>{t('bom.specification')}</TableHead>
                  <TableHead className="w-[100px]">{t('bom.unit')}</TableHead>
                  <TableHead className="w-[100px]">{t('bom.quantity')}</TableHead>
                  <TableHead>{t('bom.manufacturer')}</TableHead>
                  <TableHead>{t('bom.note')}</TableHead>
                  <TableHead className="w-[80px]">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formMaterials.map((row, i) => (
                  <TableRow key={row._key}>
                    <TableCell className="p-1"><Input value={row.materialCode} disabled className="h-8 text-sm font-mono bg-muted/50" /></TableCell>
                    <TableCell className="p-1">
                      <SuggestInputText value={row.materialName} selectedUuid={row.materialCode}
                        onChange={v => handleMatFieldChange(i, 'materialName', v)}
                        onSelect={item => handleMatSuggestSelect(i, 'materialName', item)}
                        type="material" placeholder={t('bom.materialName')} />
                    </TableCell>
                    <TableCell className="p-1">
                      <SuggestInputText value={row.specification}
                        onChange={v => handleMatFieldChange(i, 'specification', v)}
                        onSelect={item => handleMatSuggestSelect(i, 'specification', item)}
                        type="specification" placeholder={t('bom.specification')} />
                    </TableCell>
                    <TableCell className="p-1">
                      <SuggestInputText value={row.unit}
                        onChange={v => handleMatFieldChange(i, 'unit', v)}
                        onSelect={item => handleMatSuggestSelect(i, 'unit', item)}
                        type="unit" placeholder={t('bom.unit')} />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input type="number" value={row.quantity} onChange={e => { const u = [...formMaterials]; u[i] = { ...u[i], quantity: e.target.value }; setFormMaterials(u); }} className="h-8 text-sm" />
                    </TableCell>
                    <TableCell className="p-1">
                      <SuggestInputText value={row.manufacturer}
                        onChange={v => handleMatFieldChange(i, 'manufacturer', v)}
                        onSelect={item => handleMatSuggestSelect(i, 'manufacturer', item)}
                        type="manufacturer" placeholder={t('bom.manufacturer')} />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input value={row.note} onChange={e => { const u = [...formMaterials]; u[i] = { ...u[i], note: e.target.value }; setFormMaterials(u); }} className="h-8 text-sm" />
                    </TableCell>
                    <TableCell className="p-1">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFormMaterials([...formMaterials, { ...row, _key: crypto.randomUUID() }])}><Copy className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => formMaterials.length > 1 && setFormMaterials(formMaterials.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('bom.title')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4 mr-1" />{t('bom.importExcel')}</Button>
          <Button onClick={handleCreate}><Plus className="h-4 w-4 mr-1" />{t('common.create')}</Button>
        </div>
      </div>

      {showForm && renderForm()}

      <Card className="industrial-shadow">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t('common.search')} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <DatePresetSelect value={preset} onChange={(p) => { setPreset(p); setPage(1); }} showAll />
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {statuses.map(s => (
                  <SelectItem key={s} value={s}>{s === 'all' ? t('common.all') : t(`common.${s === 'in_progress' ? 'inProgress' : s}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <TableHead>{t('bom.createdDate')}</TableHead>
                <TableHead>{t('bom.completedDate')}</TableHead>
                <TableHead className="text-center">{t('bom.childBomCount')}</TableHead>
                <TableHead>{t('bom.status')}</TableHead>
                <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow><TableCell colSpan={viewMode === 'list' ? 10 : 9} className="text-center py-8 text-muted-foreground">{t('common.noData')}</TableCell></TableRow>
              ) : data.map(row => (
                <Collapsible key={row.id} open={expandedId === row.id} asChild>
                  <>
                    <TableRow className="cursor-pointer hover:bg-muted/50"
                      onClick={() => viewMode === 'list' ? handleExpand(row.id) : handleMasterClick(row)}>
                      {viewMode === 'list' && (
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); handleExpand(row.id); }}>
                              {expandedId === row.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                      )}
                      <TableCell className="font-mono text-sm font-medium">{row.code}</TableCell>
                      <TableCell>{row.product}</TableCell>
                      <TableCell className="text-muted-foreground">{row.customer}</TableCell>
                      <TableCell className="font-mono text-sm">{row.version}</TableCell>
                      <TableCell className="text-sm">{row.createdDate}</TableCell>
                      <TableCell className="text-sm">{row.completedDate || '—'}</TableCell>
                      <TableCell className="text-center">
                        {row.childBomCount > 0 ? <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold">{row.childBomCount}</span> : '—'}
                      </TableCell>
                      <TableCell><StatusBadge status={row.status} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMasterClick(row)} title={t('common.edit')}><Edit className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title={t('bom.clone')}><Copy className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title={t('common.delete')}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {viewMode === 'list' && (
                      <CollapsibleContent asChild>
                        <tr>
                          <td colSpan={10} className="p-0">
                            {bomDetails[row.id] && renderBOMDetailTable(bomDetails[row.id], bomChildRefs[row.id] || [])}
                          </td>
                        </tr>
                      </CollapsibleContent>
                    )}
                  </>
                </Collapsible>
              ))}
            </TableBody>
          </Table>
          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-sm text-muted-foreground">{t('common.total')}: {totalCount} {t('common.rows')}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>←</Button>
              <span className="text-sm">{t('common.page')} {page} {t('common.of')} {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>→</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Excel Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('bom.importTitle')}</DialogTitle>
            <DialogDescription>{t('bom.importDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">{t('bom.productOrder')}</label>
              <Select><SelectTrigger><SelectValue placeholder={t('bom.productOrder')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PO-2026-0120">PO-2026-0120 — Khung thép KT-500</SelectItem>
                  <SelectItem value="PO-2026-0121">PO-2026-0121 — Bệ máy BM-200</SelectItem>
                  <SelectItem value="PO-2026-0122">PO-2026-0122 — Trục khuỷu TK-100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('bom.product')}</label>
              <Select><SelectTrigger><SelectValue placeholder={t('bom.product')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="KT-500">Khung thép KT-500</SelectItem>
                  <SelectItem value="BM-200">Bệ máy BM-200</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('bom.selectFile')}</label>
              <Input type="file" accept=".xlsx,.xls" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              toast.info(t('bom.downloadTemplate'));
            }}><Download className="h-4 w-4 mr-1" />{t('bom.downloadTemplate')}</Button>
            <Button onClick={() => { toast.success(t('bom.importExcel') + ' ' + t('errors.success')); setImportOpen(false); }}><Upload className="h-4 w-4 mr-1" />{t('common.import')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
