import fs from 'node:fs';
import type { Club, Template } from '../../shared/models';

export function readJsonFile<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

export function writeJsonFile<T>(filePath: string, data: T): void {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export function readClubs(filePath: string): Club[] {
  return readJsonFile<Club[]>(filePath);
}

export function writeClubs(filePath: string, clubs: Club[]): void {
  writeJsonFile(filePath, clubs);
}

export function readTemplates(filePath: string): Template[] {
  return readJsonFile<Template[]>(filePath);
}

export function writeTemplates(filePath: string, templates: Template[]): void {
  writeJsonFile(filePath, templates);
}
