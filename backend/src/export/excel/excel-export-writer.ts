import ExcelJS from 'exceljs';
import type { ColumnDef } from './column-types';

export interface ExportSummaryMeta {
  entityLabel: string;
  accountSubdomain: string;
  generatedAt: Date;
  sourceMode: string;
  appliedFilters: Record<string, string>;
}

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1F2937' },
};
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' } };

/**
 * Wraps ExcelJS's streaming WorkbookWriter so rows are flushed to disk as
 * they arrive rather than accumulated in memory — this is what makes
 * 100,000+ row exports possible without exhausting the process heap.
 */
export class ExcelExportWriter<T> {
  private readonly workbook: ExcelJS.stream.xlsx.WorkbookWriter;
  private readonly sheet: ExcelJS.Worksheet;
  private rowCount = 0;

  constructor(
    filePath: string,
    private readonly columns: ColumnDef<T>[],
    sheetName: string,
  ) {
    this.workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      filename: filePath,
      useStyles: true,
      useSharedStrings: true,
    });
    this.workbook.creator = 'amoCRM Excel Export Widget';
    this.workbook.created = new Date();

    this.sheet = this.workbook.addWorksheet(sheetName, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    this.sheet.columns = columns.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width,
    }));

    const headerRow = this.sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = HEADER_FONT;
      cell.fill = HEADER_FILL;
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
    headerRow.commit();
  }

  appendRows(entities: T[]): void {
    for (const entity of entities) {
      const rowValues: Record<string, string | number | Date | null> = {};
      const hyperlinks: Record<string, string> = {};
      const fills: Record<string, string> = {};

      for (const column of this.columns) {
        const result = column.getValue(entity);
        rowValues[column.key] = result.value;
        if (result.hyperlink) hyperlinks[column.key] = result.hyperlink;
        if (result.fillColor) fills[column.key] = result.fillColor;
      }

      const row = this.sheet.addRow(rowValues);

      for (const column of this.columns) {
        const cell = row.getCell(column.key);
        if (column.numFmt) {
          cell.numFmt = column.numFmt;
        }
        const link = hyperlinks[column.key];
        if (link) {
          cell.value = { text: String(rowValues[column.key] ?? ''), hyperlink: link };
          cell.font = { color: { argb: 'FF2563EB' }, underline: true };
        }
        const fill = fills[column.key];
        if (fill) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${fill.toUpperCase()}` } };
        }
      }

      row.commit();
      this.rowCount += 1;
    }
  }

  addSummarySheet(meta: ExportSummaryMeta): void {
    const summary = this.workbook.addWorksheet('Summary');
    summary.columns = [
      { header: 'Field', key: 'field', width: 24 },
      { header: 'Value', key: 'value', width: 50 },
    ];
    const headerRow = summary.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = HEADER_FONT;
      cell.fill = HEADER_FILL;
    });
    headerRow.commit();

    const rows: [string, string][] = [
      ['Entity', meta.entityLabel],
      ['amoCRM account', meta.accountSubdomain],
      ['Export mode', meta.sourceMode],
      ['Generated at', meta.generatedAt.toISOString()],
      ['Total rows', String(this.rowCount)],
      ...Object.entries(meta.appliedFilters).map(([key, value]) => [key, value] as [string, string]),
    ];

    for (const [field, value] of rows) {
      summary.addRow({ field, value }).commit();
    }
    summary.commit();
  }

  get totalRows(): number {
    return this.rowCount;
  }

  async finalize(): Promise<void> {
    this.sheet.commit();
    await this.workbook.commit();
  }
}
