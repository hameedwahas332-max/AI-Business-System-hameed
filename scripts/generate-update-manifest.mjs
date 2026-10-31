import fs from 'fs';
import path from 'path';

/**
 * Enterprise Fail-Closed Updater Manifest Generator for Tauri 2 Windows x64
 * 
 * Accurately pairs Windows NSIS .exe installers with their matching .exe.sig signatures
 * generated under Tauri 2 ("createUpdaterArtifacts": true).
 */
export function generateUpdateManifest(baseDir = process.cwd()) {
  const rootDir = path.resolve(baseDir);
  const tauriConfPath = path.join(rootDir, 'src-tauri', 'tauri.conf.json');

  if (!fs.existsSync(tauriConfPath)) {
    console.error(`FATAL [updater-manifest]: Configuration file not found: ${tauriConfPath}`);
    process.exit(1);
  }

  let tauriConf;
  try {
    tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
  } catch (err) {
    console.error(`FATAL [updater-manifest]: Failed to parse tauri.conf.json:`, err.message);
    process.exit(1);
  }

  const version = tauriConf.version;
  if (!version || typeof version !== 'string' || !/^\d+\.\d+\.\d+/.test(version)) {
    console.error(`FATAL [updater-manifest]: Invalid semantic version in tauri.conf.json: "${version}"`);
    process.exit(1);
  }

  const tag = process.env.RELEASE_TAG || `v${version}`;
  const repo = process.env.GITHUB_REPOSITORY || 'hameedwahas332-max/AI-Business-System-hameed';

  console.log(`[updater-manifest] Searching for Windows x64 NSIS artifacts for version ${version} (Release Tag: ${tag})`);

  // Target candidate directories where Tauri outputs NSIS installer artifacts
  const candidateDirs = [
    path.join(rootDir, 'src-tauri', 'target', 'x86_64-pc-windows-msvc', 'release', 'bundle', 'nsis'),
    path.join(rootDir, 'src-tauri', 'target', 'release', 'bundle', 'nsis')
  ];

  let bundleDir = null;
  for (const dir of candidateDirs) {
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      bundleDir = dir;
      break;
    }
  }

  if (!bundleDir) {
    console.error(`FATAL [updater-manifest]: NSIS bundle output directory does not exist.`);
    console.error(`Checked locations:\n  - ${candidateDirs.join('\n  - ')}`);
    process.exit(1);
  }

  console.log(`[updater-manifest] Inspecting output directory: ${bundleDir}`);
  const dirEntries = fs.readdirSync(bundleDir);

  // Identify Windows installer .exe files matching version:
  // - Must end with .exe (case-insensitive)
  // - Must NOT be a signature file (.sig)
  // - Must contain the authoritative version string
  const matchingInstallers = dirEntries.filter((file) => {
    const lower = file.toLowerCase();
    const isExe = lower.endsWith('.exe') && !lower.endsWith('.sig');
    const matchesVersion = file.includes(version);
    return isExe && matchesVersion;
  });

  // Strict fail-closed policy: exactly one matching installer is required
  if (matchingInstallers.length === 0) {
    console.error(`FATAL [updater-manifest]: No Windows installer .exe matching version "${version}" found in ${bundleDir}.`);
    console.error(`Available files in directory:\n  - ${dirEntries.length > 0 ? dirEntries.join('\n  - ') : '(empty directory)'}`);
    process.exit(1);
  }

  if (matchingInstallers.length > 1) {
    console.error(`FATAL [updater-manifest]: Ambiguous installer artifacts found for version "${version}" in ${bundleDir}:`);
    matchingInstallers.forEach(f => console.error(`  - ${f}`));
    console.error(`Expected exactly one matching Windows installer .exe.`);
    process.exit(1);
  }

  const installerFileName = matchingInstallers[0];
  const installerFilePath = path.join(bundleDir, installerFileName);

  // Verify that the installer is a valid non-empty file
  const installerStat = fs.statSync(installerFilePath);
  if (installerStat.size === 0) {
    console.error(`FATAL [updater-manifest]: Installer file is empty (0 bytes): ${installerFilePath}`);
    process.exit(1);
  }

  // Exact matching signature file: append .sig to the complete installer filename
  const signatureFileName = `${installerFileName}.sig`;
  const signatureFilePath = path.join(bundleDir, signatureFileName);

  if (!fs.existsSync(signatureFilePath)) {
    console.error(`FATAL [updater-manifest]: Missing signature file for installer.`);
    console.error(`Expected: ${signatureFilePath}`);
    console.error(`The installer was generated but no cryptographic signature (.sig) was created.`);
    console.error(`Ensure TAURI_SIGNING_PRIVATE_KEY is set in GitHub Secrets.`);
    process.exit(1);
  }

  // Read entire signature file as UTF-8 and preserve exact contents
  const signatureContent = fs.readFileSync(signatureFilePath, 'utf8').trim();

  // Strict validation: non-empty, not a placeholder
  if (!signatureContent || signatureContent.length === 0) {
    console.error(`FATAL [updater-manifest]: Signature file is empty: ${signatureFilePath}`);
    process.exit(1);
  }

  if (
    signatureContent.toLowerCase().includes('placeholder') ||
    signatureContent.includes('...') ||
    signatureContent.length < 32
  ) {
    console.error(`FATAL [updater-manifest]: Signature in ${signatureFileName} failed validation (detected invalid/placeholder).`);
    process.exit(1);
  }

  // Construct URL properly encoding special characters (e.g. spaces -> %20)
  const encodedInstallerFileName = encodeURIComponent(installerFileName);
  const downloadUrl = `https://github.com/${repo}/releases/download/${tag}/${encodedInstallerFileName}`;

  // Build manifest adhering strictly to Tauri 2 schema
  const manifest = {
    version: version,
    notes: "Wahas ERP update",
    pub_date: new Date().toISOString(),
    platforms: {
      "windows-x86_64": {
        signature: signatureContent,
        url: downloadUrl
      }
    }
  };

  const outputPaths = [
    path.join(rootDir, 'latest.json'),
    path.join(rootDir, 'dist', 'latest.json')
  ];

  for (const outPath of outputPaths) {
    const parentDir = path.dirname(outPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  }

  console.log(`[updater-manifest] Successfully generated latest.json:`);
  console.log(`  - Installer: ${installerFileName} (${installerStat.size} bytes)`);
  console.log(`  - Signature: ${signatureFileName} (${signatureContent.length} chars)`);
  console.log(`  - Download URL: ${downloadUrl}`);
  console.log(`  - Manifest locations:`);
  outputPaths.forEach(p => console.log(`      * ${p}`));

  return manifest;
}

// Execute directly if run via CLI
if (process.argv[1] && (process.argv[1].endsWith('generate-update-manifest.mjs') || process.argv[1].endsWith('generate-update-manifest'))) {
  generateUpdateManifest();
}
