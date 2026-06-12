import { execSync } from 'node:child_process';
import path from 'node:path';

export default async function afterPack(context) {
  if (process.platform !== 'darwin') {
    return;
  }

  // Proper Developer ID signing is handled by electron-builder when CI secrets are set.
  if (process.env.CSC_LINK) {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);

  console.log(`Ad-hoc signing ${appPath}`);
  execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' });
}
