import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { getDataRoot } from './paths';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.svg', '.webp']);

export function assertImageExtension(filePath: string): void {
  const ext = path.extname(filePath).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(ext)) {
    throw new Error(`Unsupported image format: ${ext || 'unknown'}`);
  }
}

export async function copyImageToDir(
  sourcePath: string,
  targetDir: string,
  baseName: string,
): Promise<{ relativePath: string; absolutePath: string }> {
  assertImageExtension(sourcePath);

  const ext = path.extname(sourcePath).toLowerCase();
  const outputExt = ext === '.svg' ? '.png' : ext;
  const fileName = `${baseName}${outputExt}`;
  const absolutePath = path.join(targetDir, fileName);

  fs.mkdirSync(targetDir, { recursive: true });

  if (ext === '.svg') {
    await sharp(sourcePath).png().toFile(absolutePath);
  } else {
    await sharp(sourcePath).toFile(absolutePath);
  }

  const relativePath = path
    .relative(getDataRoot(), absolutePath)
    .split(path.sep)
    .join('/');

  return { relativePath, absolutePath };
}

export async function getImageDimensions(
  filePath: string,
): Promise<{ width: number; height: number }> {
  const metadata = await sharp(filePath).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('Could not read image dimensions.');
  }

  return { width: metadata.width, height: metadata.height };
}

export function deleteFileIfExists(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export function readFileAsDataUrl(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime =
    ext === '.png'
      ? 'image/png'
      : ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.svg'
          ? 'image/svg+xml'
          : ext === '.webp'
            ? 'image/webp'
            : 'application/octet-stream';

  return `data:${mime};base64,${buffer.toString('base64')}`;
}
