import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, Plus, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  readExcelFile, parseExcelRows, parseRow, getSuggestions, getSuggestionsWithScore, generateTemplateExcel,
  genMaterialCodeApi, addMaterialApi, addSpecificationApi, addUnitApi, addManufacturerApi,
  removeViDiacritics, similarity,
  type ParsedRow, type ImportDictionary, type ParseRule, type DictItem,
} from '@/utils/excelParser';

interface ExcelImportPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importType: 'bom_import' | 'purchase_request_import';
  onConfirm: (rows: ParsedRow[]) => void;
}

type FocusField = 'material' | 'specification' | 'unit' | 'manufacturer';

// Quick Add dialog types
type QuickAddType = 'material' | 'specification' | 'unit' | 'manufacturer';

interface QuickAddState {
  open: boolean;
  type: QuickAddType;
  rowIndex: number;
  defaultName: string;
}

export function ExcelImportPreview({ open, onOpenChange, importType, onConfirm }: ExcelImportPreviewProps) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [dictionary, setDictionary] = useState<ImportDictionary | null>(null);
  const [rules, setRules] = useState<ParseRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedCell, setFocusedCell] = useState<{ rowIdx: number; field: FocusField } | null>(null);
  const [quickAdd, setQuickAdd] = useState<QuickAddState>({ open: false, type: 'material', rowIndex: 0, defaultName: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick add form state
  const [qaMatUuid, setQaMatUuid] = useState('');
  const [qaMatName, setQaMatName] = useState('');
  const [qaMatNormalized, setQaMatNormalized] = useState('');
  const [qaMatAliases, setQaMatAliases] = useState('');
  const [qaSpecValue, setQaSpecValue] = useState('');
  const [qaUnitName, setQaUnitName] = useState('');
  const [qaMfrCode, setQaMfrCode] = useState('');
  const [qaMfrName, setQaMfrName] = useState('');

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
      const textRows = await readExcelFile(file);
      if (textRows.length === 0) {
        toast.warning(t('excelImport.noData'));
        setIsLoading(false);
        return;
      }
      const result = await parseExcelRows(textRows, importType);
      setRows(result.parsedRows);
      setDictionary(result.dictionary);
      setRules(result.rules);
      toast.success(`${t('excelImport.parsed')} ${textRows.length} ${t('common.rows')}`);
    } catch (err) {
      toast.error(t('excelImport.readError'));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [importType, t]);

  const handleDownloadTemplate = useCallback(() => {
    generateTemplateExcel(importType === 'bom_import' ? 'bom' : 'pr');
    toast.success(t('excelImport.templateDownloaded'));
  }, [importType, t]);

  const handleConfirm = useCallback(() => {
    const importable = rows.filter(r => r.status === 'parsed' || r.status === 'partial');
    if (importable.length === 0) {
      toast.warning(t('excelImport.noImportable'));
      return;
    }
    onConfirm(importable);
    setRows([]);
    onOpenChange(false);
    toast.success(`${t('excelImport.imported')} ${importable.length} ${t('common.rows')}`);
  }, [rows, onConfirm, onOpenChange, t]);

  // Get suggestions with scores for focused cell
  const currentSuggestionsWithScore = (() => {
    if (!focusedCell || !dictionary) return [];
    const row = rows[focusedCell.rowIdx];
    if (!row) return [];
    const fieldText = (() => {
      switch (focusedCell.field) {
        case 'material': return row.materialName || row.rawText;
        case 'specification': return row.specification || row.rawText;
        case 'unit': return row.unit || row.rawText;
        case 'manufacturer': return row.manufacturer || row.rawText;
      }
    })();
    const dictItems = (() => {
      switch (focusedCell.field) {
        case 'material': return dictionary.materials;
        case 'specification': return dictionary.specifications;
        case 'unit': return dictionary.units;
        case 'manufacturer': return dictionary.manufacturers;
      }
    })();
    return getSuggestionsWithScore(fieldText, dictItems, 10);
  })();

  const handleSuggestionClick = useCallback((item: DictItem) => {
    if (!focusedCell) return;
    setRows(prev => {
      const updated = [...prev];
      const row = { ...updated[focusedCell.rowIdx] };
      switch (focusedCell.field) {
        case 'material':
          row.materialName = item.name;
          row.materialUuid = item.uuid;
          break;
        case 'specification':
          row.specification = item.name;
          break;
        case 'unit':
          row.unit = item.name;
          row.unitUuid = item.uuid;
          break;
        case 'manufacturer':
          row.manufacturer = item.name;
          row.manufacturerUuid = item.uuid;
          break;
      }
      // Re-determine status
      const hasMaterial = !!row.materialUuid;
      const hasSpec = !!row.specification;
      const hasQty = row.quantity > 0;
      const hasUnit = !!row.unit;
      if (hasMaterial && hasSpec && hasQty && hasUnit) row.status = 'parsed';
      else if (hasMaterial || hasSpec || hasQty || hasUnit) row.status = 'partial';
      else row.status = 'failed';
      updated[focusedCell.rowIdx] = row;
      return updated;
    });
    setFocusedCell(null);
  }, [focusedCell]);

  const handleCellChange = useCallback((rowIdx: number, field: FocusField, value: string) => {
    setRows(prev => {
      const updated = [...prev];
      const row = { ...updated[rowIdx] };
      switch (field) {
        case 'material': row.materialName = value; row.materialUuid = ''; break;
        case 'specification': row.specification = value; break;
        case 'unit': row.unit = value; row.unitUuid = ''; break;
        case 'manufacturer': row.manufacturer = value; row.manufacturerUuid = ''; break;
      }
      updated[rowIdx] = row;
      return updated;
    });
  }, []);

  const handleQuantityChange = useCallback((rowIdx: number, value: string) => {
    setRows(prev => {
      const updated = [...prev];
      updated[rowIdx] = { ...updated[rowIdx], quantity: parseFloat(value) || 0 };
      return updated;
    });
  }, []);

  // Quick Add handlers
  const openQuickAdd = useCallback(async (rowIdx: number, type: QuickAddType) => {
    const row = rows[rowIdx];
    let defaultName = '';
    switch (type) {
      case 'material': defaultName = row.materialName || row.rawText; break;
      case 'specification': defaultName = row.specification; break;
      case 'unit': defaultName = row.unit; break;
      case 'manufacturer': defaultName = row.manufacturer || row.rawText; break;
    }
    // Standardize name: trim, capitalize
    const stdName = defaultName.replace(/\s+/g, ' ').trim()
      .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    setQuickAdd({ open: true, type, rowIndex: rowIdx, defaultName: stdName });

    if (type === 'material') {
      const code = await genMaterialCodeApi();
      setQaMatUuid(code);
      setQaMatName(stdName);
      setQaMatNormalized(removeViDiacritics(stdName).replace(/\s+/g, ' ').trim());
      // Smart alias suggestions
      const aliases: string[] = [];
      const norm = removeViDiacritics(stdName);
      if (norm !== stdName.toLowerCase()) aliases.push(norm);
      const noSpaces = norm.replace(/\s+/g, '');
      if (noSpaces !== norm) aliases.push(noSpaces);
      setQaMatAliases(aliases.join(', '));
    } else if (type === 'specification') {
      setQaSpecValue(defaultName);
    } else if (type === 'unit') {
      setQaUnitName(stdName);
    } else if (type === 'manufacturer') {
      setQaMfrCode(removeViDiacritics(stdName).replace(/\s+/g, '').toUpperCase().slice(0, 5));
      setQaMfrName(stdName);
    }
  }, [rows]);

  const handleQuickAddSubmit = useCallback(async () => {
    const { type, rowIndex } = quickAdd;
    let newItem: DictItem | null = null;

    if (type === 'material') {
      newItem = await addMaterialApi({
        uuid: qaMatUuid, name: qaMatName,
        normalizedName: qaMatNormalized,
        aliases: qaMatAliases.split(',').map(s => s.trim()).filter(Boolean),
      });
      if (dictionary) {
        dictionary.materials.push(newItem);
      }
    } else if (type === 'specification') {
      const row = rows[rowIndex];
      if (!row.materialUuid) {
        toast.error(t('excelImport.needMaterialFirst'));
        return;
      }
      newItem = await addSpecificationApi(row.materialUuid, qaSpecValue);
      if (dictionary) dictionary.specifications.push(newItem);
    } else if (type === 'unit') {
      newItem = await addUnitApi(qaUnitName);
      if (dictionary) dictionary.units.push(newItem);
    } else if (type === 'manufacturer') {
      newItem = await addManufacturerApi(qaMfrCode, qaMfrName);
      if (dictionary) dictionary.manufacturers.push(newItem);
    }

    if (newItem) {
      // Re-match the affected row
      setRows(prev => {
        const updated = [...prev];
        const row = { ...updated[rowIndex] };
        switch (type) {
          case 'material':
            row.materialName = newItem!.name;
            row.materialUuid = newItem!.uuid;
            break;
          case 'specification':
            row.specification = newItem!.name;
            break;
          case 'unit':
            row.unit = newItem!.name;
            row.unitUuid = newItem!.uuid;
            break;
          case 'manufacturer':
            row.manufacturer = newItem!.name;
            row.manufacturerUuid = newItem!.uuid;
            break;
        }
        // Re-determine status
        const hasMaterial = !!row.materialUuid;
        const hasSpec = !!row.specification;
        const hasQty = row.quantity > 0;
        const hasUnit = !!row.unit;
        if (hasMaterial && hasSpec && hasQty && hasUnit) row.status = 'parsed';
        else if (hasMaterial || hasSpec || hasQty || hasUnit) row.status = 'partial';
        else row.status = 'failed';
        updated[rowIndex] = row;
        return updated;
      });
      toast.success(`${t('excelImport.added')} ${newItem.name}`);
    }

    setQuickAdd(prev => ({ ...prev, open: false }));
  }, [quickAdd, qaMatUuid, qaMatName, qaMatNormalized, qaMatAliases, qaSpecValue, qaUnitName, qaMfrCode, qaMfrName, dictionary, rows, t]);

  const statusBadge = (status: ParsedRow['status']) => {
    const variants: Record<string, string> = {
      parsed: 'bg-green-500/10 text-green-700 border-green-500/30',
      partial: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30',
      failed: 'bg-destructive/10 text-destructive border-destructive/30',
    };
    const labels: Record<string, string> = { parsed: 'Parsed', partial: 'Partial', failed: 'Failed' };
    return <Badge variant="outline" className={cn('text-xs', variants[status])}>{labels[status]}</Badge>;
  };

  const renderFieldCell = (rowIdx: number, field: FocusField, value: string, hasUuid: boolean) => {
    const isFocused = focusedCell?.rowIdx === rowIdx && focusedCell?.field === field;
    const needsAdd = !hasUuid && value.length > 0;
    const isSpecNeedsMaterial = field === 'specification' && !rows[rowIdx]?.materialUuid;

    return (
      <div className="relative flex items-center gap-0.5">
        <Input
          value={value}
          onChange={e => handleCellChange(rowIdx, field, e.target.value)}
          onFocus={() => setFocusedCell({ rowIdx, field })}
          className={cn(
            'h-7 text-xs',
            hasUuid && 'border-green-500/50 bg-green-500/5',
            !hasUuid && value && 'border-yellow-500/50 bg-yellow-500/5',
          )}
        />
        {needsAdd && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => {
              if (field === 'specification' && isSpecNeedsMaterial) {
                toast.warning(t('excelImport.needMaterialFirst'));
                return;
              }
              openQuickAdd(rowIdx, field);
            }}
            title={t('excelImport.quickAdd')}
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  };

  const parsedCount = rows.filter(r => r.status === 'parsed').length;
  const partialCount = rows.filter(r => r.status === 'partial').length;
  const failedCount = rows.filter(r => r.status === 'failed').length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('excelImport.title')}</DialogTitle>
            <DialogDescription>{t('excelImport.desc')}</DialogDescription>
          </DialogHeader>

          {/* File upload + template download */}
          <div className="flex items-center gap-3 pb-2 border-b border-border">
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
              {t('excelImport.selectFile')}
            </Button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileSelect} />
            <Button variant="ghost" size="sm" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-1" />{t('excelImport.downloadTemplate')}
            </Button>
            {rows.length > 0 && (
              <div className="ml-auto flex items-center gap-2 text-xs">
                <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">{parsedCount} parsed</Badge>
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/30">{partialCount} partial</Badge>
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">{failedCount} failed</Badge>
              </div>
            )}
          </div>

          {/* Suggestion chips */}
          {focusedCell && currentSuggestionsWithScore.length > 0 && (
            <div className="flex items-center gap-1 p-2 bg-muted/50 rounded-md border border-border overflow-x-auto">
              <span className="text-xs text-muted-foreground shrink-0 mr-1">{t('excelImport.suggestions')}:</span>
              {currentSuggestionsWithScore.map(({ item, score }) => (
                <button
                  key={item.uuid}
                  type="button"
                  className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium border bg-background hover:bg-primary hover:text-primary-foreground transition-colors shrink-0 cursor-pointer gap-1"
                  onClick={() => handleSuggestionClick(item)}
                >
                  <span>{item.name}</span>
                  <span className={cn(
                    'text-[10px] font-mono',
                    score >= 0.8 ? 'text-green-600' : score >= 0.5 ? 'text-yellow-600' : 'text-muted-foreground'
                  )}>
                    {Math.round(score * 100)}%
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Preview table */}
          <div className="flex-1 overflow-auto border border-border rounded-md">
            {rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Upload className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm">{t('excelImport.noFileYet')}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center">#</TableHead>
                    <TableHead className="min-w-[200px]">Raw Text</TableHead>
                    <TableHead className="min-w-[140px]">{t('bom.materialName')}</TableHead>
                    <TableHead className="min-w-[120px]">{t('bom.specification')}</TableHead>
                    <TableHead className="w-[80px]">{t('bom.quantity')}</TableHead>
                    <TableHead className="min-w-[90px]">{t('bom.unit')}</TableHead>
                    <TableHead className="min-w-[120px]">{t('bom.manufacturer')}</TableHead>
                    <TableHead className="w-[80px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow key={row._key} className={cn(
                      row.status === 'failed' && 'bg-destructive/5',
                    )}>
                      <TableCell className="text-center text-xs text-muted-foreground">{row.rowNum}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={row.rawText}>{row.rawText}</TableCell>
                      <TableCell className="p-1">{renderFieldCell(idx, 'material', row.materialName, !!row.materialUuid)}</TableCell>
                      <TableCell className="p-1">{renderFieldCell(idx, 'specification', row.specification, !!row.specification)}</TableCell>
                      <TableCell className="p-1">
                        <Input
                          type="number"
                          value={row.quantity || ''}
                          onChange={e => handleQuantityChange(idx, e.target.value)}
                          className={cn('h-7 text-xs', row.quantity > 0 && 'border-green-500/50 bg-green-500/5')}
                        />
                      </TableCell>
                      <TableCell className="p-1">{renderFieldCell(idx, 'unit', row.unit, !!row.unitUuid)}</TableCell>
                      <TableCell className="p-1">{renderFieldCell(idx, 'manufacturer', row.manufacturer, !!row.manufacturerUuid)}</TableCell>
                      <TableCell>{statusBadge(row.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setRows([]); onOpenChange(false); }}>
              <X className="h-4 w-4 mr-1" />{t('common.cancel')}
            </Button>
            <Button onClick={handleConfirm} disabled={rows.length === 0}>
              <Check className="h-4 w-4 mr-1" />{t('excelImport.confirmImport')} ({parsedCount + partialCount})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add Dialog */}
      <Dialog open={quickAdd.open} onOpenChange={v => setQuickAdd(prev => ({ ...prev, open: v }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('excelImport.quickAdd')} - {
              quickAdd.type === 'material' ? t('bom.materialName') :
              quickAdd.type === 'specification' ? t('bom.specification') :
              quickAdd.type === 'unit' ? t('bom.unit') :
              t('bom.manufacturer')
            }</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {quickAdd.type === 'material' && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">UUID / Mã vật tư</label>
                  <Input value={qaMatUuid} onChange={e => setQaMatUuid(e.target.value)} className="font-mono text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">{t('bom.materialName')}</label>
                  <Input value={qaMatName} onChange={e => {
                    setQaMatName(e.target.value);
                    setQaMatNormalized(removeViDiacritics(e.target.value).replace(/\s+/g, ' ').trim());
                  }} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Normalized Name</label>
                  <Input value={qaMatNormalized} onChange={e => setQaMatNormalized(e.target.value)} className="text-sm text-muted-foreground" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Aliases (phân cách bởi dấu phẩy)</label>
                  <Input value={qaMatAliases} onChange={e => setQaMatAliases(e.target.value)} placeholder="alias1, alias2" />
                </div>
              </>
            )}
            {quickAdd.type === 'specification' && (
              <div>
                <label className="text-sm font-medium mb-1 block">{t('bom.specification')}</label>
                <Input value={qaSpecValue} onChange={e => setQaSpecValue(e.target.value)} />
              </div>
            )}
            {quickAdd.type === 'unit' && (
              <div>
                <label className="text-sm font-medium mb-1 block">{t('bom.unit')}</label>
                <Input value={qaUnitName} onChange={e => setQaUnitName(e.target.value)} />
              </div>
            )}
            {quickAdd.type === 'manufacturer' && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">Manufacturer Code</label>
                  <Input value={qaMfrCode} onChange={e => setQaMfrCode(e.target.value)} className="font-mono text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">{t('bom.manufacturer')}</label>
                  <Input value={qaMfrName} onChange={e => setQaMfrName(e.target.value)} />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickAdd(prev => ({ ...prev, open: false }))}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleQuickAddSubmit}>
              <Plus className="h-4 w-4 mr-1" />{t('excelImport.addAndMatch')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
