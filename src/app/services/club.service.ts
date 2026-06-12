import { Injectable } from '@angular/core';
import { forkJoin, from, Observable } from 'rxjs';
import type { ImportBundlePreview, ImportResult, ImportSelectedPayload } from '../../../shared/api';
import type { Club } from '../models/club.model';
import { getApi } from './match-framer-bridge';

@Injectable({ providedIn: 'root' })
export class ClubService {
  getClubs(): Observable<Club[]> {
    return from(getApi().clubs.list());
  }

  createClub(name: string, logoFile: File): Observable<Club> {
    const sourceLogoPath = getApi().getPathForFile(logoFile);
    return from(getApi().clubs.create({ name, sourceLogoPath }));
  }

  updateClub(
    id: string,
    data: { name?: string; logoFile?: File },
  ): Observable<Club> {
    const payload: { id: string; name?: string; sourceLogoPath?: string } = { id };

    if (data.name !== undefined) {
      payload.name = data.name;
    }

    if (data.logoFile) {
      payload.sourceLogoPath = getApi().getPathForFile(data.logoFile);
    }

    return from(getApi().clubs.update(payload));
  }

  deleteClub(id: string): Observable<void> {
    return from(getApi().clubs.delete(id));
  }

  deleteClubs(ids: string[]): Observable<void[]> {
    if (ids.length === 0) {
      return from(Promise.resolve([]));
    }

    return forkJoin(ids.map((id) => this.deleteClub(id)));
  }

  exportClubs(ids: string[]): Observable<string | null> {
    return from(getApi().clubs.export(ids));
  }

  pickImportBundle(): Observable<ImportBundlePreview | null> {
    return from(getApi().clubs.pickImportBundle());
  }

  importSelectedClubs(payload: ImportSelectedPayload): Observable<ImportResult> {
    return from(getApi().clubs.importSelected(payload));
  }
}
