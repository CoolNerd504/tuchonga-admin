#!/usr/bin/env node

/**
 * Post-build script to fix ESM import paths in compiled API code
 * Changes ../../src/services/ to ../src/services/ in dist-api/routes/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distApiRoutes = path.join(__dirname, '../dist-api/routes');
const distApiMiddleware = path.join(__dirname, '../dist-api/middleware');

function fixImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Replace ../../src/services/ with ../src/services/ and ensure .js extension
  content = content.replace(/from ['"]\.\.\/\.\.\/src\/services\/([^'"]+)(['"])/g, (match, modulePath, quote) => {
    const jsPath = modulePath.endsWith('.js') ? modulePath : `${modulePath}.js`;
    return `from '../src/services/${jsPath}${quote}`;
  });
  
  // Also fix any imports that already have ../src/services/ but missing .js
  content = content.replace(/from ['"]\.\.\/src\/services\/([^'"]+)(['"])/g, (match, modulePath, quote) => {
    const jsPath = modulePath.endsWith('.js') ? modulePath : `${modulePath}.js`;
    return `from '../src/services/${jsPath}${quote}`;
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed imports in: ${path.relative(process.cwd(), filePath)}`);
  }
}

function fixImportsInDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return;
  }
  
  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isFile() && file.endsWith('.js')) {
      fixImportsInFile(filePath);
    }
  });
}

// Fix imports in routes and middleware
fixImportsInDir(distApiRoutes);
fixImportsInDir(distApiMiddleware);

console.log('Import path fixes complete!');

