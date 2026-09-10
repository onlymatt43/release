#!/usr/bin/env node

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const errors = [];

// 1. Check for deleted files/directories from phase 1.1
const deletedPaths = [
  'app/consent',
  'app/signed',
  'app/api/consent',
  'app/admin/contacts',
  'app/admin/shoots',
  'app/admin/participations',
  'app/api/admin/shoots',
  'components/AddressAutocomplete.tsx',
  'components/ConsentForm.tsx',
  'components/FileUploadZone.tsx',
  'components/SignaturePad.tsx',
  'components/admin/NewShootForm.tsx',
  'components/admin/PrintButton.tsx',
  'components/admin/QRCodePanel.tsx',
  'components/admin/QuickConsentLink.tsx',
  'components/admin/ShootCard.tsx',
  'lib/r2.ts',
  'lib/types.ts',
  'CORS-R2-SETUP.md'
];

for (const path of deletedPaths) {
  const fullPath = resolve(path);
  if (existsSync(fullPath)) {
    errors.push(`INVARIANT VIOLATION: Path exists but should be deleted: ${path}`);
  }
}

// 2. Check package.json for forbidden dependencies
const packageJsonPath = resolve('package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const forbiddenDeps = [
  '@aws-sdk/client-s3',
  '@aws-sdk/s3-request-presigner',
  '@googlemaps/js-api-loader',
  'browser-image-compression',
  'react-qr-code',
  'react-signature-canvas'
];

for (const dep of forbiddenDeps) {
  if (packageJson.dependencies?.[dep]) {
    errors.push(`INVARIANT VIOLATION: Forbidden dependency still in package.json: ${dep}`);
  }
}

// 3. Check db/schema.sql for only agreements and agreement_parties
const schemaPath = resolve('db/schema.sql');
const schema = readFileSync(schemaPath, 'utf8');
const tableMatches = schema.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi) || [];
const tables = tableMatches.map(m => m.match(/(\w+)$/)[1].toLowerCase());
const allowedTables = ['agreements', 'agreement_parties'];

for (const table of tables) {
  if (!allowedTables.includes(table)) {
    errors.push(`INVARIANT VIOLATION: db/schema.sql contains forbidden table: ${table}`);
  }
}

// 4. Check .env.example for forbidden variables
const envPath = resolve('.env.example');
const envContent = readFileSync(envPath, 'utf8');
const forbiddenEnvVars = ['R2_', 'GOOGLE_MAPS', 'CONSENT_WEBHOOK'];

for (const varPattern of forbiddenEnvVars) {
  if (envContent.includes(varPattern)) {
    errors.push(`INVARIANT VIOLATION: .env.example contains forbidden variable pattern: ${varPattern}`);
  }
}

// 5. Check privacy and terms pages for forbidden words
const privacyPath = resolve('app/privacy/page.tsx');
const termsPath = resolve('app/terms/page.tsx');
const forbiddenWords = ['R2', 'Cloudflare'];

for (const path of [privacyPath, termsPath]) {
  const content = readFileSync(path, 'utf8');
  for (const word of forbiddenWords) {
    if (content.includes(word)) {
      errors.push(`INVARIANT VIOLATION: ${path} contains forbidden word: ${word}`);
    }
  }
}

// Report results
if (errors.length > 0) {
  console.error('\n❌ INVARIANT VIOLATIONS FOUND:\n');
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  console.error('\nrelease cannot store user data. Fix the violations above.\n');
  process.exit(1);
}

console.log('✓ All invariants verified');
process.exit(0);
