/** BOM detail row for tree / expand UI (maps from API lines or mock). */
export interface BOMDetail {
  id: string;
  level: number;
  materialCode: string;
  materialName: string;
  specification: string;
  unit: string;
  quantity: number;
  note: string;
  children?: BOMDetail[];
}
