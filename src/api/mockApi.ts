import type { PagingResponse, BaseResponse } from '@/types/api';
import type { BOMDetail } from '@/types/bom';

export type { BOMDetail } from '@/types/bom';

// Dashboard mock
export interface DashboardKPI {
  totalSO: number; pendingSO: number; activeSO: number; completedSO: number;
  totalBOM: number; pendingBOM: number; activeBOM: number; completedBOM: number;
  totalPO: number; pendingPO: number; activePO: number; completedPO: number;
  totalProd: number; pendingProd: number; activeProd: number; completedProd: number;
}

export interface Warning {
  id: string; type: 'materialShortage' | 'lateDelivery' | 'lateDesign' | 'latePR';
  severity: 'critical' | 'warning' | 'info'; message: string; date: string; ref: string;
}

export interface PlanVsActual {
  month: string; plan: number; actual: number;
}

export async function getDashboardKPI(): Promise<BaseResponse<DashboardKPI>> {
  await delay();
  return ok({
    totalSO: 156, pendingSO: 23, activeSO: 89, completedSO: 44,
    totalBOM: 234, pendingBOM: 12, activeBOM: 145, completedBOM: 77,
    totalPO: 89, pendingPO: 15, activePO: 52, completedPO: 22,
    totalProd: 67, pendingProd: 8, activeProd: 41, completedProd: 18,
  });
}

export async function getDashboardWarnings(): Promise<BaseResponse<Warning[]>> {
  await delay();
  return ok([
    { id: 'W001', type: 'materialShortage', severity: 'critical', message: 'Thép tấm SS400 - Tồn kho dưới mức tối thiểu (52/200 kg)', date: '2026-03-23', ref: 'MAT-0145' },
    { id: 'W002', type: 'lateDelivery', severity: 'critical', message: 'SO-2026-0089 - Chậm giao hàng 3 ngày', date: '2026-03-20', ref: 'SO-2026-0089' },
    { id: 'W003', type: 'lateDesign', severity: 'warning', message: 'BOM-0234 - Thiết kế chậm tiến độ 2 ngày', date: '2026-03-22', ref: 'BOM-0234' },
    { id: 'W004', type: 'latePR', severity: 'warning', message: 'PR-0156 - Chờ duyệt quá 5 ngày', date: '2026-03-18', ref: 'PR-0156' },
    { id: 'W005', type: 'materialShortage', severity: 'info', message: 'Bu lông M12x50 - Sắp hết (150/200 cái)', date: '2026-03-23', ref: 'MAT-0267' },
  ]);
}

export async function getPlanVsActual(): Promise<BaseResponse<PlanVsActual[]>> {
  await delay();
  return ok([
    { month: 'T1', plan: 12, actual: 10 }, { month: 'T2', plan: 15, actual: 14 },
    { month: 'T3', plan: 18, actual: 16 }, { month: 'T4', plan: 20, actual: 22 },
    { month: 'T5', plan: 22, actual: 19 }, { month: 'T6', plan: 25, actual: 24 },
    { month: 'T7', plan: 28, actual: 26 }, { month: 'T8', plan: 30, actual: 28 },
    { month: 'T9', plan: 27, actual: 25 }, { month: 'T10', plan: 24, actual: 23 },
    { month: 'T11', plan: 20, actual: 18 }, { month: 'T12', plan: 18, actual: 15 },
  ]);
}

// Sales Orders
export interface SalesOrder {
  id: string; code: string; customer: string; orderDate: string; deliveryDate: string;
  amount: number; status: string; products: string[];
}

export async function getSalesOrders(): Promise<PagingResponse<SalesOrder[]>> {
  await delay();
  return paged([
    { id: '1', code: 'SO-2026-0089', customer: 'Công ty CP Cơ khí Hà Nội', orderDate: '2026-01-15', deliveryDate: '2026-04-15', amount: 2500000000, status: 'in_progress', products: ['Khung thép KT-500', 'Bệ máy BM-200'] },
    { id: '2', code: 'SO-2026-0090', customer: 'TNHH Thép Miền Nam', orderDate: '2026-02-01', deliveryDate: '2026-05-01', amount: 1800000000, status: 'pending', products: ['Trục khuỷu TK-100'] },
    { id: '3', code: 'SO-2026-0091', customer: 'Tổng CT Máy Động Lực', orderDate: '2026-02-10', deliveryDate: '2026-06-10', amount: 3200000000, status: 'in_progress', products: ['Hộp số HS-300', 'Bánh răng BR-45'] },
    { id: '4', code: 'SO-2026-0085', customer: 'CP Thiết bị Công nghiệp', orderDate: '2025-12-20', deliveryDate: '2026-03-20', amount: 1200000000, status: 'completed', products: ['Van điều khiển VD-100'] },
    { id: '5', code: 'SO-2026-0092', customer: 'TNHH Chế tạo Máy SG', orderDate: '2026-03-01', deliveryDate: '2026-07-01', amount: 4500000000, status: 'draft', products: ['Máy ép thủy lực 200T'] },
  ], 12);
}

// Product Orders
export interface ProductOrder {
  id: string; code: string; soRef: string; product: string; quantity: number;
  dueDate: string; status: string; assignee: string;
}

export async function getProductOrders(): Promise<PagingResponse<ProductOrder[]>> {
  await delay();
  return paged([
    { id: '1', code: 'PO-2026-0120', soRef: 'SO-2026-0089', product: 'Khung thép KT-500', quantity: 5, dueDate: '2026-03-30', status: 'in_progress', assignee: 'Nguyễn Văn A' },
    { id: '2', code: 'PO-2026-0121', soRef: 'SO-2026-0089', product: 'Bệ máy BM-200', quantity: 3, dueDate: '2026-04-05', status: 'pending', assignee: 'Trần Văn B' },
    { id: '3', code: 'PO-2026-0122', soRef: 'SO-2026-0090', product: 'Trục khuỷu TK-100', quantity: 10, dueDate: '2026-04-15', status: 'in_progress', assignee: 'Lê Thị C' },
    { id: '4', code: 'PO-2026-0123', soRef: 'SO-2026-0091', product: 'Hộp số HS-300', quantity: 2, dueDate: '2026-05-01', status: 'draft', assignee: 'Phạm Văn D' },
  ], 8);
}

// BOM
export interface BOMMaster {
  id: string; code: string; product: string; customer: string; version: string;
  status: string; createdDate: string; completedDate: string; itemCount: number; childBomCount: number;
}

export interface BOMChildRef {
  id: string; bomCode: string; bomName: string; quantity: number; unit: string; note: string;
}

export interface MaterialSuggest {
  id: string; code: string; name: string; specification: string; unit: string;
  manufacturer: string; aliases: string[];
}

export async function getBOMs(params?: { page?: number; pageSize?: number; status?: string; keyword?: string }): Promise<PagingResponse<BOMMaster[]>> {
  await delay();
  const all: BOMMaster[] = [
    { id: '1', code: 'BOM-0231', product: 'Khung thép KT-500', customer: 'CP Cơ khí Hà Nội', version: 'v2.1', status: 'approved', createdDate: '2026-01-20', completedDate: '2026-02-15', itemCount: 45, childBomCount: 2 },
    { id: '2', code: 'BOM-0232', product: 'Bệ máy BM-200', customer: 'CP Cơ khí Hà Nội', version: 'v1.0', status: 'in_progress', createdDate: '2026-02-05', completedDate: '', itemCount: 32, childBomCount: 1 },
    { id: '3', code: 'BOM-0233', product: 'Trục khuỷu TK-100', customer: 'TNHH Thép Miền Nam', version: 'v1.2', status: 'approved', createdDate: '2026-02-12', completedDate: '2026-03-01', itemCount: 18, childBomCount: 0 },
    { id: '4', code: 'BOM-0234', product: 'Hộp số HS-300', customer: 'Tổng CT Máy Động Lực', version: 'v0.3', status: 'draft', createdDate: '2026-03-01', completedDate: '', itemCount: 56, childBomCount: 3 },
    { id: '5', code: 'BOM-0235', product: 'Van điều khiển VD-100', customer: 'CP Thiết bị Công nghiệp', version: 'v1.0', status: 'pending', createdDate: '2026-03-10', completedDate: '', itemCount: 12, childBomCount: 0 },
    { id: '6', code: 'BOM-0236', product: 'Bánh răng BR-45', customer: 'Tổng CT Máy Động Lực', version: 'v2.0', status: 'approved', createdDate: '2026-01-05', completedDate: '2026-01-28', itemCount: 8, childBomCount: 0 },
    { id: '7', code: 'BOM-0237', product: 'Trục chính TC-200', customer: 'TNHH Chế tạo Máy SG', version: 'v1.1', status: 'in_progress', createdDate: '2026-03-15', completedDate: '', itemCount: 22, childBomCount: 1 },
    { id: '8', code: 'BOM-0238', product: 'Vỏ hộp số VH-300', customer: 'Tổng CT Máy Động Lực', version: 'v1.0', status: 'draft', createdDate: '2026-03-20', completedDate: '', itemCount: 15, childBomCount: 0 },
  ];
  let filtered = all;
  if (params?.status && params.status !== 'all') filtered = filtered.filter(b => b.status === params.status);
  if (params?.keyword) {
    const kw = params.keyword.toLowerCase();
    filtered = filtered.filter(b => b.code.toLowerCase().includes(kw) || b.product.toLowerCase().includes(kw));
  }
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 10;
  const start = (page - 1) * pageSize;
  const pageData = filtered.slice(start, start + pageSize);
  return { errorCode: 0, errorMessage: '', data: pageData, pagination: { totalCount: filtered.length, totalPages: Math.ceil(filtered.length / pageSize), currentPages: page } };
}

export async function getBOMDetail(bomId: string): Promise<BaseResponse<BOMDetail[]>> {
  await delay();
  return ok([
    { id: 'D1', level: 0, materialCode: 'STL-001', materialName: 'Thép tấm SS400', specification: '20x1500x6000mm', unit: 'Tấm', quantity: 4, note: '', children: [
      { id: 'D1-1', level: 1, materialCode: 'STL-001-A', materialName: 'Thép tấm cắt', specification: '20x500x1000mm', unit: 'Tấm', quantity: 12, note: 'Cắt từ tấm lớn' },
    ]},
    { id: 'D2', level: 0, materialCode: 'BLT-012', materialName: 'Bu lông M12x50', specification: '8.8 mạ kẽm', unit: 'Cái', quantity: 120, note: '' },
    { id: 'D3', level: 0, materialCode: 'NUT-012', materialName: 'Đai ốc M12', specification: '8.8 mạ kẽm', unit: 'Cái', quantity: 120, note: '' },
    { id: 'D4', level: 0, materialCode: 'WLD-003', materialName: 'Que hàn E7018', specification: 'Ø3.2mm', unit: 'Kg', quantity: 25, note: '' },
    { id: 'D5', level: 0, materialCode: 'PNT-001', materialName: 'Sơn chống rỉ', specification: 'Đỏ - 1 lớp', unit: 'Lít', quantity: 15, note: '' },
  ]);
}

export async function getBOMChildRefs(bomId: string): Promise<BaseResponse<BOMChildRef[]>> {
  await delay();
  const map: Record<string, BOMChildRef[]> = {
    '1': [
      { id: 'CB1', bomCode: 'BOM-0236', bomName: 'Bánh răng BR-45', quantity: 4, unit: 'Cái', note: 'Bánh răng truyền động' },
      { id: 'CB2', bomCode: 'BOM-0238', bomName: 'Vỏ hộp số VH-300', quantity: 1, unit: 'Bộ', note: '' },
    ],
    '4': [
      { id: 'CB3', bomCode: 'BOM-0236', bomName: 'Bánh răng BR-45', quantity: 6, unit: 'Cái', note: '' },
      { id: 'CB4', bomCode: 'BOM-0237', bomName: 'Trục chính TC-200', quantity: 1, unit: 'Cái', note: '' },
      { id: 'CB5', bomCode: 'BOM-0238', bomName: 'Vỏ hộp số VH-300', quantity: 1, unit: 'Bộ', note: 'Vỏ ngoài' },
    ],
  };
  return ok(map[bomId] || []);
}

export async function searchMaterials(keyword: string): Promise<BaseResponse<MaterialSuggest[]>> {
  await delay(100);
  const all: MaterialSuggest[] = [
    { id: '1', code: 'STL-001', name: 'Thép tấm SS400', specification: '20x1500x6000mm', unit: 'Kg', manufacturer: 'POSCO', aliases: ['thep tam 20ly', 'thep tam ss400', 'steel plate ss400'] },
    { id: '2', code: 'STL-002', name: 'Thép hình H200', specification: 'H200x200x8x12', unit: 'Kg', manufacturer: 'Hòa Phát', aliases: ['thep hinh h200', 'thep h 200', 'h beam 200'] },
    { id: '3', code: 'BLT-012', name: 'Bu lông M12x50', specification: '8.8 mạ kẽm', unit: 'Cái', manufacturer: 'Bulong Đại Dương', aliases: ['bulon m12', 'bulon 12', 'bolt m12x50'] },
    { id: '4', code: 'NUT-012', name: 'Đai ốc M12', specification: '8.8 mạ kẽm', unit: 'Cái', manufacturer: 'Bulong Đại Dương', aliases: ['dai oc m12', 'dai oc 12', 'nut m12'] },
    { id: '5', code: 'WLD-003', name: 'Que hàn E7018', specification: 'Ø3.2mm', unit: 'Kg', manufacturer: 'Hyundai Welding', aliases: ['que han 3.2', 'que han e7018', 'welding rod'] },
    { id: '6', code: 'PNT-001', name: 'Sơn chống rỉ', specification: 'Đỏ - 1 lớp', unit: 'Lít', manufacturer: 'Jotun', aliases: ['son chong ri', 'son do', 'primer red'] },
    { id: '7', code: 'BRG-001', name: 'Bạc đạn 6205', specification: '25x52x15mm', unit: 'Cái', manufacturer: 'SKF', aliases: ['bac dan 6205', 'vong bi 6205', 'bearing 6205'] },
    { id: '8', code: 'RBR-001', name: 'Tấm cao su chịu nhiệt', specification: '500x500x10mm', unit: 'Tấm', manufacturer: 'Kumho', aliases: ['tam cao su', 'cao su chiu nhiet', 'rubber sheet'] },
    { id: '9', code: 'STL-003', name: 'Thép ống phi 60', specification: 'Ø60x3.5mm', unit: 'Mét', manufacturer: 'Hòa Phát', aliases: ['thep ong phi 60', 'ong thep 60', 'steel pipe 60'] },
    { id: '10', code: 'INX-001', name: 'Inox tấm 304', specification: '2x1220x2440mm', unit: 'Tấm', manufacturer: 'POSCO', aliases: ['inox 304', 'inox tam', 'stainless steel 304'] },
  ];
  const kw = keyword.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const filtered = all.filter(m => {
    const nameNorm = m.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const specNorm = m.specification.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const mfgNorm = m.manufacturer.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (nameNorm.includes(kw) || specNorm.includes(kw) || mfgNorm.includes(kw) || m.code.toLowerCase().includes(kw)) return true;
    return m.aliases.some(a => a.includes(kw));
  });
  return ok(filtered);
}

export async function searchBOMs(keyword: string): Promise<BaseResponse<BOMMaster[]>> {
  await delay(100);
  const res = await getBOMs({ keyword });
  return ok(res.data);
}

// Purchase Requests
export interface PurchaseRequest {
  id: string; code: string; requester: string; department: string; date: string;
  bomRefs: string[]; status: string; itemCount: number; totalAmount: number;
  priority: string; note: string;
}

export interface PRItem {
  id: string; materialCode: string; materialName: string; specification: string;
  unit: string; quantity: number; stockQty: number; estimatedPrice: number;
  lastSupplier: string; lastPrice: number; manufacturer: string; note: string; isNew: boolean;
}

export interface MaterialStockInfo {
  materialCode: string; materialName: string; specification: string; unit: string;
  currentStock: number; minStock: number; lastSupplier: string; lastPrice: number;
  avgPrice: number; manufacturer: string;
}

export async function getPurchaseRequests(params?: { page?: number; pageSize?: number; status?: string; keyword?: string }): Promise<PagingResponse<PurchaseRequest[]>> {
  await delay();
  const all: PurchaseRequest[] = [
    { id: '1', code: 'PR-2026-0156', requester: 'Nguyễn Văn A', department: 'Kỹ thuật', date: '2026-03-15', bomRefs: ['BOM-0231', 'BOM-0232'], status: 'pending', itemCount: 15, totalAmount: 45000000, priority: 'high', note: 'Cần gấp cho đơn SO-0089' },
    { id: '2', code: 'PR-2026-0157', requester: 'Trần Văn B', department: 'Kỹ thuật', date: '2026-03-18', bomRefs: ['BOM-0233'], status: 'approved', itemCount: 8, totalAmount: 28000000, priority: 'normal', note: '' },
    { id: '3', code: 'PR-2026-0158', requester: 'Lê Thị C', department: 'Sản xuất', date: '2026-03-20', bomRefs: ['BOM-0234'], status: 'draft', itemCount: 22, totalAmount: 67000000, priority: 'normal', note: 'BOM chưa duyệt' },
    { id: '4', code: 'PR-2026-0159', requester: 'Phạm Văn D', department: 'Kỹ thuật', date: '2026-03-22', bomRefs: ['BOM-0235'], status: 'pending', itemCount: 5, totalAmount: 12000000, priority: 'low', note: '' },
    { id: '5', code: 'PR-2026-0160', requester: 'Nguyễn Văn A', department: 'Kỹ thuật', date: '2026-03-25', bomRefs: ['BOM-0231'], status: 'rejected', itemCount: 3, totalAmount: 8500000, priority: 'normal', note: 'Trùng PR-0156' },
    { id: '6', code: 'PR-2026-0161', requester: 'Trần Văn B', department: 'Sản xuất', date: '2026-03-26', bomRefs: ['BOM-0237', 'BOM-0238'], status: 'draft', itemCount: 18, totalAmount: 52000000, priority: 'high', note: '' },
  ];
  let filtered = all;
  if (params?.status && params.status !== 'all') filtered = filtered.filter(p => p.status === params.status);
  if (params?.keyword) {
    const kw = params.keyword.toLowerCase();
    filtered = filtered.filter(p => p.code.toLowerCase().includes(kw) || p.requester.toLowerCase().includes(kw));
  }
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 10;
  const start = (page - 1) * pageSize;
  const pageData = filtered.slice(start, start + pageSize);
  return { errorCode: 0, errorMessage: '', data: pageData, pagination: { totalCount: filtered.length, totalPages: Math.ceil(filtered.length / pageSize), currentPages: page } };
}

export async function getPRItems(prId: string): Promise<BaseResponse<PRItem[]>> {
  await delay();
  const map: Record<string, PRItem[]> = {
    '1': [
      { id: 'I1', materialCode: 'STL-001', materialName: 'Thép tấm SS400', specification: '20x1500x6000mm', unit: 'Tấm', quantity: 20, stockQty: 12, estimatedPrice: 370000, lastSupplier: 'POSCO Vietnam', lastPrice: 365000, manufacturer: 'POSCO', note: '', isNew: false },
      { id: 'I2', materialCode: 'BLT-012', materialName: 'Bu lông M12x50', specification: '8.8 mạ kẽm', unit: 'Cái', quantity: 500, stockQty: 150, estimatedPrice: 3500, lastSupplier: 'Bulong Đại Dương', lastPrice: 3200, manufacturer: 'Việt Đức', note: '', isNew: false },
      { id: 'I3', materialCode: '', materialName: 'Tấm đệm cao su đặc biệt', specification: '50x100x5mm - Chịu nhiệt', unit: 'Cái', quantity: 100, stockQty: 0, estimatedPrice: 25000, lastSupplier: '', lastPrice: 0, manufacturer: '', note: 'Vật tư mới', isNew: true },
    ],
    '2': [
      { id: 'I4', materialCode: 'WLD-003', materialName: 'Que hàn E7018', specification: 'Ø3.2mm', unit: 'Kg', quantity: 50, stockQty: 180, estimatedPrice: 45000, lastSupplier: 'CT TNHH Hàn Quốc Việt Nam', lastPrice: 43000, manufacturer: 'Hyundai', note: '', isNew: false },
      { id: 'I5', materialCode: 'PNT-001', materialName: 'Sơn chống rỉ', specification: 'Đỏ - 1 lớp', unit: 'Lít', quantity: 30, stockQty: 45, estimatedPrice: 85000, lastSupplier: 'Sơn Hải Phòng', lastPrice: 82000, manufacturer: 'Jotun', note: '', isNew: false },
    ],
  };
  return ok(map[prId] || map['1']);
}

export async function getMaterialStockInfo(materialCode: string): Promise<BaseResponse<MaterialStockInfo | null>> {
  await delay(100);
  const map: Record<string, MaterialStockInfo> = {
    'mat-001': { materialCode: 'mat-001', materialName: 'Nhôm Trung Quốc', specification: '360x204x38', unit: 'Tấm', currentStock: 25, minStock: 10, lastSupplier: 'China OEM', lastPrice: 185000, avgPrice: 180000, manufacturer: 'China OEM' },
    'mat-002': { materialCode: 'mat-002', materialName: 'Nhôm 6061', specification: '500x300x7', unit: 'Tấm', currentStock: 42, minStock: 20, lastSupplier: 'Posco', lastPrice: 225000, avgPrice: 220000, manufacturer: 'Posco' },
    'mat-003': { materialCode: 'mat-003', materialName: 'Sắt tấm', specification: 'dày 2mm', unit: 'Tấm', currentStock: 88, minStock: 50, lastSupplier: 'Hòa Phát', lastPrice: 18500, avgPrice: 18000, manufacturer: 'Hòa Phát' },
    'mat-004': { materialCode: 'mat-004', materialName: 'Inox 304', specification: '1220x2440x2', unit: 'Tấm', currentStock: 15, minStock: 10, lastSupplier: 'Posco', lastPrice: 320000, avgPrice: 315000, manufacturer: 'Posco' },
    'mat-005': { materialCode: 'mat-005', materialName: 'Bạc đạn SKF 6205', specification: 'model 6205', unit: 'Cái', currentStock: 60, minStock: 20, lastSupplier: 'SKF', lastPrice: 125000, avgPrice: 122000, manufacturer: 'SKF' },
    'mat-006': { materialCode: 'mat-006', materialName: 'Thép hộp 40x80', specification: '40x80x1.2', unit: 'Cây', currentStock: 120, minStock: 50, lastSupplier: 'Hòa Phát', lastPrice: 95000, avgPrice: 92000, manufacturer: 'Hòa Phát' },
    'mat-007': { materialCode: 'mat-007', materialName: 'Ống thép đen phi 60', specification: 'phi 60x3', unit: 'Cây', currentStock: 35, minStock: 20, lastSupplier: 'Pomina', lastPrice: 145000, avgPrice: 140000, manufacturer: 'Pomina' },
    'mat-008': { materialCode: 'mat-008', materialName: 'Bu lông M12x50', specification: 'M12x50 8.8', unit: 'Cái', currentStock: 500, minStock: 200, lastSupplier: 'Việt Đức', lastPrice: 3500, avgPrice: 3200, manufacturer: 'Việt Đức' },
    'mat-009': { materialCode: 'mat-009', materialName: 'Đai ốc M12', specification: 'M12', unit: 'Cái', currentStock: 800, minStock: 300, lastSupplier: 'Việt Đức', lastPrice: 1200, avgPrice: 1100, manufacturer: 'Việt Đức' },
    'mat-010': { materialCode: 'mat-010', materialName: 'Que hàn 2.5mm', specification: '2.5mm E6013', unit: 'Kg', currentStock: 200, minStock: 100, lastSupplier: 'Hyundai', lastPrice: 38000, avgPrice: 36000, manufacturer: 'Hyundai' },
  };
  return ok(map[materialCode] || null);
}

// Get all materials for a BOM including child BOMs (flattened)
export interface BOMFlatMaterial {
  materialCode: string; materialName: string; materialUuid: string;
  specification: string; unit: string; quantity: number;
  manufacturer: string; estimatedPrice: number;
}

export async function getBOMAllMaterials(bomId: string): Promise<BaseResponse<BOMFlatMaterial[]>> {
  await delay();
  // Get direct materials
  const detRes = await getBOMDetail(bomId);
  const materials: BOMFlatMaterial[] = [];
  
  const addMaterials = (details: BOMDetail[], multiplier: number = 1) => {
    for (const d of details) {
      materials.push({
        materialCode: d.materialCode, materialName: d.materialName,
        materialUuid: d.materialCode, specification: d.specification,
        unit: d.unit, quantity: d.quantity * multiplier,
        manufacturer: '', estimatedPrice: 0,
      });
      if (d.children) addMaterials(d.children, multiplier);
    }
  };
  addMaterials(detRes.data);

  // Get child BOM materials
  const childRes = await getBOMChildRefs(bomId);
  for (const child of childRes.data) {
    const childBomId = Object.keys({ '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8 })
      .find(id => {
        const codes = ['BOM-0231','BOM-0232','BOM-0233','BOM-0234','BOM-0235','BOM-0236','BOM-0237','BOM-0238'];
        return codes[parseInt(id) - 1] === child.bomCode;
      });
    if (childBomId) {
      const childDet = await getBOMDetail(childBomId);
      addMaterials(childDet.data, child.quantity);
    }
  }

  // Try to enrich with stock info
  for (const m of materials) {
    const stockInfo = await getMaterialStockInfo(m.materialUuid);
    if (stockInfo.data) {
      m.manufacturer = stockInfo.data.manufacturer;
      m.estimatedPrice = stockInfo.data.lastPrice;
    }
  }

  return ok(materials);
}

// Purchase Orders
export interface PurchaseOrder {
  id: string; code: string; prRef: string; supplier: string; date: string;
  status: string; totalAmount: number; itemCount: number;
}

export async function getPurchaseOrders(): Promise<PagingResponse<PurchaseOrder[]>> {
  await delay();
  return paged([
    { id: '1', code: 'PO-2026-0078', prRef: 'PR-2026-0156', supplier: 'POSCO Vietnam', date: '2026-03-17', status: 'approved', totalAmount: 35000000, itemCount: 8 },
    { id: '2', code: 'PO-2026-0079', prRef: 'PR-2026-0157', supplier: 'Bulong Đại Dương', date: '2026-03-19', status: 'pending', totalAmount: 12000000, itemCount: 5 },
  ], 5);
}

// Warehouse
export interface WarehouseItem {
  id: string; materialCode: string; materialName: string; currentStock: number;
  minStock: number; unit: string; location: string; lastUpdated: string;
}

export async function getWarehouseItems(): Promise<PagingResponse<WarehouseItem[]>> {
  await delay();
  return paged([
    { id: '1', materialCode: 'STL-001', materialName: 'Thép tấm SS400', currentStock: 52, minStock: 200, unit: 'Kg', location: 'A-01-01', lastUpdated: '2026-03-22' },
    { id: '2', materialCode: 'BLT-012', materialName: 'Bu lông M12x50', currentStock: 150, minStock: 200, unit: 'Cái', location: 'B-02-05', lastUpdated: '2026-03-21' },
    { id: '3', materialCode: 'NUT-012', materialName: 'Đai ốc M12', currentStock: 320, minStock: 200, unit: 'Cái', location: 'B-02-06', lastUpdated: '2026-03-20' },
    { id: '4', materialCode: 'WLD-003', materialName: 'Que hàn E7018', currentStock: 180, minStock: 100, unit: 'Kg', location: 'C-01-03', lastUpdated: '2026-03-22' },
    { id: '5', materialCode: 'PNT-001', materialName: 'Sơn chống rỉ', currentStock: 45, minStock: 50, unit: 'Lít', location: 'D-01-01', lastUpdated: '2026-03-19' },
  ], 25);
}

// Production
export interface ProductionOrder {
  id: string; code: string; product: string; quantity: number; startDate: string;
  endDate: string; progress: number; stage: string; assignee: string; status: string;
}

export async function getProductionOrders(): Promise<PagingResponse<ProductionOrder[]>> {
  await delay();
  return paged([
    { id: '1', code: 'LSX-2026-0045', product: 'Khung thép KT-500', quantity: 5, startDate: '2026-03-01', endDate: '2026-04-15', progress: 65, stage: 'Gia công CNC', assignee: 'Tổ 1 - Xưởng A', status: 'in_progress' },
    { id: '2', code: 'LSX-2026-0046', product: 'Trục khuỷu TK-100', quantity: 10, startDate: '2026-03-05', endDate: '2026-04-20', progress: 40, stage: 'Tiện', assignee: 'Tổ 2 - Xưởng B', status: 'in_progress' },
    { id: '3', code: 'LSX-2026-0047', product: 'Van điều khiển VD-100', quantity: 20, startDate: '2026-02-15', endDate: '2026-03-25', progress: 95, stage: 'Lắp ráp', assignee: 'Tổ 3 - Xưởng A', status: 'in_progress' },
    { id: '4', code: 'LSX-2026-0048', product: 'Bệ máy BM-200', quantity: 3, startDate: '2026-03-20', endDate: '2026-05-10', progress: 10, stage: 'Chuẩn bị', assignee: 'Tổ 1 - Xưởng A', status: 'pending' },
  ], 10);
}

// QC
export interface QCInspection {
  id: string; code: string; product: string; inspector: string; date: string;
  result: 'pass' | 'fail'; criteria: string[]; notes: string; prodRef: string;
}

export async function getQCInspections(): Promise<PagingResponse<QCInspection[]>> {
  await delay();
  return paged([
    { id: '1', code: 'QC-2026-0089', product: 'Van điều khiển VD-100', inspector: 'Hoàng Văn E', date: '2026-03-22', result: 'pass', criteria: ['Kích thước', 'Áp suất', 'Rò rỉ'], notes: 'Đạt tất cả tiêu chí', prodRef: 'LSX-2026-0047' },
    { id: '2', code: 'QC-2026-0090', product: 'Khung thép KT-500', inspector: 'Hoàng Văn E', date: '2026-03-21', result: 'fail', criteria: ['Kích thước', 'Hàn', 'Sơn'], notes: 'Mối hàn #3 không đạt - yêu cầu hàn lại', prodRef: 'LSX-2026-0045' },
    { id: '3', code: 'QC-2026-0088', product: 'Trục khuỷu TK-100', inspector: 'Nguyễn Thị F', date: '2026-03-20', result: 'pass', criteria: ['Kích thước', 'Độ cứng', 'Độ bóng'], notes: '', prodRef: 'LSX-2026-0046' },
  ], 8);
}

// Finished Goods
export interface FinishedGood {
  id: string; productCode: string; productName: string; currentStock: number;
  unit: string; lastInbound: string; soRef: string;
}

export async function getFinishedGoods(): Promise<PagingResponse<FinishedGood[]>> {
  await delay();
  return paged([
    { id: '1', productCode: 'FG-VD100', productName: 'Van điều khiển VD-100', currentStock: 18, unit: 'Cái', lastInbound: '2026-03-22', soRef: 'SO-2026-0085' },
    { id: '2', productCode: 'FG-KT500', productName: 'Khung thép KT-500', currentStock: 2, unit: 'Bộ', lastInbound: '2026-03-15', soRef: 'SO-2026-0089' },
    { id: '3', productCode: 'FG-BR45', productName: 'Bánh răng BR-45', currentStock: 35, unit: 'Cái', lastInbound: '2026-03-18', soRef: 'SO-2026-0091' },
  ], 6);
}

// Partners - Customers
export interface Customer {
  id: string; code: string; name: string; contactPerson: string; phone: string;
  email: string; address: string; taxCode: string; status: string;
}

export async function getCustomers(): Promise<PagingResponse<Customer[]>> {
  await delay();
  return paged([
    { id: '1', code: 'KH-001', name: 'Công ty CP Cơ khí Hà Nội', contactPerson: 'Nguyễn Văn Hùng', phone: '024-3856-1234', email: 'hung.nv@cokhi-hn.com', address: '124 Nguyễn Trãi, Thanh Xuân, Hà Nội', taxCode: '0100123456', status: 'active' },
    { id: '2', code: 'KH-002', name: 'TNHH Thép Miền Nam', contactPerson: 'Trần Thị Mai', phone: '028-3825-5678', email: 'mai.tt@thepmiennam.vn', address: '56 Lý Thường Kiệt, Q.10, TP.HCM', taxCode: '0301234567', status: 'active' },
    { id: '3', code: 'KH-003', name: 'Tổng CT Máy Động Lực', contactPerson: 'Lê Minh Tuấn', phone: '024-3755-9012', email: 'tuan.lm@maydl.com.vn', address: '89 Phạm Hùng, Nam Từ Liêm, Hà Nội', taxCode: '0100345678', status: 'active' },
    { id: '4', code: 'KH-004', name: 'CP Thiết bị Công nghiệp', contactPerson: 'Phạm Hoàng Anh', phone: '0236-384-3456', email: 'anh.ph@tbcn.vn', address: '45 Trần Phú, Hải Châu, Đà Nẵng', taxCode: '0400567890', status: 'inactive' },
    { id: '5', code: 'KH-005', name: 'TNHH Chế tạo Máy SG', contactPerson: 'Võ Thanh Hải', phone: '028-3920-7890', email: 'hai.vt@ctmsg.com', address: '200 Nguyễn Văn Linh, Q.7, TP.HCM', taxCode: '0301456789', status: 'active' },
  ], 12);
}

// Partners - Suppliers
export interface Supplier {
  id: string; code: string; name: string; contactPerson: string; phone: string;
  email: string; address: string; taxCode: string; status: string;
}

export async function getSuppliers(): Promise<PagingResponse<Supplier[]>> {
  await delay();
  return paged([
    { id: '1', code: 'NCC-001', name: 'POSCO Vietnam', contactPerson: 'Kim Sung-ho', phone: '0254-389-1234', email: 'sungho@posco.vn', address: 'KCN Phú Mỹ, Bà Rịa - Vũng Tàu', taxCode: '3500123456', status: 'active' },
    { id: '2', code: 'NCC-002', name: 'Bulong Đại Dương', contactPerson: 'Đặng Văn Long', phone: '0274-365-5678', email: 'long.dv@bulongdaiduong.vn', address: 'KCN Bình Dương, Bình Dương', taxCode: '3700234567', status: 'active' },
    { id: '3', code: 'NCC-003', name: 'CT TNHH Hàn Quốc Việt Nam', contactPerson: 'Park Jin-woo', phone: '028-3845-9012', email: 'jinwoo@hqvn.com', address: 'KCN Tân Bình, TP.HCM', taxCode: '0301567890', status: 'active' },
    { id: '4', code: 'NCC-004', name: 'Sơn Hải Phòng', contactPerson: 'Bùi Thị Lan', phone: '0225-356-3456', email: 'lan.bt@sonhp.vn', address: 'KCN Đình Vũ, Hải Phòng', taxCode: '0200678901', status: 'inactive' },
  ], 8);
}

// Material Groups
export interface MaterialGroup {
  id: string; code: string; name: string; description: string; itemCount: number;
}

export async function getMaterialGroups(): Promise<BaseResponse<MaterialGroup[]>> {
  await delay();
  return ok([
    { id: '1', code: 'NVL-STL', name: 'Thép', description: 'Thép tấm, thép hình, thép ống các loại', itemCount: 45 },
    { id: '2', code: 'NVL-BLT', name: 'Bu lông - Ốc vít', description: 'Bu lông, đai ốc, vít các loại', itemCount: 120 },
    { id: '3', code: 'NVL-WLD', name: 'Vật tư hàn', description: 'Que hàn, dây hàn, khí hàn', itemCount: 25 },
    { id: '4', code: 'NVL-PNT', name: 'Sơn - Hóa chất', description: 'Sơn chống rỉ, sơn phủ, dung môi', itemCount: 18 },
    { id: '5', code: 'NVL-BRG', name: 'Bạc đạn - Vòng bi', description: 'Bạc đạn, vòng bi, gối đỡ', itemCount: 35 },
    { id: '6', code: 'NVL-RBR', name: 'Cao su - Nhựa', description: 'Tấm cao su, ống nhựa, gioăng', itemCount: 22 },
  ]);
}

// Materials
export interface Material {
  id: string; code: string; name: string; group: string; specification: string;
  unit: string; price: number;
}

export async function getMaterials(): Promise<PagingResponse<Material[]>> {
  await delay();
  return paged([
    { id: '1', code: 'STL-001', name: 'Thép tấm SS400', group: 'Thép', specification: '20x1500x6000mm', unit: 'Kg', price: 18500 },
    { id: '2', code: 'STL-002', name: 'Thép hình H200', group: 'Thép', specification: 'H200x200x8x12', unit: 'Kg', price: 19200 },
    { id: '3', code: 'BLT-012', name: 'Bu lông M12x50', group: 'Bu lông - Ốc vít', specification: '8.8 mạ kẽm', unit: 'Cái', price: 3500 },
    { id: '4', code: 'WLD-003', name: 'Que hàn E7018', group: 'Vật tư hàn', specification: 'Ø3.2mm', unit: 'Kg', price: 45000 },
    { id: '5', code: 'PNT-001', name: 'Sơn chống rỉ', group: 'Sơn - Hóa chất', specification: 'Đỏ - 1 lớp', unit: 'Lít', price: 85000 },
    { id: '6', code: 'BRG-001', name: 'Bạc đạn 6205', group: 'Bạc đạn - Vòng bi', specification: '25x52x15mm', unit: 'Cái', price: 125000 },
  ], 45);
}

// Material Aliases
export interface MaterialAlias {
  id: string; alias: string; materialCode: string; materialName: string; source: string;
}

export async function getMaterialAliases(): Promise<BaseResponse<MaterialAlias[]>> {
  await delay();
  return ok([
    { id: '1', alias: 'Thép tấm 20ly', materialCode: 'STL-001', materialName: 'Thép tấm SS400', source: 'PR-2026-0156' },
    { id: '2', alias: 'Bulon 12', materialCode: 'BLT-012', materialName: 'Bu lông M12x50', source: 'BOM-0231' },
    { id: '3', alias: 'Que hàn 3.2', materialCode: 'WLD-003', materialName: 'Que hàn E7018', source: 'PR-2026-0157' },
    { id: '4', alias: 'Sơn đỏ', materialCode: 'PNT-001', materialName: 'Sơn chống rỉ', source: 'BOM-0232' },
    { id: '5', alias: 'Thép H 200', materialCode: 'STL-002', materialName: 'Thép hình H200', source: 'PR-2026-0158' },
  ]);
}

// Undefined Materials
export interface UndefinedMaterial {
  id: string; name: string; specification: string; source: string; createdDate: string; status: string;
}

export async function getUndefinedMaterials(): Promise<BaseResponse<UndefinedMaterial[]>> {
  await delay();
  return ok([
    { id: '1', name: 'Tấm đệm cao su đặc biệt', specification: '50x100x5mm - Chịu nhiệt', source: 'PR-2026-0158', createdDate: '2026-03-20', status: 'pending' },
    { id: '2', name: 'Ống inox 304 phi 27', specification: 'Ø27x2.0mm', source: 'BOM-0234', createdDate: '2026-03-19', status: 'pending' },
    { id: '3', name: 'Keo dán kim loại chịu nhiệt', specification: 'Loctite 648 hoặc tương đương', source: 'PR-2026-0156', createdDate: '2026-03-18', status: 'linked' },
  ]);
}

// Units of Measure
export interface UnitOfMeasure {
  id: string; code: string; name: string; symbol: string; description: string;
}

export async function getMaterialUnits(): Promise<BaseResponse<UnitOfMeasure[]>> {
  await delay();
  return ok([
    { id: '1', code: 'KG', name: 'Kilogram', symbol: 'kg', description: 'Đơn vị khối lượng' },
    { id: '2', code: 'CAI', name: 'Cái', symbol: 'cái', description: 'Đơn vị đếm' },
    { id: '3', code: 'TAM', name: 'Tấm', symbol: 'tấm', description: 'Đơn vị tấm/sheet' },
    { id: '4', code: 'LIT', name: 'Lít', symbol: 'L', description: 'Đơn vị thể tích' },
    { id: '5', code: 'MET', name: 'Mét', symbol: 'm', description: 'Đơn vị chiều dài' },
    { id: '6', code: 'BO', name: 'Bộ', symbol: 'bộ', description: 'Đơn vị bộ/set' },
    { id: '7', code: 'CUON', name: 'Cuộn', symbol: 'cuộn', description: 'Đơn vị cuộn/roll' },
  ]);
}

// Product Groups
export interface ProductGroup {
  id: string; code: string; name: string; description: string; itemCount: number;
}

export async function getProductGroups(): Promise<BaseResponse<ProductGroup[]>> {
  await delay();
  return ok([
    { id: '1', code: 'SP-KCT', name: 'Kết cấu thép', description: 'Khung, dầm, cột thép chế tạo', itemCount: 15 },
    { id: '2', code: 'SP-MYC', name: 'Chi tiết máy', description: 'Trục, bánh răng, bạc, ổ đỡ', itemCount: 28 },
    { id: '3', code: 'SP-VAN', name: 'Van - Thiết bị áp lực', description: 'Van điều khiển, van an toàn', itemCount: 12 },
    { id: '4', code: 'SP-HOP', name: 'Hộp số - Truyền động', description: 'Hộp số, bộ truyền đai, xích', itemCount: 8 },
  ]);
}

// Products
export interface Product {
  id: string; code: string; name: string; group: string; specification: string;
  unit: string; price: number;
}

export async function getProducts(): Promise<PagingResponse<Product[]>> {
  await delay();
  return paged([
    { id: '1', code: 'KT-500', name: 'Khung thép KT-500', group: 'Kết cấu thép', specification: '5000x3000x2500mm', unit: 'Bộ', price: 450000000 },
    { id: '2', code: 'BM-200', name: 'Bệ máy BM-200', group: 'Kết cấu thép', specification: '2000x1500x800mm', unit: 'Bộ', price: 180000000 },
    { id: '3', code: 'TK-100', name: 'Trục khuỷu TK-100', group: 'Chi tiết máy', specification: 'Ø100xL1200mm', unit: 'Cái', price: 95000000 },
    { id: '4', code: 'VD-100', name: 'Van điều khiển VD-100', group: 'Van - Thiết bị áp lực', specification: 'DN100 PN16', unit: 'Cái', price: 35000000 },
    { id: '5', code: 'HS-300', name: 'Hộp số HS-300', group: 'Hộp số - Truyền động', specification: 'i=30, 5.5kW', unit: 'Bộ', price: 120000000 },
    { id: '6', code: 'BR-45', name: 'Bánh răng BR-45', group: 'Chi tiết máy', specification: 'M4 Z45 20CrMnTi', unit: 'Cái', price: 25000000 },
  ], 20);
}

// Product Units (reuses UnitOfMeasure)
export async function getProductUnits(): Promise<BaseResponse<UnitOfMeasure[]>> {
  await delay();
  return ok([
    { id: '1', code: 'CAI', name: 'Cái', symbol: 'cái', description: 'Đơn vị đếm sản phẩm' },
    { id: '2', code: 'BO', name: 'Bộ', symbol: 'bộ', description: 'Đơn vị bộ/set sản phẩm' },
    { id: '3', code: 'CHIEC', name: 'Chiếc', symbol: 'chiếc', description: 'Đơn vị chiếc' },
    { id: '4', code: 'MAY', name: 'Máy', symbol: 'máy', description: 'Đơn vị máy/thiết bị' },
  ]);
}

// Helpers
function delay(ms: number = 200) { return new Promise(r => setTimeout(r, ms)); }
function ok<T>(data: T): BaseResponse<T> { return { errorCode: 0, errorMessage: '', data }; }
function paged<T>(data: T, total: number): PagingResponse<T> {
  return { errorCode: 0, errorMessage: '', data, pagination: { totalCount: total, totalPages: Math.ceil(total / 10), currentPages: 1 } };
}
