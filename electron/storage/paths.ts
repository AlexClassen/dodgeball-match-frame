import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

const DATA_DIR_NAME = 'match-framer-data';

function getLegacyDataRoots(): string[] {
  const userData = app.getPath('userData');
  const roots = [
    path.join(path.dirname(userData), 'matchkit', 'matchkit-data'),
    path.join(userData, 'matchkit-data'),
  ];

  return [...new Set(roots)].filter((root) => root !== getDataRoot());
}

function isDataEmpty(dataRoot: string): boolean {
  const clubsPath = path.join(dataRoot, 'clubs', 'clubs.json');
  const templatesPath = path.join(dataRoot, 'templates', 'templates.json');

  if (!fs.existsSync(clubsPath) || !fs.existsSync(templatesPath)) {
    return true;
  }

  try {
    const clubs = JSON.parse(fs.readFileSync(clubsPath, 'utf8')) as unknown[];
    const templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8')) as unknown[];
    return clubs.length === 0 && templates.length === 0;
  } catch {
    return true;
  }
}

function copyDirRecursive(sourceDir: string, targetDir: string): void {
  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function migrateLegacyDataIfNeeded(): void {
  const dataRoot = getDataRoot();

  if (!isDataEmpty(dataRoot)) {
    return;
  }

  for (const legacyRoot of getLegacyDataRoots()) {
    if (!fs.existsSync(legacyRoot) || isDataEmpty(legacyRoot)) {
      continue;
    }

    console.log(`[match-framer] Migrating data from ${legacyRoot}`);
    copyDirRecursive(legacyRoot, dataRoot);
    return;
  }
}

export function getDataRoot(): string {
  return path.join(app.getPath('userData'), DATA_DIR_NAME);
}

export function getClubsJsonPath(): string {
  return path.join(getDataRoot(), 'clubs', 'clubs.json');
}

export function getTemplatesJsonPath(): string {
  return path.join(getDataRoot(), 'templates', 'templates.json');
}

export function getClubLogosDir(): string {
  return path.join(getDataRoot(), 'clubs', 'logos');
}

export function getTemplateBackgroundsDir(): string {
  return path.join(getDataRoot(), 'templates', 'backgrounds');
}

export function getGeneratedDir(): string {
  return path.join(getDataRoot(), 'generated');
}

export function resolveDataPath(relativePath: string): string {
  return path.join(getDataRoot(), relativePath);
}

export function ensureDataDirs(): void {
  const dirs = [
    getDataRoot(),
    path.dirname(getClubsJsonPath()),
    getClubLogosDir(),
    path.dirname(getTemplatesJsonPath()),
    getTemplateBackgroundsDir(),
    getGeneratedDir(),
  ];

  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(getClubsJsonPath())) {
    fs.writeFileSync(getClubsJsonPath(), '[]\n', 'utf8');
  }

  if (!fs.existsSync(getTemplatesJsonPath())) {
    fs.writeFileSync(getTemplatesJsonPath(), '[]\n', 'utf8');
  }

  migrateLegacyDataIfNeeded();
}
