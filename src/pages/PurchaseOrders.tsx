import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { purchaseOrderService, businessPartnerService } from '@/api/services';
import { MatOpsApiError } from '@/lib/apiClient';
import { resolveMdCompanyUuidForApi } from '@/lib/authStorage';
import { BUSINESS_PARTNER_LIST_TYPES_SUPPLIER } from '@/constants/businessPartner';
import type {
  PurchaseOrderListRow,
  PurchaseOrderDetailData,
  PurchaseOrderLineDetail,
} from '@/types/models';
import { EdTypeFind } from '@/types/models';
import type { BusinessPartnerDetail } from '@/types/models';
import { formatCurrency } from '@/utils/formatNumber';
import { NumberDisplay } from '@/components/NumberDisplay';
import { Plus, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { SuggestInputWithQuickAdd } from '@/components/SuggestInputWithQuickAdd';
import type { SuggestData } from '@/api/suggestApi';
import { appendItemSearchPhraseFromSuggest } from '@/utils/appendItemSearchPhrase';

function todayLocalIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Khớp `PurchaseOrderHeaderStatus` backend. */
function poStatusToBadge(status: number): string {
  switch (status) {
    case 0: return 'draft';
    case 1: return 'approved';
    case 2: return 'cancelled';
    case 3: return 'completed';
    default: return 'inactive';
  }
}

function linesSubtotal(lines: PurchaseOrderLineDetail[]): number {
  return lines.reduce((sum, l) => {
    const price = l.unitPrice != null ? Number(l.unitPrice) : 0;
    return sum + Number(l.orderedQty) * price;
  }, 0);
}

interface CreateLineForm {
  materialUuid: string;
  materialName: string;
  mdUomUuid: string;
  unit: string;
  qty: string;
  unitPrice: string;
  description: string;
}

const emptyCreateLine = (): CreateLineForm => ({
  materialUuid: '',
  materialName: '',
  mdUomUuid: '',
  unit: '',
  qty: '1',
  unitPrice: '',
  description: '',
});

export default function PurchaseOrdersPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<PurchaseOrderListRow[]>([]);
  const [partnerNames, setPartnerNames] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<Record<string, PurchaseOrderDetailData>>({});

  const [createOpen, setCreateOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<BusinessPartnerDetail[]>([]);
  const [createBpUuid, setCreateBpUuid] = useState('');
  const [createCurrency, setCreateCurrency] = useState('VND');
  const [createExpected, setCreateExpected] = useState('');
  const [createRemark, setCreateRemark] = useState('');
  const [createLine, setCreateLine] = useState<CreateLineForm>(emptyCreateLine);
  const [createSaving, setCreateSaving] = useState(false);

  const poStatusMap: Record<number, string> = {
    0: 'draft', 1: 'approved', 2: 'cancelled', 3: 'completed',
  };
  const statusOptions = ['all', 'draft', 'approved', 'cancelled', 'completed'] as const;

  const loadData = useCallback(async () => {
    try {
      const statusNum = statusFilter !== 'all'
        ? Object.entries(poStatusMap).find(([, v]) => v === statusFilter)?.[0]
        : undefined;
      const res = await purchaseOrderService.list({
        pageIndex: page,
        pageSize: 10,
        keyword: search || undefined,
        status: statusNum !== undefined ? Number(statusNum) : undefined,
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
  }, [page, search, statusFilter, t]);

  useEffect(() => { void loadData(); }, [loadData]);

  useEffect(() => {
    if (data.length === 0) return;
    const ids = [...new Set(data.map(d => d.mdBusinessPartnerUuid))];
    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        ids.map(async (id) => {
          try {
            const p = await businessPartnerService.get(id);
            return [id, p.name ?? p.code ?? id] as const;
          } catch {
            return [id, `${id.slice(0, 8)}…`] as const;
          }
        }),
      );
      if (cancelled) return;
      setPartnerNames((prev) => {
        const next = { ...prev };
        for (const [k, v] of entries) next[k] = v;
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [data]);

  useEffect(() => {
    if (!createOpen) return;
    const mdCompanyUuid = resolveMdCompanyUuidForApi();
    let cancelled = false;
    void businessPartnerService.list({
      ...(mdCompanyUuid ? { mdCompanyUuid } : {}),
      isPaging: 1,
      pageIndex: 1,
      pageSize: 300,
      typeFind: EdTypeFind.LIST,
      types: [...BUSINESS_PARTNER_LIST_TYPES_SUPPLIER],
    }).then((r) => {
      if (!cancelled) setSuppliers(r.items);
    }).catch(() => {
      if (!cancelled) setSuppliers([]);
    });
    return () => { cancelled = true; };
  }, [createOpen]);

  const handleExpand = async (uuid: string) => {
    if (expandedId === uuid) {
      setExpandedId(null);
      return;
    }
    if (!orderDetails[uuid]) {
      try {
        const detail = await purchaseOrderService.get(uuid);
        setOrderDetails((prev) => ({ ...prev, [uuid]: detail }));
      } catch (e) {
        if (e instanceof MatOpsApiError) {
          toast.error(e.errorMessage || t('errors.system'));
        } else {
          toast.error(t('errors.system'));
        }
        return;
      }
    }
    setExpandedId(uuid);
  };

  const refreshDetail = async (uuid: string) => {
    try {
      const detail = await purchaseOrderService.get(uuid);
      setOrderDetails((prev) => ({ ...prev, [uuid]: detail }));
      await loadData();
    } catch (e) {
      if (e instanceof MatOpsApiError) {
        toast.error(e.errorMessage || t('errors.system'));
      } else {
        toast.error(t('errors.system'));
      }
    }
  };

  const handleApprove = async (uuid: string) => {
    try {
      await purchaseOrderService.approve(uuid);
      toast.success(t('errors.success'));
      await refreshDetail(uuid);
    } catch (e) {
      if (e instanceof MatOpsApiError) {
        toast.error(e.errorMessage || t('errors.system'));
      } else {
        toast.error(t('errors.system'));
      }
    }
  };

  const handleCancel = async (uuid: string) => {
    try {
      await purchaseOrderService.cancel(uuid);
      toast.success(t('errors.success'));
      await refreshDetail(uuid);
    } catch (e) {
      if (e instanceof MatOpsApiError) {
        toast.error(e.errorMessage || t('errors.system'));
      } else {
        toast.error(t('errors.system'));
      }
    }
  };

  const openCreate = () => {
    setCreateBpUuid('');
    setCreateCurrency('VND');
    setCreateExpected('');
    setCreateRemark('');
    setCreateLine(emptyCreateLine());
    setCreateOpen(true);
  };

  const handleCreateSave = async () => {
    const mdCompanyUuid = resolveMdCompanyUuidForApi();
    if (!mdCompanyUuid) {
      toast.error(t('errors.missingCompany'));
      return;
    }
    if (!createBpUuid) {
      toast.warning(t('purchasing.order.selectSupplier'));
      return;
    }
    const qty = Number(createLine.qty);
    const desc = createLine.description.trim() || createLine.materialName.trim();
    if (!createLine.mdUomUuid || !desc || !Number.isFinite(qty) || qty <= 0) {
      toast.warning(t('purchasing.order.fillLine'));
      return;
    }
    setCreateSaving(true);
    try {
      await purchaseOrderService.create({
        mdCompanyUuid,
        mdBusinessPartnerUuid: createBpUuid,
        orderDate: todayLocalIsoDate(),
        expectedDeliveryDate: createExpected.trim() ? createExpected.trim() : null,
        currencyCode: createCurrency.trim() || 'VND',
        remark: createRemark.trim() ? createRemark.trim() : null,
        lines: [{
          trxPurchaseRequestLineUuid: null,
          mdItemUuid: createLine.materialUuid.trim() ? createLine.materialUuid.trim() : null,
          mdUomUuid: createLine.mdUomUuid,
          description: desc,
          orderedQty: qty,
          unitPrice: createLine.unitPrice.trim() ? Number(createLine.unitPrice) : null,
          taxRate: null,
          remark: null,
        }],
      });
      toast.success(`${t('purchasing.order.createTitle')} — ${t('errors.success')}`);
      setCreateOpen(false);
      await loadData();
    } catch (e) {
      if (e instanceof MatOpsApiError) {
        toast.error(e.errorMessage || t('errors.system'));
      } else {
        toast.error(t('errors.system'));
      }
    } finally {
      setCreateSaving(false);
    }
  };

  const renderDetail = (detail: PurchaseOrderDetailData) => (
    <div className="bg-muted/30 p-4 border-t border-border space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">
          {t('purchasing.order.lineList')} ({detail.lines.length})
        </h4>
        <div className="flex flex-wrap gap-2">
          {detail.status === 0 && (
            <>
              <Button size="sm" variant="secondary" onClick={() => void handleApprove(detail.uuid)}>
                {t('purchasing.order.approve')}
              </Button>
              <Button size="sm" variant="outline" className="text-destructive" onClick={() => void handleCancel(detail.uuid)}>
                {t('purchasing.order.cancel')}
              </Button>
            </>
          )}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {t('purchasing.order.detailTotal')}:{' '}
        <span className="font-mono font-medium text-foreground">{formatCurrency(linesSubtotal(detail.lines))}</span>
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>{t('bom.materialName')}</TableHead>
            <TableHead>{t('purchasing.order.prLineLink')}</TableHead>
            <TableHead className="text-right">{t('purchasing.order.unitPrice')}</TableHead>
            <TableHead className="text-right">{t('purchasing.request.requestQty')}</TableHead>
            <TableHead className="text-right">{t('purchasing.order.totalAmount')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {detail.lines.map((line) => (
            <TableRow key={line.uuid}>
              <TableCell className="font-mono text-sm">{line.lineNo}</TableCell>
              <TableCell className="text-sm">{line.description}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {line.trxPurchaseRequestLineUuid
                  ? `${line.trxPurchaseRequestLineUuid.slice(0, 8)}…`
                  : '—'}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {line.unitPrice != null ? formatCurrency(Number(line.unitPrice)) : '—'}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                <NumberDisplay value={line.orderedQty} />
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {line.unitPrice != null
                  ? formatCurrency(Number(line.orderedQty) * Number(line.unitPrice))
                  : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('purchasing.order.title')}</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          {t('common.create')}
        </Button>
      </div>

      <Card className="industrial-shadow">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === 'all' ? t('common.all') : t(`common.${s === 'completed' ? 'completed' : s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>{t('purchasing.order.code')}</TableHead>
                <TableHead>{t('purchasing.order.prRef')}</TableHead>
                <TableHead>{t('purchasing.order.supplier')}</TableHead>
                <TableHead>{t('purchasing.order.date')}</TableHead>
                <TableHead>{t('purchasing.order.currency')}</TableHead>
                <TableHead className="text-right">{t('purchasing.order.totalAmount')}</TableHead>
                <TableHead>{t('purchasing.order.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {t('common.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <Collapsible key={row.uuid} open={expandedId === row.uuid} asChild>
                    <>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => void handleExpand(row.uuid)}
                      >
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleExpand(row.uuid);
                              }}
                            >
                              {expandedId === row.uuid
                                ? <ChevronDown className="h-4 w-4" />
                                : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell className="font-mono text-sm font-medium">{row.code}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">—</TableCell>
                        <TableCell>{partnerNames[row.mdBusinessPartnerUuid] ?? '…'}</TableCell>
                        <TableCell className="font-mono text-sm">{row.orderDate?.slice(0, 10)}</TableCell>
                        <TableCell className="font-mono text-sm">{row.currencyCode}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">—</TableCell>
                        <TableCell>
                          <StatusBadge status={poStatusToBadge(row.status)} />
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <tr>
                          <td colSpan={8} className="p-0">
                            {orderDetails[row.uuid] && renderDetail(orderDetails[row.uuid])}
                          </td>
                        </tr>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-sm text-muted-foreground">
              {t('common.total')}: {totalCount} {t('common.rows')}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>←</Button>
              <span className="text-sm">{t('common.page')} {page} {t('common.of')} {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>→</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('purchasing.order.createTitle')}</DialogTitle>
            <DialogDescription>{t('purchasing.order.fillLine')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('purchasing.order.selectSupplier')}</Label>
              <Select value={createBpUuid} onValueChange={setCreateBpUuid}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t('purchasing.order.selectSupplier')} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.uuid} value={s.uuid}>
                      {s.code} — {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('purchasing.order.currency')}</Label>
                <Input className="mt-1" value={createCurrency} onChange={(e) => setCreateCurrency(e.target.value)} />
              </div>
              <div>
                <Label>{t('purchasing.order.expectedDate')}</Label>
                <Input className="mt-1" type="date" value={createExpected} onChange={(e) => setCreateExpected(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>{t('bom.note')}</Label>
              <Input className="mt-1" value={createRemark} onChange={(e) => setCreateRemark(e.target.value)} />
            </div>
            <div className="border border-border rounded-md p-3 space-y-2">
              <Label>{t('purchasing.request.materialList')}</Label>
              <SuggestInputWithQuickAdd
                value={createLine.materialName}
                selectedUuid={createLine.materialUuid}
                onChange={(v) => setCreateLine((prev) => ({
                  ...prev,
                  materialName: v,
                  materialUuid: '',
                  ...(v === '' ? { mdUomUuid: '', unit: '' } : {}),
                }))}
                onSelect={(item: SuggestData, typed?: string) => {
                  appendItemSearchPhraseFromSuggest(item.uuid, typed);
                  setCreateLine((prev) => ({
                    ...prev,
                    materialName: item.name,
                    materialUuid: item.uuid,
                    description: prev.description.trim() ? prev.description : item.name,
                    ...(item.mdUomUuid
                      ? { mdUomUuid: item.mdUomUuid, unit: item.unitName ?? prev.unit }
                      : {}),
                  }));
                }}
                type="material"
                quickAddType="material"
                placeholder={t('bom.materialName')}
              />
              <SuggestInputWithQuickAdd
                value={createLine.unit}
                onChange={(v) => setCreateLine((prev) => ({ ...prev, unit: v, mdUomUuid: v === prev.unit ? prev.mdUomUuid : '' }))}
                onSelect={(item: SuggestData) => {
                  setCreateLine((prev) => ({ ...prev, unit: item.name, mdUomUuid: item.uuid }));
                }}
                type="unit"
                quickAddType="unit"
                placeholder={t('bom.unit')}
              />
              <Input
                placeholder={t('bom.quantity')}
                type="number"
                value={createLine.qty}
                onChange={(e) => setCreateLine((prev) => ({ ...prev, qty: e.target.value }))}
              />
              <Input
                placeholder={t('purchasing.order.unitPrice')}
                type="number"
                value={createLine.unitPrice}
                onChange={(e) => setCreateLine((prev) => ({ ...prev, unitPrice: e.target.value }))}
              />
              <Input
                placeholder={t('bom.materialName') + ' / ' + t('bom.note')}
                value={createLine.description}
                onChange={(e) => setCreateLine((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
            <Button disabled={createSaving} onClick={() => void handleCreateSave()}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
