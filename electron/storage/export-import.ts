import AdmZip from 'adm-zip';
import { ZipArchive } from 'archiver';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Club, Template } from '../../shared/models';
import type { ImportResult } from '../../shared/api';
import {
  BUNDLE_VERSION,
  type BundleManifest,
  type BundleType,
  isClub,
  isTemplate,
} from './bundle';
import { readClubs, readTemplates, writeClubs, writeTemplates } from './json-store';
import {
  getClubLogosDir,
  getClubsJsonPath,
  getDataRoot,
  getTemplateBackgroundsDir,
  getTemplatesJsonPath,
  resolveDataPath,
} from './paths';
import { uniqueSlug } from './slug';

function createTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return dir;
}

function removeDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyAssetToDir(
  sourcePath: string,
  targetDir: string,
  baseName: string,
): { relativePath: string; absolutePath: string } {
  const ext = path.extname(sourcePath);
  const fileName = `${baseName}${ext}`;
  const absolutePath = path.join(targetDir, fileName);

  fs.mkdirSync(targetDir, { recursive: true });
  fs.copyFileSync(sourcePath, absolutePath);

  const relativePath = path
    .relative(getDataRoot(), absolutePath)
    .split(path.sep)
    .join('/');

  return { relativePath, absolutePath };
}

function extractZipArchive(sourcePath: string, destDir: string): void {
  fs.mkdirSync(destDir, { recursive: true });
  new AdmZip(sourcePath).extractAllTo(destDir, true);
}

async function createZipArchive(sourceDir: string, zipPath: string): Promise<void> {
  const output = fs.createWriteStream(zipPath);
  const archive = new ZipArchive({ zlib: { level: 9 } });

  await new Promise<void>((resolve, reject) => {
    output.on('close', () => resolve());
    archive.on('error', reject);
    output.on('error', reject);

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize().catch(reject);
  });
}

function writeManifest(dir: string, type: BundleType): void {
  const manifest: BundleManifest = {
    version: BUNDLE_VERSION,
    type,
    exportedAt: new Date().toISOString(),
  };

  fs.writeFileSync(path.join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

function readManifest(dir: string): BundleManifest {
  const manifestPath = path.join(dir, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    throw new Error('Invalid bundle: manifest.json is missing.');
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as BundleManifest;

  if (manifest.version !== BUNDLE_VERSION) {
    throw new Error(`Unsupported bundle version: ${manifest.version}.`);
  }

  if (manifest.type !== 'clubs' && manifest.type !== 'templates') {
    throw new Error('Invalid bundle: unknown data type.');
  }

  return manifest;
}

function readBundleData<T>(dir: string, fileName: string, validate: (value: unknown) => value is T): T[] {
  const dataPath = path.join(dir, fileName);

  if (!fs.existsSync(dataPath)) {
    throw new Error(`Invalid bundle: ${fileName} is missing.`);
  }

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  if (!Array.isArray(data)) {
    throw new Error(`Invalid bundle: ${fileName} must contain an array.`);
  }

  for (const item of data) {
    if (!validate(item)) {
      throw new Error(`Invalid bundle: ${fileName} contains malformed entries.`);
    }
  }

  return data;
}

function resolveBundleAssetPath(extractDir: string, relativePath: string): string {
  const normalized = relativePath.split('/').join(path.sep);
  const directPath = path.join(extractDir, normalized);

  if (fs.existsSync(directPath)) {
    return directPath;
  }

  const fallbackPath = path.join(extractDir, 'assets', normalized);
  if (fs.existsSync(fallbackPath)) {
    return fallbackPath;
  }

  throw new Error(`Missing asset in bundle: ${relativePath}`);
}

function readJsonEntryFromZip<T>(zipPath: string, entryName: string): T {
  const zip = new AdmZip(zipPath);
  const entry = zip.getEntry(entryName);

  if (!entry) {
    throw new Error(`Invalid bundle: ${entryName} is missing.`);
  }

  return JSON.parse(entry.getData().toString('utf8')) as T;
}

function readManifestFromZip(zipPath: string): BundleManifest {
  const manifest = readJsonEntryFromZip<BundleManifest>(zipPath, 'manifest.json');

  if (manifest.version !== BUNDLE_VERSION) {
    throw new Error(`Unsupported bundle version: ${manifest.version}.`);
  }

  if (manifest.type !== 'clubs' && manifest.type !== 'templates') {
    throw new Error('Invalid bundle: unknown data type.');
  }

  return manifest;
}

export function peekClubsBundle(sourcePath: string): Club[] {
  const manifest = readManifestFromZip(sourcePath);

  if (manifest.type !== 'clubs') {
    throw new Error('This bundle does not contain clubs data.');
  }

  const clubs = readJsonEntryFromZip<unknown[]>(sourcePath, 'clubs.json');

  if (!Array.isArray(clubs)) {
    throw new Error('Invalid bundle: clubs.json must contain an array.');
  }

  for (const club of clubs) {
    if (!isClub(club)) {
      throw new Error('Invalid bundle: clubs.json contains malformed entries.');
    }
  }

  return clubs;
}

export function peekTemplatesBundle(sourcePath: string): Template[] {
  const manifest = readManifestFromZip(sourcePath);

  if (manifest.type !== 'templates') {
    throw new Error('This bundle does not contain templates data.');
  }

  const templates = readJsonEntryFromZip<unknown[]>(sourcePath, 'templates.json');

  if (!Array.isArray(templates)) {
    throw new Error('Invalid bundle: templates.json must contain an array.');
  }

  for (const template of templates) {
    if (!isTemplate(template)) {
      throw new Error('Invalid bundle: templates.json contains malformed entries.');
    }
  }

  return templates;
}

export async function exportClubsBundle(destinationPath: string, ids: string[]): Promise<void> {
  if (ids.length === 0) {
    throw new Error('Select at least one club to export.');
  }

  const selectedIds = new Set(ids);
  const clubs = readClubs(getClubsJsonPath()).filter((club) => selectedIds.has(club.id));

  if (clubs.length === 0) {
    throw new Error('No matching clubs found to export.');
  }

  const stagingDir = createTempDir('match-framer-export-clubs-');

  try {
    writeManifest(stagingDir, 'clubs');
    fs.writeFileSync(
      path.join(stagingDir, 'clubs.json'),
      `${JSON.stringify(clubs, null, 2)}\n`,
      'utf8',
    );

    for (const club of clubs) {
      const sourcePath = resolveDataPath(club.logoPath);
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Logo file not found for club "${club.name}".`);
      }

      const assetDir = path.join(stagingDir, path.dirname(club.logoPath));
      fs.mkdirSync(assetDir, { recursive: true });
      fs.copyFileSync(sourcePath, path.join(stagingDir, club.logoPath.split('/').join(path.sep)));
    }

    await createZipArchive(stagingDir, destinationPath);
  } finally {
    removeDir(stagingDir);
  }
}

export async function exportTemplatesBundle(destinationPath: string, ids: string[]): Promise<void> {
  if (ids.length === 0) {
    throw new Error('Select at least one template to export.');
  }

  const selectedIds = new Set(ids);
  const templates = readTemplates(getTemplatesJsonPath()).filter((template) =>
    selectedIds.has(template.id),
  );

  if (templates.length === 0) {
    throw new Error('No matching templates found to export.');
  }

  const stagingDir = createTempDir('match-framer-export-templates-');

  try {
    writeManifest(stagingDir, 'templates');
    fs.writeFileSync(
      path.join(stagingDir, 'templates.json'),
      `${JSON.stringify(templates, null, 2)}\n`,
      'utf8',
    );

    for (const template of templates) {
      const sourcePath = resolveDataPath(template.backgroundPath);
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Background file not found for template "${template.name}".`);
      }

      const assetDir = path.join(stagingDir, path.dirname(template.backgroundPath));
      fs.mkdirSync(assetDir, { recursive: true });
      fs.copyFileSync(
        sourcePath,
        path.join(stagingDir, template.backgroundPath.split('/').join(path.sep)),
      );
    }

    await createZipArchive(stagingDir, destinationPath);
  } finally {
    removeDir(stagingDir);
  }
}

export async function importClubsBundle(sourcePath: string, ids: string[]): Promise<ImportResult> {
  if (ids.length === 0) {
    throw new Error('Select at least one club to import.');
  }

  const extractDir = createTempDir('match-framer-import-clubs-');

  try {
    extractZipArchive(sourcePath, extractDir);
    const manifest = readManifest(extractDir);

    if (manifest.type !== 'clubs') {
      throw new Error('This bundle does not contain clubs data.');
    }

    const selectedIds = new Set(ids);
    const importedClubs = readBundleData(extractDir, 'clubs.json', isClub).filter((club) =>
      selectedIds.has(club.id),
    );

    if (importedClubs.length === 0) {
      throw new Error('No matching clubs found in bundle.');
    }
    const existingClubs = readClubs(getClubsJsonPath());
    const existingIds = existingClubs.map((club) => club.id);
    let renamed = 0;

    for (const club of importedClubs) {
      const sourceAssetPath = resolveBundleAssetPath(extractDir, club.logoPath);
      let targetId = club.id;

      if (existingIds.includes(targetId)) {
        targetId = uniqueSlug(targetId, existingIds);
        renamed++;
      }

      const { relativePath } = copyAssetToDir(sourceAssetPath, getClubLogosDir(), targetId);
      existingClubs.push({
        id: targetId,
        name: club.name,
        logoPath: relativePath,
      });
      existingIds.push(targetId);
    }

    writeClubs(getClubsJsonPath(), existingClubs);

    return { imported: importedClubs.length, renamed };
  } finally {
    removeDir(extractDir);
  }
}

export async function importTemplatesBundle(
  sourcePath: string,
  ids: string[],
): Promise<ImportResult> {
  if (ids.length === 0) {
    throw new Error('Select at least one template to import.');
  }

  const extractDir = createTempDir('match-framer-import-templates-');

  try {
    extractZipArchive(sourcePath, extractDir);
    const manifest = readManifest(extractDir);

    if (manifest.type !== 'templates') {
      throw new Error('This bundle does not contain templates data.');
    }

    const selectedIds = new Set(ids);
    const importedTemplates = readBundleData(extractDir, 'templates.json', isTemplate).filter(
      (template) => selectedIds.has(template.id),
    );

    if (importedTemplates.length === 0) {
      throw new Error('No matching templates found in bundle.');
    }
    const existingTemplates = readTemplates(getTemplatesJsonPath());
    const existingIds = existingTemplates.map((template) => template.id);
    let renamed = 0;

    for (const template of importedTemplates) {
      const sourceAssetPath = resolveBundleAssetPath(extractDir, template.backgroundPath);
      let targetId = template.id;

      if (existingIds.includes(targetId)) {
        targetId = uniqueSlug(targetId, existingIds);
        renamed++;
      }

      const { relativePath } = copyAssetToDir(
        sourceAssetPath,
        getTemplateBackgroundsDir(),
        targetId,
      );

      existingTemplates.push({
        ...template,
        id: targetId,
        backgroundPath: relativePath,
      });
      existingIds.push(targetId);
    }

    writeTemplates(getTemplatesJsonPath(), existingTemplates);

    return { imported: importedTemplates.length, renamed };
  } finally {
    removeDir(extractDir);
  }
}
