// Simple concatenation build for Scriptable compatibility
const fs = require('fs');
const path = require('path');

// Module load order (dependencies first)
const modules = [
  'lib/config.js',
  'lib/formatters.js',
  'lib/data-loader.js',
  'lib/api-client.js',
  'lib/calculations.js',
  'lib/chart-renderer.js',
  'lib/ui-components.js',
  'widget.js'
];

console.log('Building Wealth Widget...\n');

let output = `// Wealth Widget - Built ${new Date().toISOString()}\n`;
output += '// Auto-generated - Do not edit directly. Edit source files in src/\n\n';

modules.forEach(modulePath => {
  const fullPath = path.join('src', modulePath);

  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️  Warning: ${modulePath} not found, skipping...`);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');

  // Strip ES6 module syntax for Scriptable compatibility
  const stripped = content
    .replace(/export\s+(const|function|class|let|var)/g, '$1')
    .replace(/import\s+.+from.+;?\n/g, '')
    .replace(/export\s+default\s+/g, '')
    .replace(/export\s*\{[^}]+\};?\n/g, '');

  output += `// === ${modulePath} ===\n`;
  output += stripped;
  output += '\n\n';

  console.log(`✓ Included ${modulePath}`);
});

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

fs.writeFileSync('dist/widget.js', output, 'utf8');

const sizeKB = (fs.statSync('dist/widget.js').size / 1024).toFixed(2);
console.log(`\n✅ Build complete: dist/widget.js (${sizeKB} KB)`);
console.log('📱 Copy to Scriptable app to deploy\n');
