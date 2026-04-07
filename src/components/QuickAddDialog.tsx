import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  genMaterialCodeApi, addMaterialApi, addSpecificationApi, addUnitApi, addManufacturerApi,
  removeViDiacritics, type DictItem,
} from '@/utils/excelParser';

export type QuickAddType = 'material' | 'specification' | 'unit' | 'manufacturer';

interface QuickAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: QuickAddType;
  defaultName: string;
  /** Required for specification type - the material UUID to attach the spec to */
  materialUuid?: string;
  onAdded: (type: QuickAddType, item: DictItem) => void;
}

export function QuickAddDialog({ open, onOpenChange, type, defaultName, materialUuid, onAdded }: QuickAddDialogProps) {
  const { t } = useTranslation();

  const [matUuid, setMatUuid] = useState('');
  const [matName, setMatName] = useState('');
  const [matNormalized, setMatNormalized] = useState('');
  const [matAliases, setMatAliases] = useState('');
  const [specValue, setSpecValue] = useState('');
  const [unitName, setUnitName] = useState('');
  const [mfrCode, setMfrCode] = useState('');
  const [mfrName, setMfrName] = useState('');

  useEffect(() => {
    if (!open) return;
    const stdName = defaultName.replace(/\s+/g, ' ').trim()
      .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    if (type === 'material') {
      genMaterialCodeApi().then(code => setMatUuid(code));
      setMatName(stdName);
      setMatNormalized(removeViDiacritics(stdName).replace(/\s+/g, ' ').trim());
      const norm = removeViDiacritics(stdName);
      const aliases: string[] = [];
      if (norm !== stdName.toLowerCase()) aliases.push(norm);
      const noSpaces = norm.replace(/\s+/g, '');
      if (noSpaces !== norm) aliases.push(noSpaces);
      setMatAliases(aliases.join(', '));
    } else if (type === 'specification') {
      setSpecValue(defaultName);
    } else if (type === 'unit') {
      setUnitName(stdName);
    } else if (type === 'manufacturer') {
      setMfrCode(removeViDiacritics(stdName).replace(/\s+/g, '').toUpperCase().slice(0, 5));
      setMfrName(stdName);
    }
  }, [open, type, defaultName]);

  const handleSubmit = useCallback(async () => {
    let newItem: DictItem | null = null;

    if (type === 'material') {
      newItem = await addMaterialApi({
        uuid: matUuid, name: matName,
        normalizedName: matNormalized,
        aliases: matAliases.split(',').map(s => s.trim()).filter(Boolean),
      });
    } else if (type === 'specification') {
      if (!materialUuid) {
        toast.error(t('excelImport.needMaterialFirst'));
        return;
      }
      newItem = await addSpecificationApi(materialUuid, specValue);
    } else if (type === 'unit') {
      newItem = await addUnitApi(unitName);
    } else if (type === 'manufacturer') {
      newItem = await addManufacturerApi(mfrCode, mfrName);
    }

    if (newItem) {
      onAdded(type, newItem);
      toast.success(`${t('excelImport.added')} ${newItem.name}`);
      onOpenChange(false);
    }
  }, [type, matUuid, matName, matNormalized, matAliases, specValue, unitName, mfrCode, mfrName, materialUuid, onAdded, onOpenChange, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('excelImport.quickAdd')} - {
            type === 'material' ? t('bom.materialName') :
            type === 'specification' ? t('bom.specification') :
            type === 'unit' ? t('bom.unit') :
            t('bom.manufacturer')
          }</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {type === 'material' && (
            <>
              <div>
                <label className="text-sm font-medium mb-1 block">UUID / Mã vật tư</label>
                <Input value={matUuid} onChange={e => setMatUuid(e.target.value)} className="font-mono text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t('bom.materialName')}</label>
                <Input value={matName} onChange={e => {
                  setMatName(e.target.value);
                  setMatNormalized(removeViDiacritics(e.target.value).replace(/\s+/g, ' ').trim());
                }} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Normalized Name</label>
                <Input value={matNormalized} onChange={e => setMatNormalized(e.target.value)} className="text-sm text-muted-foreground" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Aliases (phân cách bởi dấu phẩy)</label>
                <Input value={matAliases} onChange={e => setMatAliases(e.target.value)} placeholder="alias1, alias2" />
              </div>
            </>
          )}
          {type === 'specification' && (
            <div>
              <label className="text-sm font-medium mb-1 block">{t('bom.specification')}</label>
              <Input value={specValue} onChange={e => setSpecValue(e.target.value)} />
            </div>
          )}
          {type === 'unit' && (
            <div>
              <label className="text-sm font-medium mb-1 block">{t('bom.unit')}</label>
              <Input value={unitName} onChange={e => setUnitName(e.target.value)} />
            </div>
          )}
          {type === 'manufacturer' && (
            <>
              <div>
                <label className="text-sm font-medium mb-1 block">Manufacturer Code</label>
                <Input value={mfrCode} onChange={e => setMfrCode(e.target.value)} className="font-mono text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t('bom.manufacturer')}</label>
                <Input value={mfrName} onChange={e => setMfrName(e.target.value)} />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit}>
            <Plus className="h-4 w-4 mr-1" />{t('excelImport.addAndMatch')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
