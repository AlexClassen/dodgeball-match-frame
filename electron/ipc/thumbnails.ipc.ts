import { dialog, ipcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import type { Division } from '../../shared/models';
import { thumbnailFilename } from '../../shared/models';
import { getClubsJsonPath, getGeneratedDir, getTemplatesJsonPath } from '../storage/paths';
import { readClubs, readTemplates } from '../storage/json-store';
import { bufferToDataUrl, renderThumbnail } from '../render/thumbnail-renderer';

interface ThumbnailPayload {
  templateId: string;
  leftClubId: string;
  rightClubId: string;
  division: Division;
}

function resolveThumbnailInput(payload: ThumbnailPayload) {
  const templates = readTemplates(getTemplatesJsonPath());
  const clubs = readClubs(getClubsJsonPath());

  const template = templates.find((item) => item.id === payload.templateId);
  const leftClub = clubs.find((item) => item.id === payload.leftClubId);
  const rightClub = clubs.find((item) => item.id === payload.rightClubId);

  if (!template) {
    throw new Error('Template not found.');
  }

  if (!leftClub || !rightClub) {
    throw new Error('One or both clubs were not found.');
  }

  return { template, leftClub, rightClub };
}

export function registerThumbnailIpc(): void {
  ipcMain.handle(
    'thumbnails:generatePreview',
    async (_event, payload: ThumbnailPayload): Promise<string> => {
      const input = resolveThumbnailInput(payload);
      const buffer = await renderThumbnail({ ...input, division: payload.division });
      return bufferToDataUrl(buffer);
    },
  );

  ipcMain.handle(
    'thumbnails:export',
    async (_event, payload: ThumbnailPayload): Promise<string | null> => {
      const input = resolveThumbnailInput(payload);
      const buffer = await renderThumbnail({ ...input, division: payload.division });
      const fileName = thumbnailFilename(
        payload.templateId,
        payload.leftClubId,
        payload.rightClubId,
        payload.division,
      );

      const generatedPath = path.join(getGeneratedDir(), fileName);
      fs.writeFileSync(generatedPath, buffer);

      const result = await dialog.showSaveDialog({
        defaultPath: fileName,
        filters: [{ name: 'PNG Image', extensions: ['png'] }],
      });

      if (result.canceled || !result.filePath) {
        return generatedPath;
      }

      fs.copyFileSync(generatedPath, result.filePath);
      return result.filePath;
    },
  );
}
