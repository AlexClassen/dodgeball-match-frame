import { ipcMain } from 'electron';
import { resolveDataPath } from '../storage/paths';
import { readFileAsDataUrl } from '../storage/file-store';

export function registerAssetsIpc(): void {
  ipcMain.handle('assets:readDataUrl', (_event, relativePath: string): string => {
    return readFileAsDataUrl(resolveDataPath(relativePath));
  });
}
