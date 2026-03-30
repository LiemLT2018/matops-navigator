import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getPurchaseRequests, getPRItems, getMaterialStockInfo, getBOMAllMaterials, type PurchaseRequest, type PRItem, type MaterialStockInfo, type BOMFlatMaterial } from '@/api/mockApi';
import { formatCurrency } from '@/utils/formatNumber';
import { NumberDisplay } from '@/components/NumberDisplay';
import { Plus, Search, Upload, Download, Edit, Copy, Trash2, X, Save, ChevronDown, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { DatePresetSelect } from '@/components/DatePresetSelect';
import { SuggestInputText } from '@/components/SuggestInputText';
import type { SuggestData } from '@/api/suggestApi';
import type { DatePresetKey } from '@/types/api';
import { toast } from 'sonner';
import { ExcelImportPreview } from '@/components/ExcelImportPreview';
import type { ParsedRow } from '@/utils/excelParser';

type DateFilter = DatePresetKey | 'all';

interface FormMaterial {
  _key: string;
  materialCode: string;
  materialName: string;
  materialUuid: string;
  specification: string;
  unit: string;
  quantity: string;
  manufacturer: string;
  estimatedPrice: string;
  stockQty: number | null;
  lastSupplier: string;
  lastPrice: number | null;
  note: string;
}

const emptyMaterial = (): FormMaterial => ({
  _key: crypto.randomUUID(), materialCode: '', materialName: '', materialUuid: '',
  specification: '', unit: '', quantity: '', manufacturer: '', estimatedPrice: '',
  stockQty: null, lastSupplier: '', lastPrice: null, note: '',
});

const isMaterialRowComplete = (row: FormMaterial) => row.materialName && row.quantity && row.unit;

export default function PurchaseRequestsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<PurchaseRequest[]>([]);
  const [search, setSearch] = useState('');
  const [preset, setPreset] = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPR, setEditingPR] = useState<PurchaseRequest | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [prItems, setPrItems] = useState<Record<string, PRItem[]>>({});
  const [matImportOpen, setMatImportOpen] = useState(false);

  // Form state
  const [formRequester, setFormRequester] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formPriority, setFormPriority] = useState('normal');
  const [formBomRefs, setFormBomRefs] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formMaterials, setFormMaterials] = useState<FormMaterial[]>([emptyMaterial()]);

  const statuses = ['all', 'draft', 'pending', 'approved', 'rejected'];

  const loadData = useCallback(async () => {
    const res = await getPurchaseRequests({ page, pageSize: 10, status: statusFilter !== 'all' ? statusFilter : undefined, keyword: search || undefined });
    setData(res.data);
    setTotalPages(res.pagination.totalPages);
    setTotalCount(res.pagination.totalCount);
  }, [page, statusFilter, search]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = () => {
    setEditingPR(null);
    setFormRequester(''); setFormDepartment(''); setFormPriority('normal');
    setFormBomRefs(''); setFormNote('');
    setFormMaterials([emptyMaterial()]);
    setShowForm(true);
  };

  const handleEdit = async (row: PurchaseRequest) => {
    setEditingPR(row);
    setFormRequester(row.requester);
    setFormDepartment(row.department);
    setFormPriority(row.priority);
    setFormBomRefs(row.bomRefs.join(', '));
    setFormNote(row.note);
    const res = await getPRItems(row.id);
    setFormMaterials(res.data.length > 0
      ? res.data.map(d => ({
          _key: crypto.randomUUID(), materialCode: d.materialCode, materialName: d.materialName,
          materialUuid: d.materialCode, specification: d.specification, unit: d.unit,
          quantity: String(d.quantity), manufacturer: d.manufacturer,
          estimatedPrice: String(d.estimatedPrice), stockQty: d.stockQty,
          lastSupplier: d.lastSupplier, lastPrice: d.lastPrice, note: d.note,
        }))
      : [emptyMaterial()]);
    setShowForm(true);
  };

  const handleCloseForm = () => { setShowForm(false); setEditingPR(null); };
  const handleSave = () => {
    toast.success(editingPR ? t('common.edit') + ' PR ' + t('errors.success') : t('purchasing.request.createPR') + ' ' + t('errors.success'));
    setShowForm(false); setEditingPR(null);
  };

  const handleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    if (!prItems[id]) {
      const res = await getPRItems(id);
      setPrItems(prev => ({ ...prev, [id]: res.data }));
    }
    setExpandedId(id);
  };

  // Material form handlers
  const handleMatFieldChange = (index: number, field: keyof FormMaterial, value: string) => {
    const updated = [...formMaterials];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'materialName') {
      updated[index].materialCode = '';
      updated[index].materialUuid = '';
      updated[index].stockQty = null;
      updated[index].lastSupplier = '';
      updated[index].lastPrice = null;
    }
    setFormMaterials(updated);
  };

  const handleMatSelect = async (index: number, field: keyof FormMaterial, item: SuggestData) => {
    const updated = [...formMaterials];
    if (field === 'materialName') {
      updated[index] = { ...updated[index], materialName: item.name, materialCode: item.uuid, materialUuid: item.uuid };
      setFormMaterials(updated);
      // Fetch stock info
      const res = await getMaterialStockInfo(item.uuid);
      if (res.data) {
        const info = res.data;
        const u = [...updated];
        u[index] = {
          ...u[index],
          specification: info.specification || u[index].specification,
          unit: info.unit || u[index].unit,
          manufacturer: info.manufacturer || u[index].manufacturer,
          stockQty: info.currentStock,
          lastSupplier: info.lastSupplier,
          lastPrice: info.lastPrice,
          estimatedPrice: String(info.lastPrice || u[index].estimatedPrice),
        };
        setFormMaterials(u);
      }
    } else {
      updated[index] = { ...updated[index], [field]: item.name };
      setFormMaterials(updated);
    }
  };

  const addMaterialRow = () => {
    const last = formMaterials[formMaterials.length - 1];
    if (last && !isMaterialRowComplete(last)) { toast.warning(t('bom.fillAllFields')); return; }
    setFormMaterials([...formMaterials, emptyMaterial()]);
  };

  const handleLastFieldTab = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && !e.shiftKey && index === formMaterials.length - 1) {
      const last = formMaterials[formMaterials.length - 1];
      if (isMaterialRowComplete(last)) {
        e.preventDefault();
        const newRow = emptyMaterial();
        setFormMaterials(prev => [...prev, newRow]);
        // Focus first input of new row after render
        setTimeout(() => {
          const table = document.querySelector('[data-pr-material-table]');
          if (table) {
            const rows = table.querySelectorAll('tbody tr');
            const lastRow = rows[rows.length - 1];
            const firstInput = lastRow?.querySelector('input:not([disabled])');
            if (firstInput) (firstInput as HTMLElement).focus();
          }
        }, 50);
      }
    }
  }, [formMaterials]);

  // BOM suggest for importing materials
  const [bomSuggestValue, setBomSuggestValue] = useState('');

  const handleBomSuggestSelect = useCallback(async (item: SuggestData) => {
    setBomSuggestValue('');
    // Find bomId from suggest item uuid - map bom codes to IDs
    const bomCodeToId: Record<string, string> = {
      'bom-001': '1', 'bom-002': '2', 'bom-003': '3', 'bom-004': '4',
      'bom-005': '5', 'bom-006': '6', 'bom-007': '7', 'bom-008': '8',
    };
    const bomId = bomCodeToId[item.uuid] || '1';
    try {
      const res = await getBOMAllMaterials(bomId);
      if (res.data.length === 0) { toast.info(t('common.noData')); return; }

      setFormMaterials(prev => {
        // Remove empty rows
        let current = prev.filter(r => r.materialName || r.quantity);
        
        for (const bm of res.data) {
          const existIdx = current.findIndex(r => r.materialCode === bm.materialCode && r.materialCode);
          if (existIdx >= 0) {
            // Merge: add quantity
            const existing = current[existIdx];
            const newQty = Number(existing.quantity || 0) + bm.quantity;
            const newEstPrice = bm.estimatedPrice * newQty;
            current[existIdx] = { ...existing, quantity: String(newQty), estimatedPrice: String(newEstPrice) };
          } else {
            const totalPrice = bm.estimatedPrice * bm.quantity;
            current.push({
              _key: crypto.randomUUID(),
              materialCode: bm.materialCode,
              materialName: bm.materialName,
              materialUuid: bm.materialUuid,
              specification: bm.specification,
              unit: bm.unit,
              quantity: String(bm.quantity),
              manufacturer: bm.manufacturer,
              estimatedPrice: String(bm.estimatedPrice),
              stockQty: null,
              lastSupplier: '',
              lastPrice: null,
              note: '',
            });
          }
        }

        if (current.length === 0) current.push(emptyMaterial());
        return current;
      });

      // Fetch stock info for all materials
      for (const bm of res.data) {
        if (bm.materialUuid) {
          const stockRes = await getMaterialStockInfo(bm.materialUuid);
          if (stockRes.data) {
            setFormMaterials(prev => prev.map(r => 
              r.materialCode === bm.materialCode
                ? { ...r, stockQty: stockRes.data!.currentStock, lastSupplier: stockRes.data!.lastSupplier, lastPrice: stockRes.data!.lastPrice }
                : r
            ));
          }
        }
      }

      toast.success(`Đã nhập ${res.data.length} vật tư từ BOM ${item.name}`);
    } catch {
      toast.error('Lỗi khi lấy dữ liệu BOM');
    }
  }, [t]);

  const renderPRDetailTable = (items: PRItem[]) => (
    <div className="bg-muted/30 p-4 border-t border-border">
      <h4 className="text-sm font-semibold mb-2 text-foreground">{t('purchasing.request.materialList')} ({items.length})</h4>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('bom.materialCode')}</TableHead>
            <TableHead>{t('bom.materialName')}</TableHead>
            <TableHead>{t('bom.specification')}</TableHead>
            <TableHead>{t('bom.unit')}</TableHead>
            <TableHead className="text-right">{t('purchasing.request.requestQty')}</TableHead>
            <TableHead className="text-right">{t('purchasing.request.stockQty')}</TableHead>
            <TableHead className="text-right">{t('purchasing.request.estimatedPrice')}</TableHead>
            <TableHead>{t('purchasing.request.lastSupplier')}</TableHead>
            <TableHead>{t('bom.manufacturer')}</TableHead>
            <TableHead>{t('bom.note')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(d => (
            <TableRow key={d.id}>
              <TableCell className="font-mono text-sm">{d.materialCode || <Badge variant="outline" className="text-xs">{t('purchasing.request.newItem')}</Badge>}</TableCell>
              <TableCell>{d.materialName}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{d.specification}</TableCell>
              <TableCell>{d.unit}</TableCell>
              <TableCell className="text-right font-mono"><NumberDisplay value={d.quantity} /></TableCell>
              <TableCell className="text-right font-mono"><NumberDisplay value={d.stockQty} /></TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(d.estimatedPrice)}</TableCell>
              <TableCell className="text-sm">{d.lastSupplier || '—'}</TableCell>
              <TableCell className="text-sm">{d.manufacturer || '—'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{d.note}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const renderForm = () => (
    <Card className="industrial-shadow border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{editingPR ? t('purchasing.request.editPR') + ': ' + editingPR.code : t('purchasing.request.createPR')}</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCloseForm}><X className="h-4 w-4 mr-1" />{t('common.cancel')}</Button>
            <Button size="sm" onClick={handleSave}><Save className="h-4 w-4 mr-1" />{t('common.save')}</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">{t('purchasing.request.requester')}</label>
            <Input value={formRequester} onChange={e => setFormRequester(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">{t('purchasing.request.department')}</label>
            <Input value={formDepartment} onChange={e => setFormDepartment(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">{t('purchasing.request.priority')}</label>
            <Select value={formPriority} onValueChange={setFormPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t('purchasing.request.priorityLow')}</SelectItem>
                <SelectItem value="normal">{t('purchasing.request.priorityNormal')}</SelectItem>
                <SelectItem value="high">{t('purchasing.request.priorityHigh')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">{t('purchasing.request.bomRef')}</label>
            <Input value={formBomRefs} onChange={e => setFormBomRefs(e.target.value)} placeholder="BOM-0231, BOM-0232" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1 block">{t('bom.note')}</label>
          <Input value={formNote} onChange={e => setFormNote(e.target.value)} />
        </div>

        {/* Material List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">{t('purchasing.request.materialList')}</h3>
            <div className="flex items-center gap-2">
              <div className="w-[250px]">
                <SuggestInputText
                  value={bomSuggestValue}
                  onChange={setBomSuggestValue}
                  onSelect={handleBomSuggestSelect}
                  type="bom"
                  placeholder={t('purchasing.request.inputFromBom')}
                />
              </div>
              <Button variant="outline" size="sm" onClick={addMaterialRow}><Plus className="h-3 w-3 mr-1" />{t('bom.addRow')}</Button>
            </div>
          </div>
          <div className="border border-border rounded-md overflow-x-auto" data-pr-material-table>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">{t('bom.materialCode')}</TableHead>
                  <TableHead className="min-w-[160px]">{t('bom.materialName')}</TableHead>
                  <TableHead className="min-w-[120px]">{t('bom.specification')}</TableHead>
                  <TableHead className="w-[100px]">{t('bom.unit')}</TableHead>
                  <TableHead className="w-[90px]">{t('bom.quantity')}</TableHead>
                  <TableHead className="min-w-[120px]">{t('bom.manufacturer')}</TableHead>
                  <TableHead className="w-[110px]">{t('purchasing.request.estimatedPrice')}</TableHead>
                  <TableHead className="w-[80px]">{t('purchasing.request.stockQty')}</TableHead>
                  <TableHead className="min-w-[120px]">{t('purchasing.request.lastSupplier')}</TableHead>
                  <TableHead className="w-[90px]">{t('purchasing.request.totalAmountCol')}</TableHead>
                  <TableHead>{t('bom.note')}</TableHead>
                  <TableHead className="w-[80px]">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formMaterials.map((row, i) => (
                  <TableRow key={row._key}>
                    <TableCell className="p-1"><Input value={row.materialCode} disabled className="h-8 text-sm font-mono bg-muted/50" /></TableCell>
                    <TableCell className="p-1">
                      <SuggestInputText value={row.materialName} selectedUuid={row.materialUuid}
                        onChange={v => handleMatFieldChange(i, 'materialName', v)}
                        onSelect={item => handleMatSelect(i, 'materialName', item)}
                        type="material" placeholder={t('bom.materialName')} />
                    </TableCell>
                    <TableCell className="p-1">
                      <SuggestInputText value={row.specification}
                        onChange={v => handleMatFieldChange(i, 'specification', v)}
                        onSelect={item => handleMatSelect(i, 'specification', item)}
                        type="specification" placeholder={t('bom.specification')} />
                    </TableCell>
                    <TableCell className="p-1">
                      <SuggestInputText value={row.unit}
                        onChange={v => handleMatFieldChange(i, 'unit', v)}
                        onSelect={item => handleMatSelect(i, 'unit', item)}
                        type="unit" placeholder={t('bom.unit')} />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input type="number" value={row.quantity}
                        onChange={e => handleMatFieldChange(i, 'quantity', e.target.value)}
                        className="h-8 text-sm" />
                    </TableCell>
                    <TableCell className="p-1">
                      <SuggestInputText value={row.manufacturer}
                        onChange={v => handleMatFieldChange(i, 'manufacturer', v)}
                        onSelect={item => handleMatSelect(i, 'manufacturer', item)}
                        type="manufacturer" placeholder={t('bom.manufacturer')} />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input type="number" value={row.estimatedPrice}
                        onChange={e => handleMatFieldChange(i, 'estimatedPrice', e.target.value)}
                        className="h-8 text-sm" />
                    </TableCell>
                    <TableCell className="p-1 text-center">
                      <span className="text-sm font-mono">{row.stockQty !== null ? row.stockQty : '—'}</span>
                    </TableCell>
                    <TableCell className="p-1">
                      <span className="text-sm">{row.lastSupplier || '—'}</span>
                    </TableCell>
                    <TableCell className="p-1 text-right">
                      <span className="text-sm font-mono">{row.quantity && row.estimatedPrice ? formatCurrency(Number(row.quantity) * Number(row.estimatedPrice)) : '—'}</span>
                    </TableCell>
                    <TableCell className="p-1">
                      <Input value={row.note}
                        onChange={e => handleMatFieldChange(i, 'note', e.target.value)}
                        onKeyDown={e => handleLastFieldTab(i, e)}
                        className="h-8 text-sm" />
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
        <h1 className="text-2xl font-bold">{t('purchasing.request.title')}</h1>
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
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>{t('purchasing.request.code')}</TableHead>
                <TableHead>{t('purchasing.request.requester')}</TableHead>
                <TableHead>{t('purchasing.request.department')}</TableHead>
                <TableHead>{t('purchasing.request.date')}</TableHead>
                <TableHead>{t('purchasing.request.bomRef')}</TableHead>
                <TableHead className="text-right">{t('purchasing.order.totalAmount')}</TableHead>
                <TableHead>{t('purchasing.request.priority')}</TableHead>
                <TableHead>{t('purchasing.request.status')}</TableHead>
                <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">{t('common.noData')}</TableCell></TableRow>
              ) : data.map(row => (
                <Collapsible key={row.id} open={expandedId === row.id} asChild>
                  <>
                    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => handleExpand(row.id)}>
                      <TableCell>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); handleExpand(row.id); }}>
                            {expandedId === row.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                      </TableCell>
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
                      <TableCell>
                        <Badge variant={row.priority === 'high' ? 'destructive' : row.priority === 'low' ? 'secondary' : 'outline'} className="text-xs">
                          {t(`purchasing.request.priority${row.priority.charAt(0).toUpperCase() + row.priority.slice(1)}`)}
                        </Badge>
                      </TableCell>
                      <TableCell><StatusBadge status={row.status} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(row)} title={t('common.edit')}><Edit className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title={t('bom.clone')}><Copy className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title={t('common.delete')}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    <CollapsibleContent asChild>
                      <tr>
                        <td colSpan={10} className="p-0">
                          {prItems[row.id] && renderPRDetailTable(prItems[row.id])}
                        </td>
                      </tr>
                    </CollapsibleContent>
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
            <DialogTitle>{t('purchasing.request.importTitle')}</DialogTitle>
            <DialogDescription>{t('purchasing.request.importDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">{t('purchasing.request.bomRef')}</label>
              <Input placeholder="BOM-0231" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('purchasing.request.selectFile')}</label>
              <Input type="file" accept=".xlsx,.xls" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => toast.info(t('purchasing.request.downloadTemplate'))}>
              <Download className="h-4 w-4 mr-1" />{t('purchasing.request.downloadTemplate')}
            </Button>
            <Button onClick={() => { toast.success(t('common.import') + ' ' + t('errors.success')); setImportOpen(false); }}>
              <Upload className="h-4 w-4 mr-1" />{t('common.import')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
