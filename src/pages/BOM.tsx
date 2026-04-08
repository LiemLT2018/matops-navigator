import { useState, useEffect, useCallback } from 'react';
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
import {
  productBomTemplateService,
  productBomTemplateLineService,
  businessPartnerService,
} from '@/api/services';
import { getAccessToken, getAuthUser } from '@/lib/authStorage';
import type {
  ProductBomTemplateLineListRow,
  ProductBomTemplateListRow,
  ProductBomTemplateCreateBody,
  ProductBomTemplateLineMutateBody,
  BusinessPartnerDetail,
} from '@/types/models';
import { EdTypeFind } from '@/types/models';
import type { BOMDetail, BOMChildRef } from '@/api/mockApi';

/** Hàng hiển thị — tương thích bảng UI */
interface BOMMaster {
  id: string;
  code: string;
  product: string;
  customer: string;
  version: string;
  status: string;
  createdDate: string;
  completedDate: string;
  itemCount: number;
  childBomCount: number;
}

const bomFilterToStatus: Record<string, number | undefined> = {
  all: undefined,
  draft: 0,
  pending: 1,
  in_progress: 2,
  approved: 3,
  completed: 3,
};

function bomStatusToBadge(s: number): string {
  switch (s) {
    case 0: return 'draft';
    case 1: return 'pending';
    case 2: return 'in_progress';
    case 3: return 'approved';
    default: return 'draft';
  }
}

function mapTemplateToMaster(row: ProductBomTemplateListRow, partnerNames: Record<string, string>): BOMMaster {
  const pid = row.mdBusinessPartnerUuid;
  const customer = pid && partnerNames[pid] ? partnerNames[pid] : '—';
  return {
    id: row.uuid,
    code: row.code,
    product: row.mdItem?.name ?? row.name,
    customer,
    version: row.revisionNo ? `${row.versionNo} r${row.revisionNo}` : row.versionNo,
    status: bomStatusToBadge(row.status),
    createdDate: row.createdAt ? new Date(row.createdAt).toLocaleDateString('vi-VN') : '—',
    completedDate: row.status === 3 && row.updatedAt ? new Date(row.updatedAt).toLocaleDateString('vi-VN') : '',
    itemCount: 0,
    childBomCount: 0,
  };
}

/** Chuẩn hóa dòng BOM từ API (hỗ trợ PascalCase nếu server / proxy không dùng camelCase). */
function normalizeBomLineFromApi(raw: unknown): ProductBomTemplateLineListRow {
  if (raw === null || typeof raw !== 'object') {
    return {
      uuid: '',
      mdProductBomTemplateUuid: '',
      mdItemUuid: null,
      mdUomUuid: '',
      lineNo: 0,
      qtyPer: 0,
      lossRate: 0,
      code: null,
      remark: null,
      mdItem: null,
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
  const mUuid = r.mdItemUuid ?? r.MdItemUuid;
  return {
    uuid: String(r.uuid ?? r.Uuid ?? ''),
    mdProductBomTemplateUuid: String(r.mdProductBomTemplateUuid ?? r.MdProductBomTemplateUuid ?? ''),
    mdItemUuid: mUuid === null || mUuid === undefined ? null : String(mUuid),
    mdItemAliasUuid: (r.mdItemAliasUuid ?? r.MdItemAliasUuid) as string | null | undefined,
    mdUomUuid: String(r.mdUomUuid ?? r.MdUomUuid ?? ''),
    lineNo: Number(r.lineNo ?? r.LineNo ?? 0),
    qtyPer: Number(r.qtyPer ?? r.QtyPer ?? 0),
    lossRate: Number(r.lossRate ?? r.LossRate ?? 0),
    code: (r.code ?? r.Code ?? null) as string | null,
    remark: (r.remark ?? r.Remark ?? null) as string | null,
    mdItem: normRef(r.mdItem ?? r.MdItem),
    mdItemAlias: normAlias(r.mdItemAlias ?? r.MdItemAlias),
    mdUom: normRef(r.mdUom ?? r.MdUom),
  };
}

function mapLineToBOMDetail(line: ProductBomTemplateLineListRow): BOMDetail {
  const q = Number(line.qtyPer);
  return {
    id: line.uuid,
    level: 1,
    materialCode: line.mdItem?.code ?? line.code ?? '',
    materialName: line.mdItem?.name ?? line.mdItemAlias?.name ?? '',
    specification: '',
    unit: line.mdUom?.name ?? line.mdUom?.code ?? '',
    quantity: Number.isFinite(q) ? q : 0,
    note: line.remark ?? '',
  };
}

/** GET template chi tiết: hỗ trợ PascalCase trên header (mdItem). */
function templateHeaderFields(raw: ProductBomTemplateListRow): { product: string; version: string } {
  const r = raw as unknown as Record<string, unknown>;
  const mdItem = (r.mdItem ?? r.MdItem) as Record<string, unknown> | undefined;
  const fromItem = mdItem ? String(mdItem.name ?? mdItem.Name ?? '') : '';
  const name = String(r.name ?? r.Name ?? raw.name ?? '');
  const version = String(r.versionNo ?? r.VersionNo ?? raw.versionNo ?? '');
  return { product: fromItem || name, version };
}

/** Header + UUID các dòng hiện có trên server (để xóa dòng bị bỏ khi lưu). */
function buildEditingSnapshot(detail: unknown, lineRows: unknown[]): EditingBomSnapshot {
  const r = detail as Record<string, unknown>;
  const initialLineUuids = lineRows
    .map(x => {
      const o = x as Record<string, unknown>;
      return String(o.uuid ?? o.Uuid ?? '');
    })
    .filter(Boolean);
  return {
    mdCompanyUuid: String(r.mdCompanyUuid ?? r.MdCompanyUuid ?? ''),
    mdItemUuid: String(r.mdItemUuid ?? r.MdItemUuid ?? ''),
    code: String(r.code ?? r.Code ?? ''),
    revisionNo: Number(r.revisionNo ?? r.RevisionNo ?? 0),
    status: Number(r.status ?? r.Status ?? 0),
    initialLineUuids,
  };
}
import { Plus, Search, ChevronDown, ChevronRight, Upload, LayoutGrid, List, Edit, Copy, Trash2, Download, X, Save, FileSpreadsheet } from 'lucide-react';
import type { DatePresetKey } from '@/types/api';
import { toast } from 'sonner';
import { SuggestInputText } from '@/components/SuggestInputText';
import { SuggestInputWithQuickAdd } from '@/components/SuggestInputWithQuickAdd';
import type { SuggestData } from '@/api/suggestApi';
import { ExcelImportPreview } from '@/components/ExcelImportPreview';
import type { ParsedRow } from '@/utils/excelParser';
import { MatOpsApiError, ApiEnvelopeError } from '@/lib/apiClient';

type DateFilter = DatePresetKey | 'all';

interface FormChildBOM {
  _key: string;
  /** UUID của BOM template con (để lưu quan hệ xuống backend). */
  childTemplateUuid: string;
  /** Mã BOM hiển thị (BOMxxx). */
  bomCode: string;
  /** Text hiển thị (code — name). */
  bomName: string;
  quantity: string;
  unit: string;
  note: string;
}
interface FormMaterial {
  _key: string;
  /** UUID dòng BOM trên server (khi sửa); dòng mới không có */
  lineUuid?: string;
  /** Mã vật tư hiển thị (mdItem.code) */
  itemCode: string;
  /** UUID vật tư (mdItemUuid) — dùng khi lưu API */
  materialCode: string;
  materialName: string;
  specification: string;
  unit: string;
  mdUomUuid: string;
  quantity: string;
  manufacturer: string;
  note: string;
}

/** Snapshot header + danh sách dòng cũ để PUT header và đồng bộ dòng */
interface EditingBomSnapshot {
  mdCompanyUuid: string;
  mdItemUuid: string;
  code: string;
  revisionNo: number;
  status: number;
  initialLineUuids: string[];
}

const emptyChildBOM = (): FormChildBOM => ({ _key: crypto.randomUUID(), childTemplateUuid: '', bomCode: '', bomName: '', quantity: '', unit: 'Bộ', note: '' });
const emptyMaterial = (): FormMaterial => ({
  _key: crypto.randomUUID(),
  itemCode: '',
  materialCode: '',
  materialName: '',
  specification: '',
  unit: '',
  mdUomUuid: '',
  quantity: '',
  manufacturer: '',
  note: '',
});

// Old SuggestInput removed — now using SuggestInputText component

// BOMSuggestInput removed — now using SuggestInputText with type="bom"

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
  const [editingSnapshot, setEditingSnapshot] = useState<EditingBomSnapshot | null>(null);

  /** Khách hàng (đối tác) — dùng cho Select và map tên trên lưới */
  const [customers, setCustomers] = useState<BusinessPartnerDetail[]>([]);

  // Form state
  const [formProduct, setFormProduct] = useState('');
  /** UUID đối tác khách hàng; rỗng = không gán */
  const [formCustomerUuid, setFormCustomerUuid] = useState('');
  const [formVersion, setFormVersion] = useState('v1.0');
  const [formChildBOMs, setFormChildBOMs] = useState<FormChildBOM[]>([emptyChildBOM()]);
  const [committedMaterials, setCommittedMaterials] = useState<FormMaterial[]>([]);
  const [draftMaterial, setDraftMaterial] = useState<FormMaterial>(() => emptyMaterial());

  // Excel import for materials
  const [matImportOpen, setMatImportOpen] = useState(false);



  const loadData = useCallback(async () => {
    try {
      const user = getAuthUser();
      const statusNum = bomFilterToStatus[statusFilter];
      const partnerQuery =
        user?.mdCompanyUuid
          ? businessPartnerService.list({
              mdCompanyUuid: user.mdCompanyUuid,
              isPaging: 0,
              pageSize: 500,
              typeFind: EdTypeFind.LIST,
              type: '0,1',
            })
          : Promise.resolve({ items: [] as BusinessPartnerDetail[], pagination: { totalCount: 0, totalPage: 1 } });

      const [res, bpRes] = await Promise.all([
        productBomTemplateService.list({
          pageIndex: page,
          pageSize: 10,
          isPaging: 1,
          typeFind: EdTypeFind.DETAIL_LIST,
          keyword: search || undefined,
          status: statusNum,
          mdCompanyUuid: user?.mdCompanyUuid,
        }),
        partnerQuery,
      ]);

      const list = (bpRes.items ?? []) as BusinessPartnerDetail[];
      setCustomers(list);
      const partnerNames: Record<string, string> = {};
      for (const p of list) partnerNames[p.uuid] = p.name;

      setData(
        res.items.map(r =>
          mapTemplateToMaster(r as ProductBomTemplateListRow, partnerNames),
        ),
      );
      setTotalPages(res.pagination.totalPage);
      setTotalCount(res.pagination.totalCount);
    } catch {
      setData([]);
      toast.error(t('errors.system'));
    }
  }, [page, statusFilter, search, t]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    if (!bomDetails[id]) {
      try {
        const lineRes = await productBomTemplateLineService.list({
          mdProductBomTemplateUuid: id,
          isPaging: 0,
          pageSize: 500,
          typeFind: EdTypeFind.LIST,
        });
        setBomDetails(prev => ({
          ...prev,
          [id]: lineRes.items.map(d => mapLineToBOMDetail(normalizeBomLineFromApi(d))),
        }));
        setBomChildRefs(prev => ({ ...prev, [id]: [] as BOMChildRef[] }));
      } catch {
        toast.error(t('errors.system'));
      }
    }
    setExpandedId(id);
  };

  /** Mở form sửa BOM (dùng từ nút Sửa hoặc click dòng ở chế độ Master). Luôn tải API — không phụ thuộc viewMode. */
  const handleMasterClick = async (row: BOMMaster) => {
    try {
      const [detail, lineRes] = await Promise.all([
        productBomTemplateService.get(row.id),
        productBomTemplateLineService.list({
          mdProductBomTemplateUuid: row.id,
          isPaging: 0,
          pageSize: 500,
          typeFind: EdTypeFind.LIST,
        }),
      ]);
      setEditingBOM(row);
      setEditingSnapshot(buildEditingSnapshot(detail, lineRes.items));
      const hdr = templateHeaderFields(detail as ProductBomTemplateListRow);
      setFormProduct(hdr.product);
      setFormVersion(hdr.version);
      const dRow = detail as ProductBomTemplateListRow;
      const raw = detail as unknown as Record<string, unknown>;
      const bp =
        dRow.mdBusinessPartnerUuid ??
        (raw.mdBusinessPartnerUuid as string | undefined) ??
        (raw.MdBusinessPartnerUuid as string | undefined);
      setFormCustomerUuid(bp ? String(bp) : '');
      const childRefsRaw = (raw.childRefs ?? raw.ChildRefs) as unknown;
      const childRefs = Array.isArray(childRefsRaw) ? (childRefsRaw as Array<Record<string, unknown>>) : [];
      const mappedChildRows = childRefs
        .map((c) => {
          const childUuid = String(c.mdChildProductBomTemplateUuid ?? c.MdChildProductBomTemplateUuid ?? '');
          const qty = String(c.qtyPer ?? c.QtyPer ?? '');
          const unit = String(c.unitName ?? c.UnitName ?? 'Bộ');
          const note = String(c.remark ?? c.Remark ?? '');
          const childCode = String(c.childCode ?? c.ChildCode ?? '');
          const childName = String(c.childName ?? c.ChildName ?? '');
          const displayName = childCode && childName ? `${childCode} — ${childName}` : (childName || childCode);
          return {
            _key: crypto.randomUUID(),
            childTemplateUuid: childUuid,
            bomCode: childCode,
            bomName: displayName,
            quantity: qty,
            unit,
            note,
          } satisfies FormChildBOM;
        })
        .filter(r => r.childTemplateUuid);
      setFormChildBOMs(mappedChildRows.length > 0 ? [...mappedChildRows, emptyChildBOM()] : [emptyChildBOM()]);
      setCommittedMaterials(lineRes.items.map(raw => {
        const d = normalizeBomLineFromApi(raw);
        return {
          _key: crypto.randomUUID(),
          lineUuid: d.uuid || undefined,
          itemCode: d.mdItem?.code ?? '',
          materialCode: d.mdItemUuid ?? '',
          materialName: d.mdItem?.name ?? d.mdItemAlias?.name ?? '',
          specification: '',
          unit: d.mdUom?.name ?? d.mdUom?.code ?? '',
          mdUomUuid: d.mdUomUuid ?? '',
          quantity: String(d.qtyPer ?? ''),
          manufacturer: '',
          note: d.remark ?? '',
        };
      }));
      setDraftMaterial(emptyMaterial());
      setShowForm(true);
    } catch {
      toast.error(t('errors.system'));
    }
  };

  const handleCreate = () => {
    setEditingBOM(null);
    setEditingSnapshot(null);
    setFormProduct(''); setFormCustomerUuid(''); setFormVersion('v1.0');
    setFormChildBOMs([emptyChildBOM()]);
    setCommittedMaterials([]);
    setDraftMaterial(emptyMaterial());
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingBOM(null);
    setEditingSnapshot(null);
  };

  const focusDraftMaterialName = () => {
    requestAnimationFrame(() => {
      document.getElementById('bom-draft-material-name')?.focus();
    });
  };

  const handleSave = async () => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug('[bom] save clicked', {
        editing: !!editingBOM,
        hasSnapshot: !!editingSnapshot,
        committedMaterials: committedMaterials.length,
        formChildBOMs: formChildBOMs.length,
      });
    }
    const user = getAuthUser();
    const mdCompanyUuid = user?.mdCompanyUuid || editingSnapshot?.mdCompanyUuid || '';
    if (!user) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[bom] save blocked: missing user', { token: !!getAccessToken() });
      }
      toast.error(t('errors.system') + ': Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
      return;
    }
    if (!mdCompanyUuid) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[bom] save blocked: missing mdCompanyUuid', { user, token: !!getAccessToken() });
      }
      toast.error(t('errors.system'));
      return;
    }
    if (editingBOM && !editingSnapshot) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[bom] save blocked: editingSnapshot is null', { editingBOM });
      }
      toast.error(t('errors.system') + ': ' + 'Không tải được dữ liệu BOM để sửa, vui lòng đóng form và mở lại.');
      return;
    }
    const childRefs = formChildBOMs
      .filter(r => r.childTemplateUuid && r.quantity)
      .map(r => ({
        mdChildProductBomTemplateUuid: r.childTemplateUuid,
        qtyPer: Number(r.quantity),
        unitName: r.unit || 'Bộ',
        remark: r.note || undefined,
      }));
    // If the user filled the draft row but forgot to click "Add to BOM",
    // include it automatically so "Save" matches user expectations.
    const effectiveMaterials = isMaterialRowComplete(draftMaterial)
      ? [...committedMaterials, { ...draftMaterial }]
      : [...committedMaterials];
    const rows = effectiveMaterials.filter(r => r.materialName || r.quantity);
    if (rows.length === 0) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[bom] save blocked: no material rows after filter', { committedMaterials });
      }
      toast.warning(t('bom.fillAllFields') + ': ' + t('bom.materialList'));
      return;
    }
    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const qty = Number(row.quantity);
      if (!row.materialName?.trim() || !row.quantity || !Number.isFinite(qty) || qty <= 0 || !row.mdUomUuid) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug('[bom] save blocked: invalid material row', { idx, row });
        }
        toast.warning(`${t('bom.fillAllFields')}: ${t('bom.materialList')} #${idx + 1}`);
        return;
      }
    }
    for (let idx = 0; idx < childRefs.length; idx++) {
      const r = childRefs[idx];
      if (!r.mdChildProductBomTemplateUuid || !Number.isFinite(r.qtyPer) || r.qtyPer <= 0) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug('[bom] save blocked: invalid child ref', { idx, r });
        }
        toast.warning(`${t('bom.fillAllFields')}: ${t('bom.childBOMs')} #${idx + 1}`);
        return;
      }
    }
    try {
      if (editingBOM && editingSnapshot) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug('[bom] saving: update template', { uuid: editingBOM.id, childRefsCount: childRefs.length, materialRows: rows.length });
        }
        await productBomTemplateService.update(editingBOM.id, {
          mdCompanyUuid,
          mdItemUuid: editingSnapshot.mdItemUuid || undefined,
          mdBusinessPartnerUuid: formCustomerUuid || null,
          code: editingSnapshot.code,
          name: formProduct.trim() || 'BOM',
          versionNo: formVersion.trim() || 'v1',
          revisionNo: editingSnapshot.revisionNo,
          status: editingSnapshot.status,
          childRefs,
          lines: rows.map((row, i) => ({
            uuid: row.lineUuid || undefined,
            mdItemUuid: row.materialCode || undefined,
            name: row.materialCode ? undefined : row.materialName.trim(),
            mdUomUuid: row.mdUomUuid,
            qtyPer: Number(row.quantity),
            lossRate: 0,
            lineNo: i + 1,
            remark: row.note || undefined,
          })),
        });

        toast.success(`${t('bom.editBOM')} ${t('errors.success')}`);
        setShowForm(false);
        setEditingBOM(null);
        setEditingSnapshot(null);
        await loadData();
        return;
      }

      const body: ProductBomTemplateCreateBody = {
        mdCompanyUuid,
        mdBusinessPartnerUuid: formCustomerUuid || null,
        name: formProduct.trim() || 'BOM',
        versionNo: formVersion.trim() || 'v1',
        revisionNo: 0,
        status: 1,
        childRefs,
        lines: rows.map((row, i) => ({
          mdItemUuid: row.materialCode || undefined,
          name: row.materialCode ? undefined : row.materialName.trim(),
          mdUomUuid: row.mdUomUuid,
          qtyPer: Number(row.quantity),
          lossRate: 0,
          lineNo: i + 1,
          remark: row.note || undefined,
        })),
      };
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[bom] saving: create template', { childRefsCount: childRefs.length, materialRows: rows.length });
      }
      await productBomTemplateService.create(body);
      toast.success(t('bom.createBOM') + ' ' + t('errors.success'));
      setShowForm(false);
      setEditingBOM(null);
      await loadData();
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error('[bom] save error', err);
      // Surface backend errorCode/message instead of a generic system error.
      if (err instanceof MatOpsApiError) {
        toast.error(`${t('errors.system')}: ${err.errorMessage || err.message} (code ${err.errorCode})`);
        return;
      }
      if (err instanceof ApiEnvelopeError) {
        toast.error(`${t('errors.system')}: ${err.message || 'Request failed'}`);
        return;
      }
      // Axios error with response data
      if (err && typeof err === 'object' && 'response' in err) {
        const axErr = err as { response?: { data?: { errorMessage?: string; errorCode?: number }; status?: number } };
        const serverMsg = axErr.response?.data?.errorMessage;
        if (serverMsg) {
          toast.error(`${t('errors.system')}: ${serverMsg} (code ${axErr.response?.data?.errorCode})`);
          return;
        }
      }
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message ?? '')
          : '';
      toast.error(msg ? `${t('errors.system')}: ${msg}` : t('errors.system'));
    }
  };

  const handleDraftMatFieldChange = (field: keyof FormMaterial, value: string) => {
    setDraftMaterial(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'materialName') {
        next.materialCode = '';
        next.mdUomUuid = '';
      }
      if (field === 'unit') {
        next.mdUomUuid = '';
      }
      return next;
    });
  };

  const handleCommittedMatFieldChange = (index: number, field: keyof FormMaterial, value: string) => {
    setCommittedMaterials(prev => {
      const u = [...prev];
      u[index] = { ...u[index], [field]: value };
      if (field === 'materialName') {
        u[index].materialCode = '';
        u[index].mdUomUuid = '';
      }
      if (field === 'unit') {
        u[index].mdUomUuid = '';
      }
      return u;
    });
  };

  const handleDraftMatSuggestSelect = (field: keyof FormMaterial, item: SuggestData) => {
    if (field === 'materialName') {
      setDraftMaterial(prev => ({
        ...prev,
        materialName: item.name,
        materialCode: item.uuid,
        specification: item.specification ?? prev.specification,
        unit: item.unitName ?? prev.unit,
        mdUomUuid: item.mdUomUuid ?? prev.mdUomUuid,
        manufacturer: item.manufacturer ?? prev.manufacturer,
      }));
      return;
    }
    if (field === 'unit') {
      setDraftMaterial(prev => ({ ...prev, unit: item.name, mdUomUuid: item.uuid }));
      return;
    }
    setDraftMaterial(prev => ({ ...prev, [field]: item.name }));
  };

  const handleCommittedMatSuggestSelect = (index: number, field: keyof FormMaterial, item: SuggestData) => {
    if (field === 'materialName') {
      setCommittedMaterials(prev => {
        const u = [...prev];
        u[index] = {
          ...u[index],
          materialName: item.name,
          materialCode: item.uuid,
          specification: item.specification ?? u[index].specification,
          unit: item.unitName ?? u[index].unit,
          mdUomUuid: item.mdUomUuid ?? u[index].mdUomUuid,
          manufacturer: item.manufacturer ?? u[index].manufacturer,
        };
        return u;
      });
      return;
    }
    if (field === 'unit') {
      setCommittedMaterials(prev => {
        const u = [...prev];
        u[index] = { ...u[index], unit: item.name, mdUomUuid: item.uuid };
        return u;
      });
      return;
    }
    setCommittedMaterials(prev => {
      const u = [...prev];
      u[index] = { ...u[index], [field]: item.name };
      return u;
    });
  };

  const isMaterialRowComplete = (row: FormMaterial) =>
    !!row.materialName?.trim() && !!row.quantity && !!row.mdUomUuid;

  const addMaterialToBom = () => {
    if (!isMaterialRowComplete(draftMaterial)) {
      toast.warning(t('bom.fillAllFields'));
      return;
    }
    setCommittedMaterials(prev => [...prev, { ...draftMaterial, _key: crypto.randomUUID() }]);
    setDraftMaterial(emptyMaterial());
    focusDraftMaterialName();
  };

  // BOM suggest handler
  const handleBomSuggestSelect = (index: number, item: SuggestData) => {
    const updated = [...formChildBOMs];
    // show BOM code in the "code" column; keep name as display text
    updated[index] = { ...updated[index], childTemplateUuid: item.uuid, bomCode: item.rawText || '', bomName: item.name };
    setFormChildBOMs(updated);
  };

  const handleBomNameChange = (index: number, value: string) => {
    const updated = [...formChildBOMs];
    updated[index] = { ...updated[index], bomName: value, bomCode: '', childTemplateUuid: '' };
    setFormChildBOMs(updated);
  };

  const isChildBOMRowComplete = (row: FormChildBOM) => !!row.childTemplateUuid && !!row.quantity;

  const addChildBOMRow = () => {
    const last = formChildBOMs[formChildBOMs.length - 1];
    if (last && !isChildBOMRowComplete(last)) { toast.warning(t('bom.fillAllFields')); return; }
    setFormChildBOMs([...formChildBOMs, emptyChildBOM()]);
  };

  const handleChildBOMLastFieldTab = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && !e.shiftKey && index === formChildBOMs.length - 1) {
      if (isChildBOMRowComplete(formChildBOMs[index])) {
        e.preventDefault();
        setFormChildBOMs(prev => [...prev, emptyChildBOM()]);
        setTimeout(() => {
          const table = document.querySelector('[data-bom-child-table]');
          if (table) {
            const rows = table.querySelectorAll('tbody tr');
            const lastRow = rows[rows.length - 1];
            const firstInput = lastRow?.querySelector('input:not([disabled])');
            if (firstInput) (firstInput as HTMLElement).focus();
          }
        }, 50);
      }
    }
  }, [formChildBOMs]);

  const handleMatExcelImport = useCallback((parsedRows: ParsedRow[]) => {
    setCommittedMaterials(prev => {
      let current = [...prev];
      for (const pr of parsedRows) {
        const existIdx = current.findIndex(r => r.materialCode === pr.materialUuid && r.materialCode);
        if (existIdx >= 0) {
          const existing = current[existIdx];
          current[existIdx] = { ...existing, quantity: String(Number(existing.quantity || 0) + pr.quantity) };
        } else {
          current.push({
            _key: crypto.randomUUID(),
            itemCode: '',
            materialCode: pr.materialUuid,
            materialName: pr.materialName,
            specification: pr.specification,
            unit: pr.unit,
            mdUomUuid: pr.unitUuid || '',
            quantity: String(pr.quantity),
            manufacturer: pr.manufacturer,
            note: '',
          });
        }
      }
      return current;
    });
  }, []);

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
            <Select
              value={formCustomerUuid || '__none__'}
              onValueChange={v => setFormCustomerUuid(v === '__none__' ? '' : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('bom.selectCustomer')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t('bom.noCustomer')}</SelectItem>
                {customers.map(c => (
                  <SelectItem key={c.uuid} value={c.uuid}>
                    {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <div className="border border-border rounded-md overflow-hidden" data-bom-child-table>
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
                      <SuggestInputText value={row.bomName}
                        onChange={v => handleBomNameChange(i, v)}
                        onSelect={item => handleBomSuggestSelect(i, item)}
                        type="bom" minChars={0} placeholder={t('bom.bomName')} />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input type="number" value={row.quantity} onChange={e => { const u = [...formChildBOMs]; u[i] = { ...u[i], quantity: e.target.value }; setFormChildBOMs(u); }} className="h-8 text-sm" />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input value={row.unit} onChange={e => { const u = [...formChildBOMs]; u[i] = { ...u[i], unit: e.target.value }; setFormChildBOMs(u); }} className="h-8 text-sm" />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input value={row.note} onChange={e => { const u = [...formChildBOMs]; u[i] = { ...u[i], note: e.target.value }; setFormChildBOMs(u); }} onKeyDown={e => handleChildBOMLastFieldTab(i, e)} className="h-8 text-sm" />
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

        {/* Materials: committed rows + draft row (sequential entry) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">{t('bom.materialList')}</h3>
            <Button variant="outline" size="sm" onClick={() => setMatImportOpen(true)}><FileSpreadsheet className="h-3 w-3 mr-1" />{t('excelImport.importExcelMaterials')}</Button>
          </div>
          <div className="border border-border rounded-md overflow-hidden" data-bom-material-table>
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
                {committedMaterials.map((row, i) => (
                  <TableRow key={row._key}>
                    <TableCell className="p-1"><Input value={row.itemCode || '—'} disabled className="h-8 text-sm font-mono bg-muted/50" title={row.materialCode} /></TableCell>
                    <TableCell className="p-1">
                      <SuggestInputWithQuickAdd value={row.materialName} selectedUuid={row.materialCode}
                        onChange={v => handleCommittedMatFieldChange(i, 'materialName', v)}
                        onSelect={item => handleCommittedMatSuggestSelect(i, 'materialName', item)}
                        type="material" quickAddType="material" placeholder={t('bom.materialName')} />
                    </TableCell>
                    <TableCell className="p-1">
                      <SuggestInputWithQuickAdd value={row.specification}
                        onChange={v => handleCommittedMatFieldChange(i, 'specification', v)}
                        onSelect={item => handleCommittedMatSuggestSelect(i, 'specification', item)}
                        type="specification" quickAddType="specification"
                        materialUuid={row.materialCode}
                        placeholder={t('bom.specification')} />
                    </TableCell>
                    <TableCell className="p-1">
                      <SuggestInputWithQuickAdd value={row.unit} selectedUuid={row.mdUomUuid}
                        onChange={v => handleCommittedMatFieldChange(i, 'unit', v)}
                        onSelect={item => handleCommittedMatSuggestSelect(i, 'unit', item)}
                        type="unit" quickAddType="unit" placeholder={t('bom.unit')} />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input type="number" value={row.quantity} onChange={e => handleCommittedMatFieldChange(i, 'quantity', e.target.value)} className="h-8 text-sm" />
                    </TableCell>
                    <TableCell className="p-1">
                      <SuggestInputWithQuickAdd value={row.manufacturer}
                        onChange={v => handleCommittedMatFieldChange(i, 'manufacturer', v)}
                        onSelect={item => handleCommittedMatSuggestSelect(i, 'manufacturer', item)}
                        type="manufacturer" quickAddType="manufacturer" placeholder={t('bom.manufacturer')} />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input value={row.note} onChange={e => handleCommittedMatFieldChange(i, 'note', e.target.value)} className="h-8 text-sm" />
                    </TableCell>
                    <TableCell className="p-1">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCommittedMaterials([...committedMaterials, { ...row, _key: crypto.randomUUID(), lineUuid: undefined }])}><Copy className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setCommittedMaterials(committedMaterials.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/20">
                  <TableCell className="p-1"><Input value={draftMaterial.itemCode || '—'} disabled className="h-8 text-sm font-mono bg-muted/50" title={draftMaterial.materialCode} /></TableCell>
                  <TableCell className="p-1">
                    <SuggestInputWithQuickAdd id="bom-draft-material-name" value={draftMaterial.materialName} selectedUuid={draftMaterial.materialCode}
                      onChange={v => handleDraftMatFieldChange('materialName', v)}
                      onSelect={item => handleDraftMatSuggestSelect('materialName', item)}
                      type="material" quickAddType="material" placeholder={t('bom.materialName')} />
                  </TableCell>
                  <TableCell className="p-1">
                    <SuggestInputWithQuickAdd value={draftMaterial.specification}
                      onChange={v => handleDraftMatFieldChange('specification', v)}
                      onSelect={item => handleDraftMatSuggestSelect('specification', item)}
                      type="specification" quickAddType="specification"
                      materialUuid={draftMaterial.materialCode}
                      placeholder={t('bom.specification')} />
                  </TableCell>
                  <TableCell className="p-1">
                    <SuggestInputWithQuickAdd value={draftMaterial.unit} selectedUuid={draftMaterial.mdUomUuid}
                      onChange={v => handleDraftMatFieldChange('unit', v)}
                      onSelect={item => handleDraftMatSuggestSelect('unit', item)}
                      type="unit" quickAddType="unit" placeholder={t('bom.unit')} />
                  </TableCell>
                  <TableCell className="p-1">
                    <Input type="number" value={draftMaterial.quantity} onChange={e => handleDraftMatFieldChange('quantity', e.target.value)} className="h-8 text-sm" />
                  </TableCell>
                  <TableCell className="p-1">
                    <SuggestInputWithQuickAdd value={draftMaterial.manufacturer}
                      onChange={v => handleDraftMatFieldChange('manufacturer', v)}
                      onSelect={item => handleDraftMatSuggestSelect('manufacturer', item)}
                      type="manufacturer" quickAddType="manufacturer" placeholder={t('bom.manufacturer')} />
                  </TableCell>
                  <TableCell className="p-1">
                    <Input value={draftMaterial.note} onChange={e => handleDraftMatFieldChange('note', e.target.value)} className="h-8 text-sm" />
                  </TableCell>
                  <TableCell className="p-1">
                    <Button type="button" size="sm" className="h-8 whitespace-nowrap" onClick={addMaterialToBom}>{t('bom.addToBOM')}</Button>
                  </TableCell>
                </TableRow>
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

      {/* Excel Import Preview for Materials */}
      <ExcelImportPreview
        open={matImportOpen}
        onOpenChange={setMatImportOpen}
        importType="bom_import"
        onConfirm={handleMatExcelImport}
      />
    </div>
  );
}
