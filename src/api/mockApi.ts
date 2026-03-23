import type { PagingResponse, BaseResponse } from '@/types/api';

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
  status: string; createdDate: string; itemCount: number;
}

export interface BOMDetail {
  id: string; level: number; materialCode: string; materialName: string;
  specification: string; unit: string; quantity: number; note: string; children?: BOMDetail[];
}

export async function getBOMs(): Promise<PagingResponse<BOMMaster[]>> {
  await delay();
  return paged([
    { id: '1', code: 'BOM-0231', product: 'Khung thép KT-500', customer: 'CP Cơ khí Hà Nội', version: 'v2.1', status: 'approved', createdDate: '2026-01-20', itemCount: 45 },
    { id: '2', code: 'BOM-0232', product: 'Bệ máy BM-200', customer: 'CP Cơ khí Hà Nội', version: 'v1.0', status: 'in_progress', createdDate: '2026-02-05', itemCount: 32 },
    { id: '3', code: 'BOM-0233', product: 'Trục khuỷu TK-100', customer: 'TNHH Thép Miền Nam', version: 'v1.2', status: 'approved', createdDate: '2026-02-12', itemCount: 18 },
    { id: '4', code: 'BOM-0234', product: 'Hộp số HS-300', customer: 'Tổng CT Máy Động Lực', version: 'v0.3', status: 'draft', createdDate: '2026-03-01', itemCount: 56 },
  ], 15);
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

// Purchase Requests
export interface PurchaseRequest {
  id: string; code: string; requester: string; department: string; date: string;
  bomRefs: string[]; status: string; itemCount: number; totalAmount: number;
}

export interface PRItem {
  id: string; materialCode: string; materialName: string; specification: string;
  unit: string; stockQty: number; requestQty: number; supplier: string; isNew: boolean;
}

export async function getPurchaseRequests(): Promise<PagingResponse<PurchaseRequest[]>> {
  await delay();
  return paged([
    { id: '1', code: 'PR-2026-0156', requester: 'Nguyễn Văn A', department: 'Kỹ thuật', date: '2026-03-15', bomRefs: ['BOM-0231', 'BOM-0232'], status: 'pending', itemCount: 15, totalAmount: 45000000 },
    { id: '2', code: 'PR-2026-0157', requester: 'Trần Văn B', department: 'Kỹ thuật', date: '2026-03-18', bomRefs: ['BOM-0233'], status: 'approved', itemCount: 8, totalAmount: 28000000 },
    { id: '3', code: 'PR-2026-0158', requester: 'Lê Thị C', department: 'Sản xuất', date: '2026-03-20', bomRefs: ['BOM-0234'], status: 'draft', itemCount: 22, totalAmount: 67000000 },
  ], 5);
}

export async function getPRItems(prId: string): Promise<BaseResponse<PRItem[]>> {
  await delay();
  return ok([
    { id: 'I1', materialCode: 'STL-001', materialName: 'Thép tấm SS400', specification: '20x1500x6000mm', unit: 'Tấm', stockQty: 12, requestQty: 20, supplier: 'POSCO Vietnam', isNew: false },
    { id: 'I2', materialCode: 'BLT-012', materialName: 'Bu lông M12x50', specification: '8.8 mạ kẽm', unit: 'Cái', stockQty: 150, requestQty: 500, supplier: 'Bulong Đại Dương', isNew: false },
    { id: 'I3', materialCode: '', materialName: 'Tấm đệm cao su đặc biệt', specification: '50x100x5mm - Chịu nhiệt', unit: 'Cái', stockQty: 0, requestQty: 100, supplier: '', isNew: true },
  ]);
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

// Helpers
function delay(ms: number = 200) { return new Promise(r => setTimeout(r, ms)); }
function ok<T>(data: T): BaseResponse<T> { return { errorCode: 0, errorMessage: '', data }; }
function paged<T>(data: T, total: number): PagingResponse<T> {
  return { errorCode: 0, errorMessage: '', data, pagination: { totalCount: total, totalPages: Math.ceil(total / 10), currentPages: 1 } };
}
