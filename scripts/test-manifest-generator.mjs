import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const testDir = path.join(process.cwd(), '.tmp_manifest_test');

function cleanup() {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

function runManifestScript(workingDir, env = {}) {
  try {
    const stdout = execSync(`node ${path.join(process.cwd(), 'scripts', 'generate-update-manifest.mjs')}`, {
      cwd: workingDir,
      env: { ...process.env, ...env },
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { success: true, stdout };
  } catch (err) {
    return { success: false, status: err.status, stderr: err.stderr, stdout: err.stdout };
  }
}

function setupFixture(version, files) {
  cleanup();
  fs.mkdirSync(testDir, { recursive: true });

  // Create src-tauri/tauri.conf.json
  const tauriDir = path.join(testDir, 'src-tauri');
  fs.mkdirSync(tauriDir, { recursive: true });
  fs.writeFileSync(
    path.join(tauriDir, 'tauri.conf.json'),
    JSON.stringify({ version, productName: 'AI Business System - Wahas ERP' }, null, 2),
    'utf8'
  );

  // Create nsis bundle directory
  const nsisDir = path.join(tauriDir, 'target', 'x86_64-pc-windows-msvc', 'release', 'bundle', 'nsis');
  fs.mkdirSync(nsisDir, { recursive: true });

  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(nsisDir, name), content, 'utf8');
  }
}

console.log('=== RUNNING TAURI UPDATER MANIFEST GENERATOR TEST SUITE ===');

const validSig = 'dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkKUlVTRXc4OHUvVjExaDFyV1N4eDBpeVNLbG1kWnZvOVMrUzc1RG5qSW5jTHVtOEZkcnpqWlZQVVZKTEJDU0RYQ0YrSEVYRXViT210NVBnQ0xvTmt3T28yZGdScnFEcVpXbHdzPQp0cnVzdGVkIGNvbW1lbnQ6IHRpbWVzdGFtcDoxNzkzNDc3MDM5CWZpbGU6dGVzdF9maWxlLmJpbgpiRzUrWVdqdUFJcktldm11aWhCNnZLVXJNcVRMdGZ3TmtYRHZSS2hiZmlNZEtQRlJQU21VTW45Y01LTElZNTNjbFpuR1FVMkdraTJzTjBIYzlNdVVCZz09Cg==';
const installerName = 'AI Business System - Wahas ERP_2.4.1_x64-setup.exe';

// TEST 1: Realistic .exe and matching .exe.sig pairing
console.log('\n[Test 1] Valid .exe and matching .exe.sig:');
setupFixture('2.4.1', {
  [installerName]: 'DUMMY_BINARY_INSTALLER_CONTENT',
  [`${installerName}.sig`]: validSig
});

const res1 = runManifestScript(testDir, {
  RELEASE_TAG: 'v2.4.1',
  GITHUB_REPOSITORY: 'hameedwahas332-max/AI-Business-System-hameed'
});

if (!res1.success) {
  console.error('FAIL: Test 1 exited with error:', res1.stderr);
  process.exit(1);
}

const manifestPath = path.join(testDir, 'latest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

if (manifest.version !== '2.4.1') {
  console.error('FAIL: Incorrect manifest version:', manifest.version);
  process.exit(1);
}
if (manifest.platforms['windows-x86_64'].signature !== validSig) {
  console.error('FAIL: Signature altered in manifest!');
  process.exit(1);
}
const expectedUrl = 'https://github.com/hameedwahas332-max/AI-Business-System-hameed/releases/download/v2.4.1/AI.Business.System.-.Wahas.ERP_2.4.1_x64-setup.exe';
if (manifest.platforms['windows-x86_64'].url !== expectedUrl) {
  console.error('FAIL: URL encoding mismatch. Got:', manifest.platforms['windows-x86_64'].url, 'Expected:', expectedUrl);
  process.exit(1);
}
console.log('PASS: Correctly parsed installer, preserved full signature, and built dot-sanitized URL.');

// TEST 2: Missing installer
console.log('\n[Test 2] Missing installer file:');
setupFixture('2.4.1', {
  [`${installerName}.sig`]: validSig
});
const res2 = runManifestScript(testDir);
if (res2.success) {
  console.error('FAIL: Expected script to fail when installer is missing!');
  process.exit(1);
}
console.log('PASS: Script failed closed as expected when installer is missing.');

// TEST 3: Missing signature
console.log('\n[Test 3] Missing signature file:');
setupFixture('2.4.1', {
  [installerName]: 'DUMMY_BINARY_INSTALLER_CONTENT'
});
const res3 = runManifestScript(testDir);
if (res3.success) {
  console.error('FAIL: Expected script to fail when signature is missing!');
  process.exit(1);
}
console.log('PASS: Script failed closed as expected when signature is missing.');

// TEST 4: Ambiguous installers
console.log('\n[Test 4] Ambiguous multiple installers for same version:');
setupFixture('2.4.1', {
  [installerName]: 'DUMMY_CONTENT_1',
  [`${installerName}.sig`]: validSig,
  'AI Business System - Wahas ERP_2.4.1_x64-setup-extra.exe': 'DUMMY_CONTENT_2',
  'AI Business System - Wahas ERP_2.4.1_x64-setup-extra.exe.sig': validSig
});
const res4 = runManifestScript(testDir);
if (res4.success) {
  console.error('FAIL: Expected script to fail on ambiguous installers!');
  process.exit(1);
}
console.log('PASS: Script failed closed on ambiguous installer artifacts.');

// TEST 5: Placeholder or invalid signature rejection
console.log('\n[Test 5] Reject placeholder signature:');
setupFixture('2.4.1', {
  [installerName]: 'DUMMY_BINARY_INSTALLER_CONTENT',
  [`${installerName}.sig`]: 'dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkK...'
});
const res5 = runManifestScript(testDir);
if (res5.success) {
  console.error('FAIL: Expected script to reject placeholder signature!');
  process.exit(1);
}
console.log('PASS: Script strictly rejected placeholder signature.');

cleanup();
console.log('\n=== ALL 5 MANIFEST GENERATION TESTS PASSED WITH 100% SUCCESS ===');
