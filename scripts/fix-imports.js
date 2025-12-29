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
  
  // Helper function to add .js extension if missing
  const addJsExtension = (modulePath) => {
    return modulePath.endsWith('.js') ? modulePath : `${modulePath}.js`;
  };
  
  // Fix static imports: from '../../src/services/...'
  content = content.replace(/from ['"]\.\.\/\.\.\/src\/services\/([^'"]+)(['"])/g, (match, modulePath, quote) => {
    const jsPath = addJsExtension(modulePath);
    return `from '../../src/services/${jsPath}${quote}`;
  });
  
  // Fix dynamic imports: import('../../src/services/...')
  content = content.replace(/import\(['"]\.\.\/\.\.\/src\/services\/([^'"]+)(['"])\)/g, (match, modulePath, quote) => {
    const jsPath = addJsExtension(modulePath);
    return `import('../../src/services/${jsPath}${quote})`;
  });
  
  // Fix static imports: from '../middleware/...'
  content = content.replace(/from ['"]\.\.\/middleware\/([^'"]+)(['"])/g, (match, modulePath, quote) => {
    const jsPath = addJsExtension(modulePath);
    return `from '../middleware/${jsPath}${quote}`;
  });
  
  // Fix dynamic imports: import('../middleware/...')
  content = content.replace(/import\(['"]\.\.\/middleware\/([^'"]+)(['"])\)/g, (match, modulePath, quote) => {
    const jsPath = addJsExtension(modulePath);
    return `import('../middleware/${jsPath}${quote})`;
  });
  
  // Fix static imports: from './routes/...'
  content = content.replace(/from ['"]\.\/routes\/([^'"]+)(['"])/g, (match, modulePath, quote) => {
    const jsPath = addJsExtension(modulePath);
    return `from './routes/${jsPath}${quote}`;
  });
  
  // Fix dynamic imports: import('./routes/...')
  content = content.replace(/import\(['"]\.\/routes\/([^'"]+)(['"])\)/g, (match, modulePath, quote) => {
    const jsPath = addJsExtension(modulePath);
    return `import('./routes/${jsPath}${quote})`;
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

