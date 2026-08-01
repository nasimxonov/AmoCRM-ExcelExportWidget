export interface CellResult {
  value: string | number | Date | null;
  hyperlink?: string;
  /** 6-digit hex (no #) used for an optional cell background fill. */
  fillColor?: string;
}

export interface ColumnDef<T> {
  key: string;
  header: string;
  width: number;
  numFmt?: string;
  getValue: (entity: T) => CellResult;
}
