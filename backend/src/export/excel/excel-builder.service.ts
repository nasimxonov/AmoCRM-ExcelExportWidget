import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { AmoCompany, AmoContact, AmoLead, ExportColumnKey } from '@excel-export/shared';
import { ExportEntityType } from '@excel-export/shared';
import type { AppConfig } from '../../config/configuration';
import { ExcelExportWriter } from './excel-export-writer';
import { buildCompanyColumns, buildContactColumns, buildLeadColumns } from './column-formatters';

const SHEET_NAMES: Record<ExportEntityType, string> = {
  [ExportEntityType.LEADS]: 'Leads',
  [ExportEntityType.CONTACTS]: 'Contacts',
  [ExportEntityType.COMPANIES]: 'Companies',
};

@Injectable()
export class ExcelBuilderService {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  async createWriter(
    jobId: string,
    entityType: ExportEntityType,
    columns: ExportColumnKey[],
  ): Promise<{ writer: ExcelExportWriter<AmoLead | AmoContact | AmoCompany>; filePath: string }> {
    const storageDir = resolve(this.configService.get('export', { infer: true }).storageDir);
    await mkdir(storageDir, { recursive: true });
    const filePath = join(storageDir, `${jobId}.xlsx`);

    const columnDefs =
      entityType === ExportEntityType.LEADS
        ? buildLeadColumns(columns)
        : entityType === ExportEntityType.CONTACTS
          ? buildContactColumns(columns)
          : buildCompanyColumns(columns);

    const writer = new ExcelExportWriter(
      filePath,
      columnDefs as never,
      SHEET_NAMES[entityType],
    ) as ExcelExportWriter<AmoLead | AmoContact | AmoCompany>;

    return { writer, filePath };
  }

  resolveFilePath(fileName: string): string {
    const storageDir = resolve(this.configService.get('export', { infer: true }).storageDir);
    return join(storageDir, fileName);
  }

  sanitizeFileName(requestedName: string | null, entityType: ExportEntityType): string {
    const base = requestedName?.trim() || `${entityType}-export-${Date.now()}`;
    const safe = base.replace(/[^\w\-. ()]/g, '_').slice(0, 100);
    return safe.endsWith('.xlsx') ? safe : `${safe}.xlsx`;
  }
}
