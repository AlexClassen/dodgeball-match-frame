import { dialog, ipcMain } from 'electron';
import { getDialogWindow } from './dialog-window';
import type { ImportResult } from '../../shared/api';
import type { Club } from '../../shared/models';
import { clubsBundleFileName } from '../storage/bundle';
import { exportClubsBundle, importClubsBundle, peekClubsBundle } from '../storage/export-import';
import {
  getClubLogosDir,
  getClubsJsonPath,
  getDataRoot,
  resolveDataPath,
} from '../storage/paths';
import { readClubs, writeClubs } from '../storage/json-store';
import { copyImageToDir, deleteFileIfExists } from '../storage/file-store';
import { slugify, uniqueSlug } from '../storage/slug';

interface CreateClubPayload {
  name: string;
  sourceLogoPath: string;
}

interface UpdateClubPayload {
  id: string;
  name?: string;
  sourceLogoPath?: string;
}

export function registerClubIpc(): void {
  ipcMain.handle('clubs:list', (): Club[] => {
    return readClubs(getClubsJsonPath());
  });

  ipcMain.handle('clubs:create', async (_event, payload: CreateClubPayload): Promise<Club> => {
    const clubs = readClubs(getClubsJsonPath());
    const baseId = slugify(payload.name);

    if (!baseId) {
      throw new Error('Club name must contain at least one letter or number.');
    }

    const id = uniqueSlug(
      baseId,
      clubs.map((club) => club.id),
    );

    const { relativePath } = await copyImageToDir(
      payload.sourceLogoPath,
      getClubLogosDir(),
      id,
    );

    const club: Club = {
      id,
      name: payload.name.trim(),
      logoPath: relativePath,
    };

    clubs.push(club);
    writeClubs(getClubsJsonPath(), clubs);
    return club;
  });

  ipcMain.handle('clubs:update', async (_event, payload: UpdateClubPayload): Promise<Club> => {
    const clubs = readClubs(getClubsJsonPath());
    const index = clubs.findIndex((club) => club.id === payload.id);

    if (index === -1) {
      throw new Error('Club not found.');
    }

    const existing = clubs[index];

    if (payload.name?.trim()) {
      existing.name = payload.name.trim();
    }

    if (payload.sourceLogoPath) {
      deleteFileIfExists(resolveDataPath(existing.logoPath));
      const { relativePath } = await copyImageToDir(
        payload.sourceLogoPath,
        getClubLogosDir(),
        existing.id,
      );
      existing.logoPath = relativePath;
    }

    clubs[index] = existing;
    writeClubs(getClubsJsonPath(), clubs);
    return existing;
  });

  ipcMain.handle('clubs:delete', (_event, id: string): void => {
    const clubs = readClubs(getClubsJsonPath());
    const club = clubs.find((item) => item.id === id);

    if (!club) {
      throw new Error('Club not found.');
    }

    deleteFileIfExists(resolveDataPath(club.logoPath));
    writeClubs(
      getClubsJsonPath(),
      clubs.filter((item) => item.id !== id),
    );
  });

  ipcMain.handle('clubs:export', async (_event, ids: string[]): Promise<string | null> => {
    const result = await dialog.showSaveDialog(getDialogWindow(), {
      defaultPath: clubsBundleFileName(),
      filters: [{ name: 'Match Framer Clubs Bundle', extensions: ['zip'] }],
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    await exportClubsBundle(result.filePath, ids);
    return result.filePath;
  });

  ipcMain.handle('clubs:pickImport', async () => {
    const result = await dialog.showOpenDialog(getDialogWindow(), {
      filters: [{ name: 'Match Framer Clubs Bundle', extensions: ['zip'] }],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const sourcePath = result.filePaths[0];
    const clubs = peekClubsBundle(sourcePath);

    return {
      sourcePath,
      items: clubs.map((club) => ({ id: club.id, name: club.name })),
    };
  });

  ipcMain.handle(
    'clubs:importSelected',
    async (_event, payload: { sourcePath: string; ids: string[] }): Promise<ImportResult> => {
      return importClubsBundle(payload.sourcePath, payload.ids);
    },
  );
}
