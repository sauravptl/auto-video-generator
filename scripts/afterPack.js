const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

exports.default = async function (context) {
  if (context.electronPlatformName !== 'darwin') {
    return;
  }

  const appName = `${context.packager.appInfo.productFilename}.app`;
  const appPath = path.join(context.appOutDir, appName);
  const entitlementsPath = path.join(__dirname, '..', 'build', 'entitlements.mac.plist');

  console.log(`[afterPack] Cleaning extended attributes for: ${appPath}`);
  try {
    execSync(`xattr -cr "${appPath}"`, { stdio: 'inherit' });
  } catch (err) {
    console.warn('[afterPack] xattr warning:', err.message);
  }

  console.log(`[afterPack] Ad-hoc signing macOS bundle: ${appPath}`);

  // Helper to safely codesign an item
  const signItem = (targetPath, options = '') => {
    try {
      execSync(`codesign --force --sign - ${options} "${targetPath}"`, { stdio: 'inherit' });
    } catch (err) {
      console.error(`[afterPack] Failed to sign ${targetPath}:`, err.message);
      throw err;
    }
  };

  // 1. Sign native libraries and node addons inside app.asar.unpacked or Frameworks
  const findAndSign = (dir, extPattern) => {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        findAndSign(fullPath, extPattern);
      } else if (extPattern.test(entry.name)) {
        signItem(fullPath);
      }
    }
  };

  const frameworksDir = path.join(appPath, 'Contents', 'Frameworks');
  const resourcesDir = path.join(appPath, 'Contents', 'Resources');

  // Sign any dylibs and node addons in resources
  findAndSign(resourcesDir, /\.(dylib|node)$/);

  // Sign frameworks and helper apps inside Frameworks
  if (fs.existsSync(frameworksDir)) {
    const fwEntries = fs.readdirSync(frameworksDir, { withFileTypes: true });
    for (const entry of fwEntries) {
      const fullPath = path.join(frameworksDir, entry.name);
      if (entry.name.endsWith('.framework') || entry.name.endsWith('.app') || entry.name.endsWith('.dylib')) {
        signItem(fullPath, '--deep');
      }
    }
  }

  // 2. Sign the main application bundle with entitlements
  const entitlementsFlag = fs.existsSync(entitlementsPath) ? `--entitlements "${entitlementsPath}"` : '';
  signItem(appPath, `--deep ${entitlementsFlag}`);

  // 3. Verify strict deep signature
  console.log(`[afterPack] Verifying bundle signature...`);
  execSync(`codesign --verify --deep --strict --verbose=4 "${appPath}"`, { stdio: 'inherit' });
  console.log(`[afterPack] Code signing verified successfully.`);
};
