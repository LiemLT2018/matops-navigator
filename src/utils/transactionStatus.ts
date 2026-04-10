/**
 * Map backend header status (short) to StatusBadge keys.
 * See MatOps.Application.Common.SalesOrderConstants / ManufacturingConstants.
 */

export function salesOrderStatusToBadge(status: number): string {
  switch (status) {
    case 0:
      return 'draft';
    case 1:
      return 'in_progress';
    case 2:
      return 'completed';
    case 3:
      return 'cancelled';
    default:
      return 'pending';
  }
}

export function productOrderStatusToBadge(status: number): string {
  switch (status) {
    case 0:
      return 'draft';
    case 1:
      return 'approved';
    case 2:
      return 'cancelled';
    default:
      return 'pending';
  }
}

export function productionOrderStatusToBadge(status: number): string {
  switch (status) {
    case 0:
      return 'cancelled';
    case 1:
      return 'pending';
    case 2:
      return 'in_progress';
    case 3:
      return 'completed';
    case 4:
      return 'completed';
    default:
      return 'pending';
  }
}
