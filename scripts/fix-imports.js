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

const distApiRoutes = path.join(__dirname, '../dist-api/api/routes');
const distApiMiddleware = path.join(__dirname, '../dist-api/api/middleware');

function fixImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Add .js extension to ../../src/services/ imports if missing (keep path as-is)
  content = content.replace(/from ['"]\.\.\/\.\.\/src\/services\/([^'"]+)(['"])/g, (match, modulePath, quote) => {
    const jsPath = modulePath.endsWith('.js') ? modulePath : `${modulePath}.js`;
    return `from '../../src/services/${jsPath}${quote}`;
  });
  
  // Add .js extension to ../middleware/ imports if missing
  content = content.replace(/from ['"]\.\.\/middleware\/([^'"]+)(['"])/g, (match, modulePath, quote) => {
    const jsPath = modulePath.endsWith('.js') ? modulePath : `${modulePath}.js`;
    return `from '../middleware/${jsPath}${quote}`;
  });
  
  // Add .js extension to ./routes/ imports if missing (in server.js)
  content = content.replace(/from ['"]\.\/routes\/([^'"]+)(['"])/g, (match, modulePath, quote) => {
    const jsPath = modulePath.endsWith('.js') ? modulePath : `${modulePath}.js`;
    return `from './routes/${jsPath}${quote}`;
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

// Also fix server.js
const serverFile = path.join(__dirname, '../dist-api/api/server.js');
if (fs.existsSync(serverFile)) {
  fixImportsInFile(serverFile);
}

console.log('Import path fixes complete!');

