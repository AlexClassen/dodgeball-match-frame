import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { registerAssetsIpc } from './ipc/assets.ipc';
import { registerClubIpc } from './ipc/clubs.ipc';
import { registerTemplateIpc } from './ipc/templates.ipc';
import { registerThumbnailIpc } from './ipc/thumbnails.ipc';
import { ensureDataDirs } from './storage/paths';

const isDev = !app.isPackaged;

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:4200');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../browser/index.html'));
  }
}

app.whenReady().then(() => {
  ensureDataDirs();
  registerClubIpc();
  registerTemplateIpc();
  registerAssetsIpc();
  registerThumbnailIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
