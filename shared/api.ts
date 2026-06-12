import type { Club, Division, DivisionTexts, Template, TemplateElements } from './models';

export interface ImportResult {
  imported: number;
  renamed: number;
}

export interface ImportBundleItem {
  id: string;
  name: string;
}

export interface ImportBundlePreview {
  sourcePath: string;
  items: ImportBundleItem[];
}

export interface ImportSelectedPayload {
  sourcePath: string;
  ids: string[];
}

export interface MatchFramerApi {
  getPathForFile(file: File): string;
  clubs: {
    list(): Promise<Club[]>;
    create(payload: { name: string; sourceLogoPath: string }): Promise<Club>;
    update(payload: { id: string; name?: string; sourceLogoPath?: string }): Promise<Club>;
    delete(id: string): Promise<void>;
    export(ids: string[]): Promise<string | null>;
    pickImportBundle(): Promise<ImportBundlePreview | null>;
    importSelected(payload: ImportSelectedPayload): Promise<ImportResult>;
  };
  templates: {
    list(): Promise<Template[]>;
    create(payload: { name: string; sourceBackgroundPath: string }): Promise<Template>;
    update(payload: { id: string; name?: string; sourceBackgroundPath?: string }): Promise<Template>;
    delete(id: string): Promise<void>;
    saveLayout(payload: {
      id: string;
      elements: TemplateElements;
      width: number;
      height: number;
      divisionTexts?: DivisionTexts;
    }): Promise<Template>;
    export(ids: string[]): Promise<string | null>;
    pickImportBundle(): Promise<ImportBundlePreview | null>;
    importSelected(payload: ImportSelectedPayload): Promise<ImportResult>;
  };
  assets: {
    readDataUrl(relativePath: string): Promise<string>;
  };
  thumbnails: {
    generatePreview(payload: {
      templateId: string;
      leftClubId: string;
      rightClubId: string;
      division: Division;
    }): Promise<string>;
    export(payload: {
      templateId: string;
      leftClubId: string;
      rightClubId: string;
      division: Division;
    }): Promise<string | null>;
  };
}
