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

  let version = tauriConf.version;
  if (process.env.DYNAMIC_VERSION && !process.env.DYNAMIC_VERSION.includes('undefined')) {
    version = process.env.DYNAMIC_VERSION;
  }
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
  const rawMatchingInstallers = dirEntries.filter((file) => {
    const lower = file.toLowerCase();
    const isExe = lower.endsWith('.exe') && !lower.endsWith('.sig');
    const matchesVersion = file.includes(version);
    return isExe && matchesVersion;
  });

  // Group candidate installers by their canonical dot-separated name (spaces replaced with dots)
  const canonicalGroups = new Map();
  for (const file of rawMatchingInstallers) {
    const canonical = file.replace(/\s+/g, '.');
    if (!canonicalGroups.has(canonical)) {
      canonicalGroups.set(canonical, []);
    }
    canonicalGroups.get(canonical).push(file);
  }

  // Strict fail-closed policy: at least one installer family is required
  if (canonicalGroups.size === 0) {
    console.error(`FATAL [updater-manifest]: No Windows installer .exe matching version "${version}" found in ${bundleDir}.`);
    console.error(`Available files in directory:\n  - ${dirEntries.length > 0 ? dirEntries.join('\n  - ') : '(empty directory)'}`);
    process.exit(1);
  }

  // If there are multiple genuinely distinct canonical installers for the same version, fail closed
  if (canonicalGroups.size > 1) {
    console.error(`FATAL [updater-manifest]: Ambiguous installer artifacts found for version "${version}" in ${bundleDir}:`);
    canonicalGroups.forEach((variants, canonical) => {
      console.error(`  - Canonical: ${canonical} (Variants: ${variants.join(', ')})`);
    });
    console.error(`Expected exactly one matching Windows installer .exe family.`);
    process.exit(1);
  }

  // Exactly one canonical installer family found!
  const [canonicalFileName, variants] = Array.from(canonicalGroups.entries())[0];
  console.log(`[updater-manifest] Resolved canonical installer: ${canonicalFileName} (Variants: ${variants.join(', ')})`);

  const canonicalFilePath = path.join(bundleDir, canonicalFileName);
  const canonicalSigFilePath = path.join(bundleDir, `${canonicalFileName}.sig`);

  // Ensure the dot-sanitized file exists on disk (if only space-named variant exists, copy it)
  if (!fs.existsSync(canonicalFilePath)) {
    const sourceVariant = variants.find((v) => fs.existsSync(path.join(bundleDir, v)));
    if (!sourceVariant) {
      console.error(`FATAL [updater-manifest]: Source installer file variant not found for ${canonicalFileName}`);
      process.exit(1);
    }
    const sourceVariantPath = path.join(bundleDir, sourceVariant);
    fs.copyFileSync(sourceVariantPath, canonicalFilePath);
    console.log(`[updater-manifest] Mirrored source variant '${sourceVariant}' -> '${canonicalFileName}'`);
  }

  // Verify that the canonical installer is a valid non-empty file
  const installerStat = fs.statSync(canonicalFilePath);
  if (installerStat.size === 0) {
    console.error(`FATAL [updater-manifest]: Installer file is empty (0 bytes): ${canonicalFilePath}`);
    process.exit(1);
  }

  // Ensure matching signature file exists for the canonical dot-named installer
  if (!fs.existsSync(canonicalSigFilePath)) {
    // Check if any of the variants has a matching signature file (e.g. space-named file + .sig)
    let foundSigVariantPath = null;
    for (const v of variants) {
      const candidateSig = path.join(bundleDir, `${v}.sig`);
      if (fs.existsSync(candidateSig)) {
        foundSigVariantPath = candidateSig;
        break;
      }
    }

    if (foundSigVariantPath) {
      fs.copyFileSync(foundSigVariantPath, canonicalSigFilePath);
      console.log(`[updater-manifest] Mirrored signature from '${path.basename(foundSigVariantPath)}' -> '${canonicalFileName}.sig'`);
    } else {
      console.error(`FATAL [updater-manifest]: Missing signature file for installer.`);
      console.error(`Expected: ${canonicalSigFilePath}`);
      console.error(`Checked variants for signatures:\n  - ${variants.map((v) => `${v}.sig`).join('\n  - ')}`);
      console.error(`The installer was generated but no cryptographic signature (.sig) was created.`);
      console.error(`Ensure TAURI_SIGNING_PRIVATE_KEY is set in GitHub Secrets.`);
      process.exit(1);
    }
  }

  // Read entire signature file as UTF-8 and preserve exact contents
  const signatureContent = fs.readFileSync(canonicalSigFilePath, 'utf8').trim();

  // Strict validation: non-empty, not a placeholder
  if (!signatureContent || signatureContent.length === 0) {
    console.error(`FATAL [updater-manifest]: Signature file is empty: ${canonicalSigFilePath}`);
    process.exit(1);
  }

  if (
    signatureContent.toLowerCase().includes('placeholder') ||
    signatureContent.includes('...') ||
    signatureContent.length < 32
  ) {
    console.error(`FATAL [updater-manifest]: Signature in ${canonicalFileName}.sig failed validation (detected invalid/placeholder).`);
    process.exit(1);
  }

  // Construct URL using sanitized filename matching GitHub Release assets
  const downloadUrl = `https://github.com/${repo}/releases/download/${tag}/${canonicalFileName}`;

  const commitSha = process.env.GITHUB_SHA || process.env.COMMIT_SHA || '';
  const notes = process.env.RELEASE_NOTES || process.env.COMMIT_MESSAGE || `Wahas ERP update (v${version})`;

  // Build manifest adhering strictly to Tauri 2 schema
  const manifest = {
    version: version,
    commitSha: commitSha,
    notes: notes,
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
  console.log(`  - Installer: ${canonicalFileName} (${installerStat.size} bytes)`);
  console.log(`  - Signature: ${canonicalFileName}.sig (${signatureContent.length} chars)`);
  console.log(`  - Download URL: ${downloadUrl}`);
  console.log(`  - Manifest locations:`);
  outputPaths.forEach(p => console.log(`      * ${p}`));

  return manifest;
}

// Execute directly if run via CLI
if (process.argv[1] && (process.argv[1].endsWith('generate-update-manifest.mjs') || process.argv[1].endsWith('generate-update-manifest'))) {
  generateUpdateManifest();
}
