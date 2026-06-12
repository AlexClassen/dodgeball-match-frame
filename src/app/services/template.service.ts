import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import type { ImportBundlePreview, ImportResult, ImportSelectedPayload } from '../../../shared/api';
import type { DivisionTexts, Template, TemplateElements } from '../models/template.model';
import { getApi } from './match-framer-bridge';

@Injectable({ providedIn: 'root' })
export class TemplateService {
  getTemplates(): Observable<Template[]> {
    return from(getApi().templates.list());
  }

  createTemplate(name: string, backgroundFile: File): Observable<Template> {
    const sourceBackgroundPath = getApi().getPathForFile(backgroundFile);
    return from(getApi().templates.create({ name, sourceBackgroundPath }));
  }

  updateTemplate(
    id: string,
    data: { name?: string; backgroundFile?: File },
  ): Observable<Template> {
    const payload: { id: string; name?: string; sourceBackgroundPath?: string } = { id };

    if (data.name !== undefined) {
      payload.name = data.name;
    }

    if (data.backgroundFile) {
      payload.sourceBackgroundPath = getApi().getPathForFile(data.backgroundFile);
    }

    return from(getApi().templates.update(payload));
  }

  deleteTemplate(id: string): Observable<void> {
    return from(getApi().templates.delete(id));
  }

  saveTemplateLayout(
    id: string,
    elements: TemplateElements,
    width: number,
    height: number,
    divisionTexts?: DivisionTexts,
  ): Observable<Template> {
    return from(getApi().templates.saveLayout({ id, elements, width, height, divisionTexts }));
  }

  readAssetDataUrl(relativePath: string): Observable<string> {
    return from(getApi().assets.readDataUrl(relativePath));
  }

  exportTemplates(ids: string[]): Observable<string | null> {
    return from(getApi().templates.export(ids));
  }

  pickImportBundle(): Observable<ImportBundlePreview | null> {
    return from(getApi().templates.pickImportBundle());
  }

  importSelectedTemplates(payload: ImportSelectedPayload): Observable<ImportResult> {
    return from(getApi().templates.importSelected(payload));
  }
}
