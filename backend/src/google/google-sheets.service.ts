import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { google, type sheets_v4 } from 'googleapis';
import type { AmoLead, DigitalPipelineTriggerSettings } from '@excel-export/shared';
import { GoogleOAuthService } from './google-oauth.service';

const DEFAULT_HEADER = [
  'ID', 'Название', 'Бюджет', 'Статус', 'Воронка', 'Ответственный', 'Создано', 'Обновлено',
];

/**
 * Writes one row per Digital Pipeline trigger fire into the configured
 * Google Sheet. `field_codes` (from the trigger's quick-setup settings) adds
 * extra columns pulled from the lead's custom fields, matched by fieldCode,
 * fieldName, or numeric fieldId.
 */
@Injectable()
export class GoogleSheetsService {
  constructor(private readonly googleOAuthService: GoogleOAuthService) {}

  async appendLeadRow(
    accountDbId: number,
    settings: DigitalPipelineTriggerSettings,
    lead: AmoLead,
  ): Promise<void> {
    const spreadsheetId = this.parseSpreadsheetId(settings.spreadsheetUrl);
    const accessToken = await this.googleOAuthService.getValidAccessToken(accountDbId);

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const sheets = google.sheets({ version: 'v4', auth });

    const header = settings.fieldCodes.length > 0
      ? [...DEFAULT_HEADER, ...settings.fieldCodes]
      : DEFAULT_HEADER;

    await this.ensureHeaderRow(sheets, spreadsheetId, settings.sheetName, header);

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${settings.sheetName}!A:A`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [this.buildRow(lead, settings.fieldCodes)] },
    });
  }

  private async ensureHeaderRow(
    sheets: sheets_v4.Sheets,
    spreadsheetId: string,
    sheetName: string,
    header: string[],
  ): Promise<void> {
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!1:1`,
    });
    if (existing.data.values && existing.data.values.length > 0) return;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [header] },
    });
  }

  private buildRow(lead: AmoLead, fieldCodes: string[]): (string | number)[] {
    const base: (string | number)[] = [
      lead.id,
      lead.name,
      lead.price,
      lead.statusName,
      lead.pipelineName,
      lead.responsibleUserName,
      lead.createdAt,
      lead.updatedAt,
    ];

    const extra = fieldCodes.map((code) => {
      const field = lead.customFields.find(
        (candidate) =>
          candidate.fieldCode === code || candidate.fieldName === code || String(candidate.fieldId) === code,
      );
      if (!field) return '';
      return field.values.map((value) => String(value.value ?? '')).join(', ');
    });

    return [...base, ...extra];
  }

  private parseSpreadsheetId(url: string): string {
    const match = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(url);
    if (!match) {
      throw new UnprocessableEntityException(`Could not parse a spreadsheet ID out of "${url}"`);
    }
    return match[1];
  }
}
