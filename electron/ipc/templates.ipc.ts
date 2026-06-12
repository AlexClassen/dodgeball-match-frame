import { dialog, ipcMain } from 'electron';
import { getDialogWindow } from './dialog-window';
import type { ImportResult } from '../../shared/api';
import type { DivisionTexts, Template, TemplateElements } from '../../shared/models';
import { templatesBundleFileName } from '../storage/bundle';
import {
  exportTemplatesBundle,
  importTemplatesBundle,
  peekTemplatesBundle,
} from '../storage/export-import';
import { createDefaultElementsForSize, defaultDivisionTexts } from '../../shared/models';
import {
  getTemplateBackgroundsDir,
  getTemplatesJsonPath,
  resolveDataPath,
} from '../storage/paths';
import { readTemplates, writeTemplates } from '../storage/json-store';
import {
  copyImageToDir,
  deleteFileIfExists,
  getImageDimensions,
} from '../storage/file-store';
import { slugify, uniqueSlug } from '../storage/slug';

interface CreateTemplatePayload {
  name: string;
  sourceBackgroundPath: string;
}

interface UpdateTemplatePayload {
  id: string;
  name?: string;
  sourceBackgroundPath?: string;
}

interface SaveLayoutPayload {
  id: string;
  elements: TemplateElements;
  width: number;
  height: number;
  divisionTexts?: DivisionTexts;
}

export function registerTemplateIpc(): void {
  ipcMain.handle('templates:list', (): Template[] => {
    return readTemplates(getTemplatesJsonPath());
  });

  ipcMain.handle(
    'templates:create',
    async (_event, payload: CreateTemplatePayload): Promise<Template> => {
      const templates = readTemplates(getTemplatesJsonPath());
      const baseId = slugify(payload.name);

      if (!baseId) {
        throw new Error('Template name must contain at least one letter or number.');
      }

      const id = uniqueSlug(
        baseId,
        templates.map((template) => template.id),
      );

      const dimensions = await getImageDimensions(payload.sourceBackgroundPath);
      const { relativePath } = await copyImageToDir(
        payload.sourceBackgroundPath,
        getTemplateBackgroundsDir(),
        id,
      );

      const templateName = payload.name.trim();
      const template: Template = {
        id,
        name: templateName,
        backgroundPath: relativePath,
        width: dimensions.width,
        height: dimensions.height,
        elements: createDefaultElementsForSize(dimensions.width, dimensions.height),
        divisionTexts: defaultDivisionTexts(templateName),
      };

      templates.push(template);
      writeTemplates(getTemplatesJsonPath(), templates);
      return template;
    },
  );

  ipcMain.handle(
    'templates:update',
    async (_event, payload: UpdateTemplatePayload): Promise<Template> => {
      const templates = readTemplates(getTemplatesJsonPath());
      const index = templates.findIndex((template) => template.id === payload.id);

      if (index === -1) {
        throw new Error('Template not found.');
      }

      const existing = templates[index];

      if (payload.name?.trim()) {
        existing.name = payload.name.trim();
      }

      if (payload.sourceBackgroundPath) {
        deleteFileIfExists(resolveDataPath(existing.backgroundPath));
        const dimensions = await getImageDimensions(payload.sourceBackgroundPath);
        const { relativePath } = await copyImageToDir(
          payload.sourceBackgroundPath,
          getTemplateBackgroundsDir(),
          existing.id,
        );
        existing.backgroundPath = relativePath;
        existing.width = dimensions.width;
        existing.height = dimensions.height;
      }

      templates[index] = existing;
      writeTemplates(getTemplatesJsonPath(), templates);
      return existing;
    },
  );

  ipcMain.handle('templates:delete', (_event, id: string): void => {
    const templates = readTemplates(getTemplatesJsonPath());
    const template = templates.find((item) => item.id === id);

    if (!template) {
      throw new Error('Template not found.');
    }

    deleteFileIfExists(resolveDataPath(template.backgroundPath));
    writeTemplates(
      getTemplatesJsonPath(),
      templates.filter((item) => item.id !== id),
    );
  });

  ipcMain.handle(
    'templates:saveLayout',
    (_event, payload: SaveLayoutPayload): Template => {
      const templates = readTemplates(getTemplatesJsonPath());
      const index = templates.findIndex((template) => template.id === payload.id);

      if (index === -1) {
        throw new Error('Template not found.');
      }

      const existing = templates[index];
      existing.elements = payload.elements;
      existing.width = payload.width;
      existing.height = payload.height;

      if (payload.divisionTexts) {
        existing.divisionTexts = payload.divisionTexts;
      }

      templates[index] = existing;
      writeTemplates(getTemplatesJsonPath(), templates);
      return existing;
    },
  );

  ipcMain.handle('templates:export', async (_event, ids: string[]): Promise<string | null> => {
    const result = await dialog.showSaveDialog(getDialogWindow(), {
      defaultPath: templatesBundleFileName(),
      filters: [{ name: 'Match Framer Templates Bundle', extensions: ['zip'] }],
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    await exportTemplatesBundle(result.filePath, ids);
    return result.filePath;
  });

  ipcMain.handle('templates:pickImport', async () => {
    const result = await dialog.showOpenDialog(getDialogWindow(), {
      filters: [{ name: 'Match Framer Templates Bundle', extensions: ['zip'] }],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const sourcePath = result.filePaths[0];
    const templates = peekTemplatesBundle(sourcePath);

    return {
      sourcePath,
      items: templates.map((template) => ({ id: template.id, name: template.name })),
    };
  });

  ipcMain.handle(
    'templates:importSelected',
    async (_event, payload: { sourcePath: string; ids: string[] }): Promise<ImportResult> => {
      return importTemplatesBundle(payload.sourcePath, payload.ids);
    },
  );
}
