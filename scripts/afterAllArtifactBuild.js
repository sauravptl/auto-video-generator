const { execSync } = require('child_process');

exports.default = async function (buildResult) {
  if (!buildResult || !buildResult.artifactPaths) {
    return;
  }

  for (const artifactPath of buildResult.artifactPaths) {
    if (artifactPath.endsWith('.dmg')) {
      console.log(`[afterAllArtifactBuild] Ad-hoc signing DMG: ${artifactPath}`);
      try {
        execSync(`codesign --force --sign - "${artifactPath}"`, { stdio: 'inherit' });
        execSync(`codesign --verify --verbose=4 "${artifactPath}"`, { stdio: 'inherit' });
        console.log(`[afterAllArtifactBuild] Successfully signed DMG: ${artifactPath}`);
      } catch (err) {
        console.warn(`[afterAllArtifactBuild] Warning signing DMG ${artifactPath}:`, err.message);
      }
    }
  }
};
