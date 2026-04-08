import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Search, X, Edit, Trash2 } from 'lucide-react';
import { businessPartnerService, companyService } from '@/api/services';
import { MatOpsApiError } from '@/lib/apiClient';
import { resolveMdCompanyUuidForApi } from '@/lib/authStorage';
import type { BusinessPartnerDetail, BusinessPartnerCreateBody, CompanyCatalog } from '@/types/models';
import { EdTypeFind } from '@/types/models';
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  BUSINESS_PARTNER_LIST_TYPES_SUPPLIER,
  BUSINESS_PARTNER_TYPE,
} from '@/constants/businessPartner';

const emptyForm: BusinessPartnerCreateBody = {
  mdCompanyUuid: '', code: '', name: '',
  taxCode: '', phone: '', email: '', address: '',
  contactPerson: '', paymentTerm: '', deliveryTerm: '',
  status: 1, type: BUSINESS_PARTNER_TYPE.SUPPLIER,
};

export default function SuppliersPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<BusinessPartnerDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const pageSize = 20;

  const [open, setOpen] = useState(false);
  const [editingUuid, setEditingUuid] = useState<string | null>(null);
  const [form, setForm] = useState<BusinessPartnerCreateBody>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [companies, setCompanies] = useState<CompanyCatalog[]>([]);

  const load = useCallback(async (pg: number, kw: string) => {
    const mdCompanyUuid = resolveMdCompanyUuidForApi();
    setLoading(true);
    try {
      const res = await businessPartnerService.list({
        keyword: kw || undefined,
        isPaging: 1,
        pageIndex: pg,
        pageSize,
        typeFind: EdTypeFind.LIST,
        ...(mdCompanyUuid ? { mdCompanyUuid } : {}),
        types: [...BUSINESS_PARTNER_LIST_TYPES_SUPPLIER],
      });
      setData((res.items ?? []) as BusinessPartnerDetail[]);
      setTotalPage(res.pagination?.totalPage ?? 1);
    } catch (e) {
      setData([]);
      if (e instanceof MatOpsApiError) {
        toast.error(e.errorMessage || t('errors.system'));
      } else {
        toast.error(t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  }, [pageSize, t]);

  const loadCompanies = () => {
    companyService.list({ typeFind: 0, isPaging: 0 })
      .then(res => setCompanies((res.items ?? []) as CompanyCatalog[]))
      .catch(() => setCompanies([]));
  };

  useEffect(() => {
    void load(1, '');
  }, [load]);

  const handleSearch = () => { setPage(1); void load(1, keyword); };
  const goPage = (p: number) => { setPage(p); void load(p, keyword); };

  const setField = (key: keyof BusinessPartnerCreateBody, val: string | number) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setErrors(prev => { const n = { ...prev }; delete n[key as string]; return n; });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.mdCompanyUuid) e.mdCompanyUuid = t('common.required');
    if (!form.code.trim()) e.code = t('common.required');
    else if (form.code.trim().length > 50) e.code = t('common.maxLength', { max: 50 });
    if (!form.name.trim()) e.name = t('common.required');
    else if (form.name.trim().length > 200) e.name = t('common.maxLength', { max: 200 });
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = t('common.invalidEmail');
    if (form.phone && form.phone.length > 20) e.phone = t('common.maxLength', { max: 20 });
    if (form.taxCode && form.taxCode.length > 20) e.taxCode = t('common.maxLength', { max: 20 });
    if (editingUuid) {
      const vt = [BUSINESS_PARTNER_TYPE.CUSTOMER, BUSINESS_PARTNER_TYPE.SUPPLIER, BUSINESS_PARTNER_TYPE.BOTH];
      if (form.type == null || !vt.includes(form.type)) e.type = t('common.required');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (!resolveMdCompanyUuidForApi()) {
      toast.error(t('partners.needCompany'));
      return;
    }
    setSaving(true);
    const uuidForUpdate = editingUuid;
    try {
      const body: BusinessPartnerCreateBody = {
        ...form,
        mdCompanyUuid: form.mdCompanyUuid,
        code: uuidForUpdate ? form.code.trim() : form.code.trim().toUpperCase(),
        name: form.name.trim(),
        type: uuidForUpdate ? (form.type ?? BUSINESS_PARTNER_TYPE.SUPPLIER) : BUSINESS_PARTNER_TYPE.SUPPLIER,
      };
      if (uuidForUpdate) {
        await businessPartnerService.update(uuidForUpdate, body);
        toast.success(t('errors.success'));
      } else {
        await businessPartnerService.create({ ...body, type: BUSINESS_PARTNER_TYPE.SUPPLIER });
        toast.success(t('common.createSuccess'));
      }
      setOpen(false);
      setEditingUuid(null);
      setForm({ ...emptyForm });
      setErrors({});
      void load(uuidForUpdate ? page : 1, keyword);
    } catch (e) {
      if (e instanceof MatOpsApiError) {
        toast.error(e.errorMessage || t('errors.system'));
      } else {
        toast.error(t('common.error'));
      }
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setEditingUuid(null);
    setForm({ ...emptyForm });
    setErrors({});
    loadCompanies();
    setOpen(true);
  };

  const openEdit = (item: BusinessPartnerDetail) => {
    setEditingUuid(item.uuid);
    setForm({
      mdCompanyUuid: item.mdCompanyUuid,
      code: item.code,
      name: item.name,
      type: item.type ?? BUSINESS_PARTNER_TYPE.SUPPLIER,
      taxCode: item.taxCode ?? '',
      phone: item.phone ?? '',
      email: item.email ?? '',
      address: item.address ?? '',
      contactPerson: item.contactPerson ?? '',
      paymentTerm: item.paymentTerm ?? '',
      deliveryTerm: item.deliveryTerm ?? '',
      status: item.status,
    });
    setErrors({});
    loadCompanies();
    setOpen(true);
  };

  const handleDelete = async (item: BusinessPartnerDetail) => {
    if (!window.confirm(t('partners.deleteConfirm'))) return;
    try {
      await businessPartnerService.delete(item.uuid);
      toast.success(t('errors.success'));
      void load(page, keyword);
    } catch (e) {
      if (e instanceof MatOpsApiError) {
        toast.error(e.errorMessage || t('errors.system'));
      } else {
        toast.error(t('common.error'));
      }
    }
  };

  const noCompany = !resolveMdCompanyUuidForApi();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t('partners.suppliers.title')}</h1>
        <Button size="sm" onClick={openCreate} disabled={noCompany}>
          <Plus className="mr-1 h-4 w-4" />
          {t('common.create')}
        </Button>
      </div>
      {noCompany && (
        <p className="text-sm text-muted-foreground">{t('partners.needCompany')}</p>
      )}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search')}
              className="max-w-sm h-8"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('partners.suppliers.code')}</TableHead>
                <TableHead>{t('partners.suppliers.name')}</TableHead>
                <TableHead>{t('partners.suppliers.contactPerson')}</TableHead>
                <TableHead>{t('partners.suppliers.phone')}</TableHead>
                <TableHead>{t('partners.suppliers.email')}</TableHead>
                <TableHead>{t('partners.suppliers.taxCode')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t('common.loading')}</TableCell></TableRow>
              ) : data.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t('common.noData')}</TableCell></TableRow>
              ) : data.map(item => (
                <TableRow key={item.uuid} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-xs">{item.code}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.contactPerson ?? '-'}</TableCell>
                  <TableCell>{item.phone ?? '-'}</TableCell>
                  <TableCell>{item.email ?? '-'}</TableCell>
                  <TableCell>{item.taxCode ?? '-'}</TableCell>
                  <TableCell><StatusBadge status={item.status === 1 ? 'active' : 'inactive'} /></TableCell>
                  <TableCell>
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title={t('common.edit')} onClick={() => openEdit(item)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title={t('common.delete')} onClick={() => void handleDelete(item)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalPage > 1 && (
            <div className="p-4 border-t">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious onClick={() => page > 1 && goPage(page - 1)} className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                  </PaginationItem>
                  {Array.from({ length: Math.min(totalPage, 5) }, (_, i) => {
                    const p = Math.max(1, Math.min(page - 2, totalPage - 4)) + i;
                    return p <= totalPage ? (
                      <PaginationItem key={p}>
                        <PaginationLink isActive={p === page} onClick={() => goPage(p)} className="cursor-pointer">{p}</PaginationLink>
                      </PaginationItem>
                    ) : null;
                  })}
                  <PaginationItem>
                    <PaginationNext onClick={() => page < totalPage && goPage(page + 1)} className={page >= totalPage ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditingUuid(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingUuid ? t('partners.editSupplierTitle') : t('partners.suppliers.createTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                {t('partners.suppliers.company')} <span className="text-destructive">*</span>
              </Label>
              <Select value={form.mdCompanyUuid} onValueChange={v => setField('mdCompanyUuid', v)}>
                <SelectTrigger className={errors.mdCompanyUuid ? 'border-destructive' : ''}>
                  <SelectValue placeholder={t('partners.suppliers.selectCompany')} />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => (
                    <SelectItem key={c.uuid} value={c.uuid}>{c.code} - {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.mdCompanyUuid && <p className="text-xs text-destructive">{errors.mdCompanyUuid}</p>}
            </div>

            {editingUuid && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t('partners.partnerType')}</Label>
                <Select
                  value={String(form.type ?? BUSINESS_PARTNER_TYPE.SUPPLIER)}
                  onValueChange={v => setField('type', Number(v))}
                >
                  <SelectTrigger className={errors.type ? 'border-destructive' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(BUSINESS_PARTNER_TYPE.CUSTOMER)}>{t('partners.bpType.customer')}</SelectItem>
                    <SelectItem value={String(BUSINESS_PARTNER_TYPE.SUPPLIER)}>{t('partners.bpType.supplier')}</SelectItem>
                    <SelectItem value={String(BUSINESS_PARTNER_TYPE.BOTH)}>{t('partners.bpType.both')}</SelectItem>
                  </SelectContent>
                </Select>
                {errors.type && <p className="text-xs text-destructive">{errors.type}</p>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  {t('partners.suppliers.code')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.code}
                  onChange={e => setField('code', e.target.value)}
                  placeholder="VD: ACME"
                  className={errors.code ? 'border-destructive' : ''}
                  maxLength={50}
                  disabled={!!editingUuid}
                />
                {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  {t('partners.suppliers.name')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder="VD: ACME JSC"
                  className={errors.name ? 'border-destructive' : ''}
                  maxLength={200}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t('partners.suppliers.contactPerson')}</Label>
                <Input value={form.contactPerson ?? ''} onChange={e => setField('contactPerson', e.target.value)} placeholder="Tên người liên hệ" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t('partners.suppliers.taxCode')}</Label>
                <Input
                  value={form.taxCode ?? ''}
                  onChange={e => setField('taxCode', e.target.value)}
                  placeholder="VD: 0101234567"
                  className={errors.taxCode ? 'border-destructive' : ''}
                  maxLength={20}
                />
                {errors.taxCode && <p className="text-xs text-destructive">{errors.taxCode}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t('partners.suppliers.phone')}</Label>
                <Input
                  value={form.phone ?? ''}
                  onChange={e => setField('phone', e.target.value)}
                  placeholder="VD: 0900000000"
                  className={errors.phone ? 'border-destructive' : ''}
                  maxLength={20}
                />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t('partners.suppliers.email')}</Label>
                <Input
                  type="email"
                  value={form.email ?? ''}
                  onChange={e => setField('email', e.target.value)}
                  placeholder="VD: info@acme.com"
                  className={errors.email ? 'border-destructive' : ''}
                  maxLength={255}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t('partners.suppliers.address')}</Label>
              <Input value={form.address ?? ''} onChange={e => setField('address', e.target.value)} placeholder="Địa chỉ" maxLength={500} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t('partners.suppliers.paymentTerm')}</Label>
                <Input value={form.paymentTerm ?? ''} onChange={e => setField('paymentTerm', e.target.value)} placeholder="VD: Net 30" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t('partners.suppliers.deliveryTerm')}</Label>
                <Input value={form.deliveryTerm ?? ''} onChange={e => setField('deliveryTerm', e.target.value)} placeholder="VD: FOB, CIF" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              <X className="mr-1 h-4 w-4" />{t('common.cancel')}
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
