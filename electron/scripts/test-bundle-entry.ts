import { app } from 'electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  exportTemplatesBundle,
  importTemplatesBundle,
} from '../storage/export-import';
import { getTemplatesJsonPath } from '../storage/paths';
import { readTemplates } from '../storage/json-store';

async function main(): Promise<void> {
  app.setName('match-framer');
  await app.whenReady();

  const zipPath = path.join(os.tmpdir(), `match-framer-import-test-${Date.now()}.zip`);
  const before = readTemplates(getTemplatesJsonPath()).length;

  console.log('Exporting templates to', zipPath);
  await exportTemplatesBundle(zipPath);

  console.log('Importing templates from', zipPath);
  const result = await importTemplatesBundle(zipPath);
  const after = readTemplates(getTemplatesJsonPath()).length;

  console.log('Import result:', result);
  console.log('Templates before:', before, 'after:', after);

  if (result.imported === 0) {
    throw new Error('Expected to import at least one template.');
  }

  if (after <= before) {
    throw new Error('Template count did not increase after import.');
  }

  fs.unlinkSync(zipPath);
  console.log('Import test passed.');
}

main()
  .then(() => {
    app.quit();
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error('Import test failed:', error);
    app.quit();
    process.exit(1);
  });
