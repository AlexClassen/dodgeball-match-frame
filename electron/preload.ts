import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { MatchFramerApi } from '../shared/api';

const api: MatchFramerApi = {
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  clubs: {
    list: () => ipcRenderer.invoke('clubs:list'),
    create: (payload) => ipcRenderer.invoke('clubs:create', payload),
    update: (payload) => ipcRenderer.invoke('clubs:update', payload),
    delete: (id) => ipcRenderer.invoke('clubs:delete', id),
    export: (ids) => ipcRenderer.invoke('clubs:export', ids),
    pickImportBundle: () => ipcRenderer.invoke('clubs:pickImport'),
    importSelected: (payload) => ipcRenderer.invoke('clubs:importSelected', payload),
  },
  templates: {
    list: () => ipcRenderer.invoke('templates:list'),
    create: (payload) => ipcRenderer.invoke('templates:create', payload),
    update: (payload) => ipcRenderer.invoke('templates:update', payload),
    delete: (id) => ipcRenderer.invoke('templates:delete', id),
    saveLayout: (payload) => ipcRenderer.invoke('templates:saveLayout', payload),
    export: (ids) => ipcRenderer.invoke('templates:export', ids),
    pickImportBundle: () => ipcRenderer.invoke('templates:pickImport'),
    importSelected: (payload) => ipcRenderer.invoke('templates:importSelected', payload),
  },
  assets: {
    readDataUrl: (relativePath) => ipcRenderer.invoke('assets:readDataUrl', relativePath),
  },
  thumbnails: {
    generatePreview: (payload) => ipcRenderer.invoke('thumbnails:generatePreview', payload),
    export: (payload) => ipcRenderer.invoke('thumbnails:export', payload),
  },
};

contextBridge.exposeInMainWorld('matchFramer', api);
