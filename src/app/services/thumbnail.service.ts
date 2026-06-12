import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import type { Division } from '../models/division.model';
import { getApi } from './match-framer-bridge';

export interface ThumbnailRequest {
  templateId: string;
  leftClubId: string;
  rightClubId: string;
  division: Division;
}

@Injectable({ providedIn: 'root' })
export class ThumbnailService {
  generatePreview(request: ThumbnailRequest): Observable<string> {
    return from(getApi().thumbnails.generatePreview(request));
  }

  exportThumbnail(request: ThumbnailRequest): Observable<string | null> {
    return from(getApi().thumbnails.export(request));
  }
}
