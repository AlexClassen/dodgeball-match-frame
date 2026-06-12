import type { Club, Template } from '../../shared/models';

export const BUNDLE_VERSION = 1;

export type BundleType = 'clubs' | 'templates';

export interface BundleManifest {
  version: number;
  type: BundleType;
  exportedAt: string;
}

export function clubsBundleFileName(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `match-framer-clubs-${date}.zip`;
}

export function templatesBundleFileName(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `match-framer-templates-${date}.zip`;
}

export function isClub(value: unknown): value is Club {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const club = value as Club;
  return (
    typeof club.id === 'string' &&
    typeof club.name === 'string' &&
    typeof club.logoPath === 'string'
  );
}

export function isTemplate(value: unknown): value is Template {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const template = value as Template;
  return (
    typeof template.id === 'string' &&
    typeof template.name === 'string' &&
    typeof template.backgroundPath === 'string' &&
    typeof template.width === 'number' &&
    typeof template.height === 'number' &&
    template.elements !== null &&
    typeof template.elements === 'object' &&
    !Array.isArray(template.elements)
  );
}
