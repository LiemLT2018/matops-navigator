import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  purchaseRequestService,
  getTotalAvailableQtyForItem,
  productBomTemplateLineService,
  productBomTemplateService,
  uomService,
  userService,
  departmentService,
  itemService,
} from '@/api/services';
import { MatOpsApiError } from '@/lib/apiClient';
import { getAuthUser } from '@/lib/authStorage';
import type {
  ProductBomTemplateLineListRow,
  UserCatalogRow,
  DepartmentCatalogRow,
  PurchaseRequestDetailData,
  PurchaseRequestHeader,
  PurchaseRequestLine,
} from '@/types/models';
import { EdTypeFind } from '@/types/models';
import type { ProductBomTemplateChildTreeNode } from '@/api/services';
import { formatCurrency } from '@/utils/formatNumber';
import { NumberDisplay } from '@/components/NumberDisplay';
import { Plus, Search, Upload, Download, Edit, Copy, Trash2, X, Save, ChevronDown, ChevronRight, FileSpreadsheet, ListOrdered, Undo2 } from 'lucide-react';
import { DatePresetSelect } from '@/components/DatePresetSelect';
import { SuggestInputText } from '@/components/SuggestInputText';
import { SuggestInputWithQuickAdd } from '@/components/SuggestInputWithQuickAdd';
import type { SuggestData } from '@/api/suggestApi';
import type { DatePresetKey } from '@/types/api';
import { toast } from 'sonner';
import { ExcelImportPreview } from '@/components/ExcelImportPreview';
import type { ParsedRow } from '@/utils/excelParser';
import { appendItemSearchPhraseFromSuggest } from '@/utils/appendItemSearchPhrase';

type DateFilter = DatePresetKey | 'all';

type LengthAxis = 'length' | 'width' | 'thickness';

interface FormMaterial {
  _key: string;
  materialCode: string;
  materialName: string;
  materialUuid: string;
  /** UoM UUID — bắt buộc khi lưu lên API (= ĐVT quy đổi nếu có, hoặc ĐVT BOM). */
  mdUomUuid: string;
  specification: string;
  mdSpecificationUuid: string;
  unit: string;
  /** SL định mức ghi nhận khi nhập từ BOM (hiển thị; có thể khác SL cần mua). */
  bomQtyPer: string;
  /** Số lượng cần mua — map `requestedQty` khi lưu API. */
  quantity: string;
  manufacturer: string;
  estimatedPrice: string;
  stockQty: number | null;
  lastSupplier: string;
  lastPrice: number | null;
  note: string;
  /** ĐVT gốc từ BOM (read-only display). */
  bomMdUomUuid?: string;
  bomUnitLabel?: string;
  /** ĐVT quy đổi (editable); khi set → mdUomUuid = convertMdUomUuid cho API. */
  convertMdUomUuid?: string;
  convertUnitLabel?: string;
  /** Trục quy đổi chiều dài khi target là LENGTH UOM. */
  lengthAxis?: LengthAxis;
  /** Hệ số quy đổi từ API compute-unit-conversion. */
  conversionFactor?: number | null;
  /** Khóa ổn định theo ĐVT BOM để trừ layer / gộp dòng import BOM (không đổi khi đổi ĐVT quy đổi). */
  bomFlatKey?: string;
  /** `MdUom.Type` (0=QTY, 1=LENGTH, …) — ĐVT BOM. */
  bomUomKind?: number;
  /** `MdUom.Type` — ĐVT quy đổi. */
  convertUomKind?: number;
}

const PR_META_START = '---PRMETA---\n';
const PR_META_END = '\n---END---\n';

interface PrFormMeta {
  bomUuid?: string;
  bomCode?: string;
  requesterUuid?: string;
  requesterName?: string;
  bomPicks?: Array<{ templateUuid: string; label: string }>;
}

interface BomPickLayer {
  pickId: string;
  templateUuid: string;
  label: string;
  contributions: Map<string, BomFlatRow>;
  /** Layer created from hydrated API data — cannot be subtracted. */
  hydrated: boolean;
}

function decodePrFormMeta(remark: string | null | undefined): { meta: PrFormMeta; note: string } {
  const r = remark ?? '';
  if (!r.startsWith(PR_META_START)) return { meta: {}, note: r };
  const end = r.indexOf(PR_META_END);
  if (end < 0) return { meta: {}, note: r };
  try {
    const o = JSON.parse(r.slice(PR_META_START.length, end)) as Record<string, unknown>;
    let bomPicks: PrFormMeta['bomPicks'];
    if (Array.isArray(o.bomPicks)) {
      bomPicks = (o.bomPicks as Array<Record<string, unknown>>)
        .filter((p) => typeof p.templateUuid === 'string')
        .map((p) => ({ templateUuid: p.templateUuid as string, label: String(p.label ?? '') }));
    }
    return {
      meta: {
        bomUuid: typeof o.bom === 'string' ? o.bom : undefined,
        bomCode: typeof o.bomCode === 'string' ? o.bomCode : undefined,
        requesterUuid: typeof o.ru === 'string' ? o.ru : undefined,
        requesterName: typeof o.rn === 'string' ? o.rn : undefined,
        bomPicks,
      },
      note: r.slice(end + PR_META_END.length),
    };
  } catch {
    return { meta: {}, note: r };
  }
}

function buildPrFormRemark(meta: PrFormMeta, userNote: string): string | null {
  const n = userNote.trim();
  const hasMeta = !!(meta.bomUuid || meta.bomCode || meta.requesterUuid || meta.requesterName || meta.bomPicks?.length);
  if (!hasMeta) return n ? n : null;
  const payload = JSON.stringify({
    v: 2,
    bom: meta.bomUuid ?? null,
    bomCode: meta.bomCode ?? null,
    ru: meta.requesterUuid ?? null,
    rn: meta.requesterName ?? null,
    bomPicks: meta.bomPicks?.length ? meta.bomPicks : undefined,
  });
  return `${PR_META_START}${payload}${PR_META_END}${n}`;
}

function prListRemarkText(remark: string | null | undefined): string {
  const { note } = decodePrFormMeta(remark);
  const trimmedNote = note.trim();
  if (trimmedNote) return trimmedNote;
  const raw = remark?.trim() ?? '';
  return raw || '—';
}

/** Tách quy cách đã ghi trong `remark` dòng PR (khi lưu form). */
function splitPrLineRemark(
  remark: string | null | undefined,
  specificationLabel: string,
): { spec: string; rest: string } {
  if (!remark?.trim()) return { spec: '—', rest: '' };
  const prefix = `${specificationLabel}:`;
  const lines = remark.split('\n').map((l) => l.trim()).filter(Boolean);
  const ix = lines.findIndex((l) => l.startsWith(prefix));
  if (ix < 0) return { spec: '—', rest: lines.join('\n') };
  const spec = lines[ix].slice(prefix.length).trim() || '—';
  const rest = [...lines.slice(0, ix), ...lines.slice(ix + 1)].join('\n');
  return { spec, rest };
}

/** Chuẩn hóa dòng BOM từ API (camelCase / PascalCase) — cùng logic `BOM.tsx`. */
function normalizeBomLineFromApi(raw: unknown): ProductBomTemplateLineListRow {
  if (raw === null || typeof raw !== 'object') {
    return {
      uuid: '',
      mdProductBomTemplateUuid: '',
      mdItemUuid: null,
      mdSpecificationUuid: null,
      mdUomUuid: '',
      lineNo: 0,
      qtyPer: 0,
      lossRate: 0,
      code: null,
      remark: null,
      mdItem: null,
      mdSpecification: null,
      mdUom: null,
    };
  }
  const r = raw as Record<string, unknown>;
  const normRef = (i: unknown): { code: string; name: string } | null => {
    if (!i || typeof i !== 'object') return null;
    const o = i as Record<string, unknown>;
    return { code: String(o.code ?? o.Code ?? ''), name: String(o.name ?? o.Name ?? '') };
  };
  const normAlias = (i: unknown): { uuid: string; name: string; status?: number } | null => {
    if (!i || typeof i !== 'object') return null;
    const o = i as Record<string, unknown>;
    return {
      uuid: String(o.uuid ?? o.Uuid ?? ''),
      name: String(o.name ?? o.Name ?? ''),
      status: o.status !== undefined ? Number(o.status) : o.Status !== undefined ? Number(o.Status) : undefined,
    };
  };
  const normSpecification = (i: unknown): { uuid: string; name: string } | null => {
    if (!i || typeof i !== 'object') return null;
    const o = i as Record<string, unknown>;
    const uuid = String(o.uuid ?? o.Uuid ?? '');
    if (!uuid) return null;
    return { uuid, name: String(o.name ?? o.Name ?? '') };
  };
  const mUuid = r.mdItemUuid ?? r.MdItemUuid;
  const sUuid = r.mdSpecificationUuid ?? r.MdSpecificationUuid;
  return {
    uuid: String(r.uuid ?? r.Uuid ?? ''),
    mdProductBomTemplateUuid: String(r.mdProductBomTemplateUuid ?? r.MdProductBomTemplateUuid ?? ''),
    mdItemUuid: mUuid === null || mUuid === undefined ? null : String(mUuid),
    mdItemAliasUuid: (r.mdItemAliasUuid ?? r.MdItemAliasUuid) as string | null | undefined,
    mdSpecificationUuid: sUuid === null || sUuid === undefined ? null : String(sUuid),
    mdUomUuid: String(r.mdUomUuid ?? r.MdUomUuid ?? ''),
    lineNo: Number(r.lineNo ?? r.LineNo ?? 0),
    qtyPer: Number(r.qtyPer ?? r.QtyPer ?? 0),
    lossRate: Number(r.lossRate ?? r.LossRate ?? 0),
    code: (r.code ?? r.Code ?? null) as string | null,
    remark: (r.remark ?? r.Remark ?? null) as string | null,
    mdItem: normRef(r.mdItem ?? r.MdItem),
    mdItemAlias: normAlias(r.mdItemAlias ?? r.MdItemAlias),
    mdSpecification: normSpecification(r.mdSpecification ?? r.MdSpecification),
    mdUom: normRef(r.mdUom ?? r.MdUom),
  };
}

interface BomFlatRow {
  materialCode: string;
  materialName: string;
  materialUuid: string;
  mdUomUuid: string;
  mdSpecificationUuid: string;
  specification: string;
  unit: string;
  manufacturer: string;
  estimatedPrice: number;
  qty: number;
}

function lineToFlatRow(l: ProductBomTemplateLineListRow, qtyScale: number): BomFlatRow {
  const base = Number(l.qtyPer);
  const q = (Number.isFinite(base) ? base : 0) * qtyScale;
  return {
    materialCode: l.mdItem?.code ?? l.code ?? '',
    materialName: l.mdItem?.name ?? l.mdItemAlias?.name ?? l.remark?.trim() ?? '',
    materialUuid: l.mdItemUuid ?? '',
    mdUomUuid: l.mdUomUuid,
    mdSpecificationUuid: l.mdSpecificationUuid ?? l.mdSpecification?.uuid ?? '',
    specification: l.mdSpecification?.name ?? '',
    unit: l.mdUom?.name ?? l.mdUom?.code ?? '',
    manufacturer: '',
    estimatedPrice: 0,
    qty: q,
  };
}

function bomFlatMergeKey(b: Pick<BomFlatRow, 'materialUuid' | 'materialName' | 'mdSpecificationUuid' | 'specification' | 'mdUomUuid'>): string {
  const item = (b.materialUuid || b.materialName.trim().toLowerCase()).trim();
  const spec = (b.mdSpecificationUuid || b.specification.trim()).trim();
  const uom = b.mdUomUuid.trim();
  return `${item}\u001F${spec}\u001F${uom}`;
}

function prMaterialMergeKey(r: Pick<FormMaterial, 'materialUuid' | 'materialName' | 'mdSpecificationUuid' | 'specification' | 'mdUomUuid'>): string {
  const item = (r.materialUuid || r.materialName.trim().toLowerCase()).trim();
  const spec = (r.mdSpecificationUuid || r.specification.trim()).trim();
  const uom = r.mdUomUuid.trim();
  return `${item}\u001F${spec}\u001F${uom}`;
}

function needsLengthAxisUi(bomKind?: number, targetKind?: number): boolean {
  if (bomKind === undefined || targetKind === undefined) return false;
  return (bomKind === 0 && targetKind === 1) || (bomKind === 1 && targetKind === 0);
}

async function collectBomFlattenedRows(rootTemplateUuid: string): Promise<BomFlatRow[]> {
  const map = new Map<string, BomFlatRow>();

  const mergeIn = (row: BomFlatRow) => {
    if (!row.mdUomUuid) return;
    const k = bomFlatMergeKey(row);
    const ex = map.get(k);
    if (ex) ex.qty += row.qty;
    else map.set(k, { ...row });
  };

  const addTemplateLines = async (templateUuid: string, mult: number) => {
    const lineRes = await productBomTemplateLineService.list({
      mdProductBomTemplateUuid: templateUuid,
      isPaging: 0,
      pageSize: 500,
      typeFind: EdTypeFind.LIST,
    });
    for (const raw of lineRes.items) {
      const l = normalizeBomLineFromApi(raw);
      mergeIn(lineToFlatRow(l, mult));
    }
  };

  const walkTree = async (nodes: ProductBomTemplateChildTreeNode[], ancestorMult: number) => {
    for (const n of nodes) {
      if (n.cycleSkipped) continue;
      const factor = Number(n.qtyPer);
      const m = ancestorMult * (Number.isFinite(factor) && factor > 0 ? factor : 1);
      await addTemplateLines(n.mdChildProductBomTemplateUuid, m);
      if (n.children?.length) await walkTree(n.children, m);
    }
  };

  await addTemplateLines(rootTemplateUuid, 1);
  const tree = await productBomTemplateService.getChildTree(rootTemplateUuid);
  await walkTree(tree, 1);

  return [...map.values()];
}

function todayLocalIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const emptyMaterial = (): FormMaterial => ({
  _key: crypto.randomUUID(), materialCode: '', materialName: '', materialUuid: '',
  mdUomUuid: '',
  specification: '', unit: '', bomQtyPer: '', quantity: '', manufacturer: '', estimatedPrice: '',
  stockQty: null, lastSupplier: '', lastPrice: null, note: '',
  mdSpecificationUuid: '',
  bomMdUomUuid: '', bomUnitLabel: '',
  convertMdUomUuid: '', convertUnitLabel: '',
});

async function detailLinesToFormMaterials(detail: PurchaseRequestDetailData): Promise<FormMaterial[]> {
  if (!detail.lines?.length) return [emptyMaterial()];
  const mapped = await Promise.all(
    detail.lines.map(async (d) => {
      let unitLabel = '';
      if (d.mdUomUuid) {
        try {
          const u = await uomService.get(d.mdUomUuid);
          unitLabel = u.name ?? u.code ?? d.mdUomUuid;
        } catch {
          unitLabel = `${d.mdUomUuid.slice(0, 8)}…`;
        }
      }
      return {
        _key: crypto.randomUUID(),
        materialCode: d.mdItemUuid || '',
        materialName: d.name,
        materialUuid: d.mdItemUuid || '',
        mdUomUuid: d.mdUomUuid,
        specification: '',
        mdSpecificationUuid: '',
        unit: unitLabel,
        bomQtyPer: '',
        quantity: String(d.requestedQty),
        manufacturer: '',
        estimatedPrice: '',
        stockQty: null,
        lastSupplier: '',
        lastPrice: null,
        note: d.remark || '',
      } satisfies FormMaterial;
    }),
  );
  return mapped;
}

const isMaterialRowComplete = (row: FormMaterial) => row.materialName && row.quantity && row.unit;

export default function PurchaseRequestsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<PurchaseRequestHeader[]>([]);
  const [search, setSearch] = useState('');
  const [preset, setPreset] = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPR, setEditingPR] = useState<PurchaseRequestHeader | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [prItems, setPrItems] = useState<Record<string, PurchaseRequestLine[]>>({});
  const [matImportOpen, setMatImportOpen] = useState(false);

  // Form state
  const [companyUsers, setCompanyUsers] = useState<UserCatalogRow[]>([]);
  const [companyDepartments, setCompanyDepartments] = useState<DepartmentCatalogRow[]>([]);
  const [formRequesterUuid, setFormRequesterUuid] = useState('');
  const [formMdDepartmentUuid, setFormMdDepartmentUuid] = useState('');
  const [formPriority, setFormPriority] = useState('normal');
  const [formBomTemplateUuid, setFormBomTemplateUuid] = useState('');
  const [formBomRefLabel, setFormBomRefLabel] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formMaterials, setFormMaterials] = useState<FormMaterial[]>([emptyMaterial()]);
  const [prBomPickLayers, setPrBomPickLayers] = useState<BomPickLayer[]>([]);
  const [bomRefsDialogOpen, setBomRefsDialogOpen] = useState(false);

  const prBomPickList = useMemo(() => {
    const map = new Map<string, { label: string; count: number; picks: Array<{ pickId: string; hydrated: boolean }> }>();
    for (const layer of prBomPickLayers) {
      const cur = map.get(layer.templateUuid);
      if (cur) {
        cur.count++;
        cur.picks.push({ pickId: layer.pickId, hydrated: layer.hydrated });
      } else {
        map.set(layer.templateUuid, {
          label: layer.label,
          count: 1,
          picks: [{ pickId: layer.pickId, hydrated: layer.hydrated }],
        });
      }
    }
    return [...map.entries()]
      .map(([uuid, v]) => ({ uuid, ...v }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  }, [prBomPickLayers]);

  const prStatusMap: Record<number, string> = { 0: 'draft', 1: 'pending', 2: 'approved', 3: 'rejected' };
  const statuses = ['all', 'draft', 'pending', 'approved', 'rejected'];

  const loadData = useCallback(async () => {
    try {
      const statusNum = statusFilter !== 'all' ? Object.entries(prStatusMap).find(([, v]) => v === statusFilter)?.[0] : undefined;
      const res = await purchaseRequestService.list({
        pageIndex: page, pageSize: 10,
        status: statusNum !== undefined ? Number(statusNum) : undefined,
        keyword: search || undefined,
      });
      setData(res.items);
      setTotalPages(res.pagination.totalPage);
      setTotalCount(res.pagination.totalCount);
    } catch (e) {
      setData([]);
      if (e instanceof MatOpsApiError) {
        toast.error(e.errorMessage || t('errors.system'));
      } else {
        toast.error(t('errors.system'));
      }
    }
  }, [page, statusFilter, search, t]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!showForm) return;
    const company = getAuthUser()?.mdCompanyUuid;
    if (!company) return;
    let cancelled = false;
    (async () => {
      try {
        const [u, d] = await Promise.all([
          userService.list({
            mdCompanyUuid: company,
            typeFind: EdTypeFind.CATALOG,
            isPaging: 0,
            pageSize: 200,
            pageIndex: 1,
          }),
          departmentService.list({
            mdCompanyUuid: company,
            typeFind: EdTypeFind.CATALOG,
            isPaging: 0,
            pageSize: 200,
            pageIndex: 1,
          }),
        ]);
        if (cancelled) return;
        const normU = (x: unknown): UserCatalogRow => {
          const r = x as Record<string, unknown>;
          const du = r.mdDepartmentUuid ?? r.MdDepartmentUuid;
          return {
            uuid: String(r.uuid ?? r.Uuid ?? ''),
            code: String(r.code ?? r.Code ?? ''),
            name: String(r.name ?? r.Name ?? ''),
            mdCompanyUuid: (r.mdCompanyUuid ?? r.MdCompanyUuid) as string | null | undefined,
            mdDepartmentUuid: du === null || du === undefined ? null : String(du),
          };
        };
        const normD = (x: unknown): DepartmentCatalogRow => {
          const r = x as Record<string, unknown>;
          return {
            uuid: String(r.uuid ?? r.Uuid ?? ''),
            code: String(r.code ?? r.Code ?? ''),
            name: String(r.name ?? r.Name ?? ''),
            mdCompanyUuid: String(r.mdCompanyUuid ?? r.MdCompanyUuid ?? company),
          };
        };
        setCompanyUsers(u.items.map(normU).filter((r) => r.uuid));
        setCompanyDepartments(d.items.map(normD).filter((r) => r.uuid));
      } catch (e) {
        if (!cancelled && e instanceof MatOpsApiError) {
          toast.error(e.errorMessage || t('errors.system'));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [showForm, t]);

  const handleCreate = () => {
    setEditingPR(null);
    const auth = getAuthUser();
    setFormRequesterUuid(auth?.uuid ?? '');
    setFormMdDepartmentUuid(auth?.mdDepartmentUuid ?? '');
    setFormPriority('normal');
    setFormBomTemplateUuid('');
    setFormBomRefLabel('');
    setFormNote('');
    setFormMaterials([emptyMaterial()]);
    setPrBomPickLayers([]);
    setBomRefsDialogOpen(false);
    setShowForm(true);
  };

  const handleEdit = async (row: PurchaseRequestHeader) => {
    if (row.status !== 0) {
      toast.info(t('purchasing.request.onlyDraftEditable'));
      return;
    }
    setEditingPR(row);
    setFormPriority('normal');
    const { meta, note } = decodePrFormMeta(row.remark);
    setFormNote(note);
    setFormBomTemplateUuid(meta.bomUuid ?? '');
    setFormBomRefLabel(meta.bomCode ?? '');
    setFormRequesterUuid(meta.requesterUuid ?? '');
    setFormMdDepartmentUuid(row.mdDepartmentUuid ?? '');
    {
      const hydratedLayers: BomPickLayer[] = [];
      if (meta.bomPicks?.length) {
        for (const bp of meta.bomPicks) {
          hydratedLayers.push({
            pickId: crypto.randomUUID(),
            templateUuid: bp.templateUuid,
            label: bp.label || bp.templateUuid.slice(0, 8),
            contributions: new Map(),
            hydrated: true,
          });
        }
      } else if (meta.bomUuid) {
        const bl = (meta.bomCode ?? '').trim() || meta.bomUuid.slice(0, 8);
        hydratedLayers.push({
          pickId: crypto.randomUUID(),
          templateUuid: meta.bomUuid,
          label: bl,
          contributions: new Map(),
          hydrated: true,
        });
      }
      setPrBomPickLayers(hydratedLayers);
    }
    setBomRefsDialogOpen(false);
    try {
      const detail = await purchaseRequestService.get(row.uuid);
      setFormMaterials(await detailLinesToFormMaterials(detail));
    } catch (e) {
      setFormMaterials([emptyMaterial()]);
      if (e instanceof MatOpsApiError) {
        toast.error(e.errorMessage || t('errors.system'));
      } else {
        toast.error(t('errors.system'));
      }
    }
    setShowForm(true);
  };

  const handleClone = async (row: PurchaseRequestHeader) => {
    setEditingPR(null);
    setFormPriority('normal');
    const { meta, note } = decodePrFormMeta(row.remark);
    setFormNote(note);
    setFormBomTemplateUuid(meta.bomUuid ?? '');
    setFormBomRefLabel(meta.bomCode ?? '');
    setFormRequesterUuid(meta.requesterUuid ?? '');
    setFormMdDepartmentUuid(row.mdDepartmentUuid ?? '');
    {
      const hydratedLayers: BomPickLayer[] = [];
      if (meta.bomPicks?.length) {
        for (const bp of meta.bomPicks) {
          hydratedLayers.push({
            pickId: crypto.randomUUID(),
            templateUuid: bp.templateUuid,
            label: bp.label || bp.templateUuid.slice(0, 8),
            contributions: new Map(),
            hydrated: true,
          });
        }
      } else if (meta.bomUuid) {
        const bl = (meta.bomCode ?? '').trim() || meta.bomUuid.slice(0, 8);
        hydratedLayers.push({
          pickId: crypto.randomUUID(),
          templateUuid: meta.bomUuid,
          label: bl,
          contributions: new Map(),
          hydrated: true,
        });
      }
      setPrBomPickLayers(hydratedLayers);
    }
    setBomRefsDialogOpen(false);
    try {
      const detail = await purchaseRequestService.get(row.uuid);
      setFormMaterials(await detailLinesToFormMaterials(detail));
      setShowForm(true);
    } catch (e) {
      if (e instanceof MatOpsApiError) {
        toast.error(e.errorMessage || t('errors.system'));
      } else {
        toast.error(t('errors.system'));
      }
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPR(null);
    setBomRefsDialogOpen(false);
  };

  const handleSave = async () => {
    const user = getAuthUser();
    if (!user?.mdCompanyUuid) {
      toast.error(t('errors.missingCompany'));
      return;
    }
    const lines = formMaterials
      .filter(r => r.materialName.trim() && r.quantity.trim())
      .map(r => {
        const specLine = r.specification.trim()
          ? `${t('bom.specification')}: ${r.specification.trim()}`
          : '';
        const noteLine = r.note.trim();
        const lineRemark = [specLine, noteLine].filter(Boolean).join('\n') || null;
        return {
          mdItemUuid: r.materialUuid.trim() ? r.materialUuid.trim() : null,
          name: r.materialName.trim(),
          mdUomUuid: r.mdUomUuid.trim(),
          requestedQty: Number(r.quantity),
          neededDate: null as string | null,
          remark: lineRemark,
        };
      });
    if (lines.length === 0) {
      toast.warning(t('purchasing.request.atLeastOneLine'));
      return;
    }
    const invalid = lines.some(
      l => !l.mdUomUuid || !Number.isFinite(l.requestedQty) || l.requestedQty <= 0,
    );
    if (invalid) {
      toast.warning(t('purchasing.request.selectUom'));
      return;
    }
    const requesterRow = companyUsers.find((x) => x.uuid === formRequesterUuid);
    const requesterName = requesterRow?.name?.trim() ?? '';
    const uniqueBomPicks = prBomPickLayers.length > 0
      ? [...new Map(prBomPickLayers.map((l) => [l.templateUuid, { templateUuid: l.templateUuid, label: l.label }])).values()]
      : undefined;
    const headerRemark = buildPrFormRemark(
      {
        bomUuid: formBomTemplateUuid || undefined,
        bomCode: formBomRefLabel || undefined,
        requesterUuid: formRequesterUuid || undefined,
        requesterName: requesterName || undefined,
        bomPicks: uniqueBomPicks,
      },
      formNote,
    );
    const deptUuid = formMdDepartmentUuid.trim() || null;
    try {
      if (editingPR) {
        await purchaseRequestService.update(editingPR.uuid, {
          mdDepartmentUuid: deptUuid,
          requestDate: editingPR.requestDate.slice(0, 10),
          neededDate: null,
          remark: headerRemark,
          lines,
        });
        toast.success(`${t('purchasing.request.editPR')} — ${t('errors.success')}`);
      } else {
        await purchaseRequestService.create({
          mdCompanyUuid: user.mdCompanyUuid,
          mdDepartmentUuid: deptUuid,
          requestDate: todayLocalIsoDate(),
          neededDate: null,
          remark: headerRemark,
          lines,
        });
        toast.success(`${t('purchasing.request.createPR')} — ${t('errors.success')}`);
      }
      setShowForm(false);
      setEditingPR(null);
      await loadData();
    } catch (e) {
      if (e instanceof MatOpsApiError) {
        toast.error(e.errorMessage || t('errors.system'));
      } else {
        toast.error(t('errors.system'));
      }
    }
  };

  const handleExpand = async (uuid: string) => {
    if (expandedId === uuid) { setExpandedId(null); return; }
    if (!prItems[uuid]) {
      try {
        const detail = await purchaseRequestService.get(uuid);
        setPrItems(prev => ({ ...prev, [uuid]: detail.lines }));
      } catch (e) {
        if (e instanceof MatOpsApiError) {
          toast.error(e.errorMessage || t('errors.system'));
        }
      }
    }
    setExpandedId(uuid);
  };

  // Material form handlers
  const handleMatFieldChange = (index: number, field: keyof FormMaterial, value: string) => {
    const updated = [...formMaterials];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'materialName') {
      updated[index].materialCode = '';
      updated[index].materialUuid = '';
      updated[index].bomQtyPer = '';
      updated[index].stockQty = null;
      updated[index].lastSupplier = '';
      updated[index].lastPrice = null;
      updated[index].bomFlatKey = undefined;
      updated[index].bomMdUomUuid = '';
      updated[index].bomUnitLabel = '';
      updated[index].convertMdUomUuid = '';
      updated[index].convertUnitLabel = '';
      updated[index].bomUomKind = undefined;
      updated[index].convertUomKind = undefined;
      updated[index].conversionFactor = null;
      updated[index].lengthAxis = undefined;
    }
    if (field === 'unit') {
      updated[index].mdUomUuid = '';
      updated[index].convertMdUomUuid = '';
      updated[index].convertUnitLabel = '';
    }
    if (field === 'specification') {
      updated[index].mdSpecificationUuid = '';
    }
    setFormMaterials(updated);
  };

  const handleMatSelect = async (index: number, field: keyof FormMaterial, item: SuggestData, typedQuery?: string) => {
    const updated = [...formMaterials];
    if (field === 'materialName') {
      appendItemSearchPhraseFromSuggest(item.uuid, typedQuery);
      updated[index] = {
        ...updated[index],
        materialName: item.name,
        materialCode: item.uuid,
        materialUuid: item.uuid,
        bomFlatKey: undefined,
        bomMdUomUuid: '',
        bomUnitLabel: '',
        convertMdUomUuid: '',
        convertUnitLabel: '',
        bomUomKind: undefined,
        convertUomKind: undefined,
        conversionFactor: null,
        lengthAxis: undefined,
        bomQtyPer: '',
        ...(item.mdUomUuid
          ? { mdUomUuid: item.mdUomUuid, unit: item.unitName ?? updated[index].unit }
          : {}),
      };
      setFormMaterials(updated);
      const user = getAuthUser();
      try {
        const stockQty = await getTotalAvailableQtyForItem(item.uuid, user?.mdCompanyUuid);
        const u = [...updated];
        u[index] = {
          ...u[index],
          stockQty,
          lastSupplier: '',
          lastPrice: null,
        };
        setFormMaterials(u);
      } catch { /* tồn kho: bỏ qua nếu API lỗi */ }
    } else if (field === 'unit') {
      updated[index] = {
        ...updated[index],
        unit: item.name,
        mdUomUuid: item.uuid,
        convertMdUomUuid: '',
        convertUnitLabel: '',
      };
      setFormMaterials(updated);
    } else if (field === 'specification') {
      updated[index] = {
        ...updated[index],
        specification: item.name,
        mdSpecificationUuid: item.uuid,
      };
      setFormMaterials(updated);
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

  // Excel import for materials
  const handleMatExcelImport = useCallback((parsedRows: ParsedRow[]) => {
    setFormMaterials(prev => {
      let current = prev.filter(r => r.materialName || r.quantity);
      for (const pr of parsedRows) {
        const cand: Pick<FormMaterial, 'materialUuid' | 'materialName' | 'mdSpecificationUuid' | 'specification' | 'mdUomUuid'> = {
          materialUuid: pr.materialUuid,
          materialName: pr.materialName,
          mdSpecificationUuid: '',
          specification: pr.specification,
          mdUomUuid: pr.unitUuid,
        };
        const existIdx = current.findIndex((r) => prMaterialMergeKey(r) === prMaterialMergeKey(cand));
        if (existIdx >= 0) {
          const existing = current[existIdx];
          const newQty = Number(existing.quantity || 0) + pr.quantity;
          const price = Number(existing.estimatedPrice) || 0;
          current[existIdx] = {
            ...existing,
            quantity: String(newQty),
            estimatedPrice: String(price),
            mdUomUuid: pr.unitUuid || existing.mdUomUuid,
          };
        } else {
          current.push({
            _key: crypto.randomUUID(),
            materialCode: pr.materialUuid,
            materialName: pr.materialName,
            materialUuid: pr.materialUuid,
            mdUomUuid: pr.unitUuid,
            specification: pr.specification,
            mdSpecificationUuid: '',
            unit: pr.unit,
            bomQtyPer: '',
            quantity: String(pr.quantity),
            manufacturer: pr.manufacturer,
            estimatedPrice: '',
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
  }, []);

  const [bomSuggestValue, setBomSuggestValue] = useState('');

  const handleBomSuggestSelect = useCallback(async (item: SuggestData) => {
    setBomSuggestValue('');
    setFormBomTemplateUuid(item.uuid);
    setFormBomRefLabel((item.name ?? '').trim() || item.uuid.slice(0, 8));
    const user = getAuthUser();
    try {
      const flat = await collectBomFlattenedRows(item.uuid);
      if (flat.length === 0) {
        toast.info(t('common.noData'));
        return;
      }

      const pickId = crypto.randomUUID();
      const pickLabel = (item.name ?? '').trim() || item.uuid.slice(0, 8);
      const contributions = new Map<string, BomFlatRow>();
      for (const bm of flat) {
        if (!bm.mdUomUuid) continue;
        const k = bomFlatMergeKey(bm);
        const ex = contributions.get(k);
        if (ex) ex.qty += bm.qty;
        else contributions.set(k, { ...bm });
      }

      const uomTypeMap = new Map<string, number>();
      for (const uid of new Set(flat.map((f) => f.mdUomUuid).filter(Boolean))) {
        try {
          const u = await uomService.get(uid);
          uomTypeMap.set(uid, u.type);
        } catch { /* ignore */ }
      }

      setPrBomPickLayers((prev) => [
        ...prev,
        { pickId, templateUuid: item.uuid, label: pickLabel, contributions, hydrated: false },
      ]);

      setFormMaterials((prev) => {
        let current = prev.filter((r) => r.materialName || r.quantity);
        for (const bm of flat) {
          if (!bm.mdUomUuid) continue;
          const bk = bomFlatMergeKey(bm);
          const existIdx = current.findIndex((r) => r.bomFlatKey === bk);
          const bomKind = uomTypeMap.get(bm.mdUomUuid);
          if (existIdx >= 0) {
            const existing = current[existIdx];
            const prevBom = Number(existing.bomQtyPer || 0);
            const newBomQty = prevBom + bm.qty;
            let quantityStr: string;
            if (
              existing.bomMdUomUuid &&
              existing.convertMdUomUuid &&
              existing.convertMdUomUuid !== existing.bomMdUomUuid &&
              existing.conversionFactor != null &&
              Number.isFinite(existing.conversionFactor)
            ) {
              quantityStr = String(Math.round(newBomQty * existing.conversionFactor * 1e6) / 1e6);
            } else {
              const newQty = Number(existing.quantity || 0) + bm.qty;
              quantityStr = String(newQty);
            }
            current[existIdx] = {
              ...existing,
              quantity: quantityStr,
              bomQtyPer: String(newBomQty),
              mdUomUuid: existing.convertMdUomUuid || existing.mdUomUuid || bm.mdUomUuid,
              unit: existing.convertUnitLabel || existing.unit || bm.unit,
              specification: existing.specification || bm.specification,
              mdSpecificationUuid: existing.mdSpecificationUuid || bm.mdSpecificationUuid,
              bomUomKind: bomKind ?? existing.bomUomKind,
            };
          } else {
            current.push({
              _key: crypto.randomUUID(),
              materialCode: bm.materialCode,
              materialName: bm.materialName,
              materialUuid: bm.materialUuid,
              mdUomUuid: bm.mdUomUuid,
              specification: bm.specification,
              mdSpecificationUuid: bm.mdSpecificationUuid,
              unit: bm.unit,
              bomQtyPer: String(bm.qty),
              quantity: String(bm.qty),
              manufacturer: bm.manufacturer,
              estimatedPrice: String(bm.estimatedPrice),
              stockQty: null,
              lastSupplier: '',
              lastPrice: null,
              note: '',
              bomMdUomUuid: bm.mdUomUuid,
              bomUnitLabel: bm.unit,
              convertMdUomUuid: bm.mdUomUuid,
              convertUnitLabel: bm.unit,
              bomFlatKey: bk,
              bomUomKind: bomKind,
              convertUomKind: bomKind,
              lengthAxis: 'length',
            });
          }
        }
        if (current.length === 0) current.push(emptyMaterial());
        return current;
      });

      for (const bm of flat) {
        if (!bm.materialUuid) continue;
        try {
          const qty = await getTotalAvailableQtyForItem(bm.materialUuid, user?.mdCompanyUuid);
          const bk = bomFlatMergeKey(bm);
          setFormMaterials((prev) =>
            prev.map((r) =>
              r.bomFlatKey === bk && r.materialUuid === bm.materialUuid ? { ...r, stockQty: qty } : r,
            ),
          );
        } catch { /* ignore */ }
      }

      toast.success(t('purchasing.request.importedFromBom', { count: flat.length, name: item.name }));
    } catch {
      toast.error(t('errors.system'));
    }
  }, [t]);

  const removePrBomPick = useCallback((pickId: string) => {
    const layer = prBomPickLayers.find((l) => l.pickId === pickId);
    if (!layer || layer.hydrated) return;

    setFormMaterials((prev) => {
      let current = [...prev];
      for (const [key, contrib] of layer.contributions) {
        const idx = current.findIndex((r) => r.bomFlatKey === key);
        if (idx < 0) continue;
        const row = current[idx];
        const newBom = Math.max(0, Number(row.bomQtyPer || 0) - contrib.qty);
        let newQty: number;
        if (
          row.bomMdUomUuid &&
          row.convertMdUomUuid &&
          row.convertMdUomUuid !== row.bomMdUomUuid &&
          row.conversionFactor != null &&
          Number.isFinite(row.conversionFactor)
        ) {
          newQty = Math.max(0, Math.round(newBom * row.conversionFactor * 1e6) / 1e6);
        } else {
          newQty = Math.max(0, Number(row.quantity || 0) - contrib.qty);
        }
        if (newBom <= 0) {
          current.splice(idx, 1);
        } else {
          current[idx] = { ...row, quantity: String(newQty), bomQtyPer: String(newBom) };
        }
      }
      if (current.length === 0) current.push(emptyMaterial());
      return current;
    });

    setPrBomPickLayers((prev) => {
      const remaining = prev.filter((l) => l.pickId !== pickId);
      if (remaining.length > 0) {
        const last = remaining[remaining.length - 1];
        setFormBomTemplateUuid(last.templateUuid);
        setFormBomRefLabel(last.label);
      } else {
        setFormBomTemplateUuid('');
        setFormBomRefLabel('');
      }
      return remaining;
    });

    toast.success(t('purchasing.request.removedBomPick', { name: layer.label }));
  }, [prBomPickLayers, t]);

  /** Gõ trong ô ĐVT quy đổi khi dòng có ĐVT BOM — phải cập nhật state (trước đây onChange bị bỏ qua nên không gõ được). */
  const handleConvertUomInputChange = useCallback((index: number, value: string) => {
    setFormMaterials((prev) => {
      const u = [...prev];
      const row = u[index];
      if (!row) return prev;
      u[index] = {
        ...row,
        convertUnitLabel: value,
        convertMdUomUuid: '',
        mdUomUuid: '',
        conversionFactor: null,
      };
      return u;
    });
  }, []);

  const handleConvertUomSelect = useCallback(async (index: number, item: SuggestData) => {
    const row = formMaterials[index];
    if (!row) return;

    const convertUuid = item.uuid;
    const convertLabel = item.name;

    let bomKind = row.bomUomKind;
    let tgtKind: number | undefined;
    try {
      const [bomU, tgtU] = await Promise.all([
        row.bomMdUomUuid ? uomService.get(row.bomMdUomUuid) : Promise.resolve(null),
        uomService.get(convertUuid),
      ]);
      if (bomU) bomKind = bomU.type;
      tgtKind = tgtU.type;
    } catch {
      tgtKind = undefined;
    }

    const updated = [...formMaterials];
    updated[index] = {
      ...updated[index],
      convertMdUomUuid: convertUuid,
      convertUnitLabel: convertLabel,
      mdUomUuid: convertUuid,
      unit: convertLabel,
      conversionFactor: null,
      bomUomKind: bomKind ?? updated[index].bomUomKind,
      convertUomKind: tgtKind ?? updated[index].convertUomKind,
    };
    setFormMaterials(updated);

    if (!row.materialUuid || !row.mdSpecificationUuid || !row.bomMdUomUuid) return;
    if (convertUuid === row.bomMdUomUuid) {
      const bomQty = Number(row.bomQtyPer || 0);
      const u2 = [...updated];
      u2[index] = {
        ...u2[index],
        quantity: bomQty > 0 ? String(bomQty) : updated[index].quantity,
        conversionFactor: 1,
        convertUomKind: bomKind ?? u2[index].convertUomKind,
      };
      setFormMaterials(u2);
      return;
    }

    try {
      const result = await itemService.computeUnitConversion({
        mdItemUuid: row.materialUuid,
        mdSpecificationUuid: row.mdSpecificationUuid,
        sourceMdUomUuid: row.bomMdUomUuid,
        targetMdUomUuid: convertUuid,
        lengthAxis: row.lengthAxis ?? null,
      });
      if (result.ok && result.conversionFactor != null) {
        const bomQty = Number(row.bomQtyPer || 0);
        const convertedQty = bomQty > 0 ? bomQty * result.conversionFactor : 0;
        setFormMaterials((prev) => {
          const u = [...prev];
          if (!u[index]) return prev;
          u[index] = {
            ...u[index],
            quantity: convertedQty > 0 ? String(Math.round(convertedQty * 1e6) / 1e6) : u[index].quantity,
            conversionFactor: result.conversionFactor,
            bomUomKind: bomKind ?? u[index].bomUomKind,
            convertUomKind: tgtKind ?? u[index].convertUomKind,
          };
          return u;
        });
      } else {
        toast.warning(t('purchasing.request.massConvertError'));
      }
    } catch {
      toast.warning(t('purchasing.request.massConvertError'));
    }
  }, [formMaterials, t]);

  const handleLengthAxisChange = useCallback(async (index: number, axis: LengthAxis) => {
    const row = formMaterials[index];
    if (!row) return;

    const updated = [...formMaterials];
    updated[index] = { ...updated[index], lengthAxis: axis };
    setFormMaterials(updated);

    if (!row.materialUuid || !row.mdSpecificationUuid || !row.bomMdUomUuid || !row.convertMdUomUuid) return;
    if (row.convertMdUomUuid === row.bomMdUomUuid) return;

    try {
      const result = await itemService.computeUnitConversion({
        mdItemUuid: row.materialUuid,
        mdSpecificationUuid: row.mdSpecificationUuid,
        sourceMdUomUuid: row.bomMdUomUuid,
        targetMdUomUuid: row.convertMdUomUuid,
        lengthAxis: axis,
      });
      if (result.ok && result.conversionFactor != null) {
        const bomQty = Number(row.bomQtyPer || 0);
        const convertedQty = bomQty > 0 ? bomQty * result.conversionFactor : 0;
        setFormMaterials((prev) => {
          const u = [...prev];
          if (!u[index]) return prev;
          u[index] = {
            ...u[index],
            lengthAxis: axis,
            quantity: convertedQty > 0 ? String(Math.round(convertedQty * 1e6) / 1e6) : u[index].quantity,
            conversionFactor: result.conversionFactor,
          };
          return u;
        });
      }
    } catch { /* ignore */ }
  }, [formMaterials]);

  const renderPRDetailTable = (items: PurchaseRequestLine[]) => {
    const specLbl = t('bom.specification');
    return (
      <div className="bg-muted/30 p-4 border-t border-border">
        <h4 className="text-sm font-semibold mb-2 text-foreground">{t('purchasing.request.materialList')} ({items.length})</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>{t('bom.materialName')}</TableHead>
              <TableHead>{t('bom.specification')}</TableHead>
              <TableHead>{t('bom.unit')}</TableHead>
              <TableHead className="text-right">{t('purchasing.request.qtyNeeded')}</TableHead>
              <TableHead className="text-right">Ordered</TableHead>
              <TableHead>{t('common.status')}</TableHead>
              <TableHead>{t('bom.note')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((d) => {
              const { spec, rest } = splitPrLineRemark(d.remark, specLbl);
              return (
                <TableRow key={d.uuid}>
                  <TableCell className="font-mono text-sm">{d.lineNo}</TableCell>
                  <TableCell>{d.name || (d.mdItemUuid ? <span className="font-mono text-xs">{d.mdItemUuid.slice(0, 8)}…</span> : '—')}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{spec}</TableCell>
                  <TableCell className="font-mono text-xs">{d.mdUomUuid.slice(0, 8)}…</TableCell>
                  <TableCell className="text-right font-mono"><NumberDisplay value={d.requestedQty} /></TableCell>
                  <TableCell className="text-right font-mono"><NumberDisplay value={d.orderedQty} /></TableCell>
                  <TableCell><StatusBadge status={d.status === 0 ? 'open' : 'closed'} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{rest || '—'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderForm = () => (
    <Card className="industrial-shadow border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{editingPR ? t('purchasing.request.editPR') + ': ' + editingPR.code : t('purchasing.request.createPR')}</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCloseForm}><X className="h-4 w-4 mr-1" />{t('common.cancel')}</Button>
            <Button size="sm" onClick={() => void handleSave()}><Save className="h-4 w-4 mr-1" />{t('common.save')}</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">{t('purchasing.request.requester')}</label>
            <Select
              value={formRequesterUuid || '__none__'}
              onValueChange={(v) => {
                const next = v === '__none__' ? '' : v;
                setFormRequesterUuid(next);
                const u = companyUsers.find((x) => x.uuid === next);
                if (u?.mdDepartmentUuid) setFormMdDepartmentUuid(u.mdDepartmentUuid);
              }}
            >
              <SelectTrigger><SelectValue placeholder={t('purchasing.request.pickRequester')} /></SelectTrigger>
              <SelectContent className="max-h-[280px]">
                <SelectItem value="__none__">—</SelectItem>
                {companyUsers.map((u) => (
                  <SelectItem key={u.uuid} value={u.uuid}>
                    {u.code ? `${u.code} — ${u.name}` : u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">{t('purchasing.request.department')}</label>
            <Select
              value={formMdDepartmentUuid || '__none__'}
              onValueChange={(v) => setFormMdDepartmentUuid(v === '__none__' ? '' : v)}
            >
              <SelectTrigger><SelectValue placeholder={t('purchasing.request.pickDepartment')} /></SelectTrigger>
              <SelectContent className="max-h-[280px]">
                <SelectItem value="__none__">—</SelectItem>
                {companyDepartments.map((d) => (
                  <SelectItem key={d.uuid} value={d.uuid}>
                    {d.code ? `${d.code} — ${d.name}` : d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <div className="flex gap-2 items-end">
              <div className="min-w-0 flex-1">
                <SuggestInputText
                  value={bomSuggestValue}
                  selectedUuid={formBomTemplateUuid || undefined}
                  onChange={setBomSuggestValue}
                  onSelect={handleBomSuggestSelect}
                  type="bom"
                  placeholder={t('purchasing.request.pickBomAndImport')}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={prBomPickList.length === 0}
                onClick={() => setBomRefsDialogOpen(true)}
                title={t('purchasing.request.viewSelectedBoms')}
              >
                <ListOrdered className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">{t('purchasing.request.viewSelectedBoms')}</span>
              </Button>
            </div>
            {formBomRefLabel ? (
              <p className="text-xs text-muted-foreground mt-1 truncate" title={formBomRefLabel}>{formBomRefLabel}</p>
            ) : null}
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
              <Button variant="outline" size="sm" onClick={() => setMatImportOpen(true)}><FileSpreadsheet className="h-3 w-3 mr-1" />{t('excelImport.importExcelMaterials')}</Button>
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
                  <TableHead className="w-[90px]">{t('purchasing.request.bomUomLabel')}</TableHead>
                  <TableHead className="w-[100px]">{t('purchasing.request.qtyPerBom')}</TableHead>
                  <TableHead className="w-[110px]">{t('purchasing.request.convertUomLabel')}</TableHead>
                  <TableHead className="w-[100px]">{t('purchasing.request.qtyNeeded')}</TableHead>
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
                      <SuggestInputWithQuickAdd value={row.materialName} selectedUuid={row.materialUuid}
                        onChange={v => handleMatFieldChange(i, 'materialName', v)}
                        onSelect={(item, typed) => handleMatSelect(i, 'materialName', item, typed)}
                        type="material" quickAddType="material" placeholder={t('bom.materialName')} />
                    </TableCell>
                    <TableCell className="p-1">
                      <SuggestInputWithQuickAdd value={row.specification}
                        selectedUuid={row.mdSpecificationUuid}
                        onChange={v => handleMatFieldChange(i, 'specification', v)}
                        onSelect={item => handleMatSelect(i, 'specification', item)}
                        type="specification" quickAddType="specification"
                        materialUuid={row.materialUuid}
                        defaultMdUomUuid={row.mdUomUuid}
                        onSpecificationDbUuid={uuid => {
                          setFormMaterials(prev => {
                            const u = [...prev];
                            if (!u[i]) return prev;
                            u[i] = { ...u[i], mdSpecificationUuid: uuid };
                            return u;
                          });
                        }}
                        placeholder={t('bom.specification')} />
                    </TableCell>
                    <TableCell className="p-1">
                      {row.bomMdUomUuid ? (
                        <span className="text-xs text-muted-foreground bg-muted/50 rounded px-1.5 py-1 inline-block truncate max-w-[90px]" title={row.bomUnitLabel || row.bomMdUomUuid}>
                          {row.bomUnitLabel || row.bomMdUomUuid.slice(0, 8)}
                        </span>
                      ) : (
                        <SuggestInputWithQuickAdd value={row.unit} selectedUuid={row.mdUomUuid}
                          onChange={v => handleMatFieldChange(i, 'unit', v)}
                          onSelect={item => handleMatSelect(i, 'unit', item)}
                          type="unit" quickAddType="unit" placeholder={t('bom.unit')} />
                      )}
                    </TableCell>
                    <TableCell className="p-1">
                      <Input type="number" value={row.bomQtyPer}
                        onChange={e => handleMatFieldChange(i, 'bomQtyPer', e.target.value)}
                        className="h-8 text-sm bg-muted/30" placeholder="—" readOnly={!!row.bomMdUomUuid} />
                    </TableCell>
                    <TableCell className="p-1">
                      <div className="space-y-1">
                        {row.bomMdUomUuid ? (
                        <SuggestInputWithQuickAdd
                          value={
                            row.convertMdUomUuid
                              ? row.convertUnitLabel || row.unit
                              : row.convertUnitLabel
                          }
                          selectedUuid={row.convertMdUomUuid || row.mdUomUuid}
                          onChange={v => handleConvertUomInputChange(i, v)}
                          onSelect={item => {
                            void handleConvertUomSelect(i, item);
                          }}
                          type="unit" quickAddType="unit" placeholder={t('purchasing.request.convertUomLabel')} />
                        ) : (
                          <div
                            className="text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1.5 min-h-8 flex items-center truncate"
                            title={t('purchasing.request.convertUomSameAsPrimary')}
                          >
                            {row.unit?.trim() ? row.unit : '—'}
                          </div>
                        )}
                        {needsLengthAxisUi(row.bomUomKind, row.convertUomKind) && row.bomMdUomUuid && row.convertMdUomUuid && (
                          <Select
                            value={row.lengthAxis || 'length'}
                            onValueChange={(v) => void handleLengthAxisChange(i, v as LengthAxis)}
                          >
                            <SelectTrigger className="h-6 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="length">{t('purchasing.request.lengthAxisLength')}</SelectItem>
                              <SelectItem value="width">{t('purchasing.request.lengthAxisWidth')}</SelectItem>
                              <SelectItem value="thickness">{t('purchasing.request.lengthAxisThickness')}</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="p-1">
                      <Input type="number" value={row.quantity}
                        onChange={e => handleMatFieldChange(i, 'quantity', e.target.value)}
                        className="h-8 text-sm" />
                    </TableCell>
                    <TableCell className="p-1">
                      <SuggestInputWithQuickAdd value={row.manufacturer}
                        onChange={v => handleMatFieldChange(i, 'manufacturer', v)}
                        onSelect={item => handleMatSelect(i, 'manufacturer', item)}
                        type="manufacturer" quickAddType="manufacturer" placeholder={t('bom.manufacturer')} />
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
                <TableHead>{t('purchasing.request.date')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('bom.note')}</TableHead>
                <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('common.noData')}</TableCell></TableRow>
              ) : data.map(row => (
                <Collapsible key={row.uuid} open={expandedId === row.uuid} asChild>
                  <>
                    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => handleExpand(row.uuid)}>
                      <TableCell>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); handleExpand(row.uuid); }}>
                            {expandedId === row.uuid ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium">{row.code}</TableCell>
                      <TableCell className="font-mono text-sm">{row.requestDate?.slice(0, 10)}</TableCell>
                      <TableCell><StatusBadge status={prStatusMap[row.status] || 'draft'} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{prListRemarkText(row.remark)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => void handleEdit(row)} title={t('common.edit')}><Edit className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); void handleClone(row); }} title={t('bom.clone')}><Copy className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); toast.info(t('purchasing.request.deleteNotAvailable')); }} title={t('common.delete')}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    <CollapsibleContent asChild>
                      <tr>
                        <td colSpan={6} className="p-0">
                          {prItems[row.uuid] && renderPRDetailTable(prItems[row.uuid])}
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

      {/* BOM đã chọn trong phiên soạn PR */}
      <Dialog open={bomRefsDialogOpen} onOpenChange={setBomRefsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('purchasing.request.selectedBomListTitle')}</DialogTitle>
            <DialogDescription>{t('purchasing.request.selectedBomListDesc')}</DialogDescription>
          </DialogHeader>
          {prBomPickList.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">{t('common.noData')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>{t('purchasing.request.bomTemplate')}</TableHead>
                  <TableHead className="w-[120px] text-right">{t('purchasing.request.bomPickCount')}</TableHead>
                  <TableHead className="w-[80px]">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prBomPickList.map((row, idx) => (
                  <TableRow key={row.uuid}>
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">{row.label}</div>
                      <div className="text-xs font-mono text-muted-foreground truncate" title={row.uuid}>{row.uuid}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{row.count}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {row.picks.map((p) => (
                          <Button
                            key={p.pickId}
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            disabled={p.hydrated}
                            title={p.hydrated ? t('purchasing.request.bomHydratedReadonly') : t('purchasing.request.removeBomPickConfirm')}
                            onClick={() => removePrBomPick(p.pickId)}
                          >
                            <Undo2 className="h-3 w-3 mr-1" />
                            {t('purchasing.request.removeBomPick')}
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBomRefsDialogOpen(false)}>{t('common.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excel Import Preview for Materials */}
      <ExcelImportPreview
        open={matImportOpen}
        onOpenChange={setMatImportOpen}
        importType="purchase_request_import"
        onConfirm={handleMatExcelImport}
      />
    </div>
  );
}
