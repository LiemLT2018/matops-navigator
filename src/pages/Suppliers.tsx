import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
import { companyService } from '@/api/services';
import type { CompanyDetail } from '@/types/models';
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';

export default function SuppliersPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<CompanyDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const pageSize = 20;

  const load = (pg = page, kw = keyword) => {
    setLoading(true);
    companyService.list({ keyword: kw || undefined, isPaging: 1, pageIndex: pg, pageSize, typeFind: 1 })
      .then(res => {
        setData((res.items ?? []) as CompanyDetail[]);
        setTotalPage(res.pagination?.totalPage ?? 1);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, []);

  const handleSearch = () => { setPage(1); load(1, keyword); };
  const goPage = (p: number) => { setPage(p); load(p); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t('partners.suppliers.title')}</h1>
        <Button size="sm"><Plus className="mr-1 h-4 w-4" />{t('common.create')}</Button>
      </div>
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
                <TableHead>{t('partners.suppliers.contact')}</TableHead>
                <TableHead>{t('partners.suppliers.phone')}</TableHead>
                <TableHead>{t('partners.suppliers.email')}</TableHead>
                <TableHead>{t('partners.suppliers.taxCode')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t('common.loading')}</TableCell></TableRow>
              ) : data.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t('common.noData')}</TableCell></TableRow>
              ) : data.map(item => (
                <TableRow key={item.uuid} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-mono text-xs">{item.code}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.shortName ?? '-'}</TableCell>
                  <TableCell>{item.phone ?? '-'}</TableCell>
                  <TableCell>{item.email ?? '-'}</TableCell>
                  <TableCell>{item.taxCode ?? '-'}</TableCell>
                  <TableCell><StatusBadge status={item.status === 1 ? 'active' : 'inactive'} /></TableCell>
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
    </div>
  );
}