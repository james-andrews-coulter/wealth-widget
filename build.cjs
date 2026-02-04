// Simple concatenation build for Scriptable compatibility
const fs = require('fs');
const path = require('path');

// Shared library modules (in dependency order)
const libModules = [
  'lib/config.js',
  'lib/formatters.js',
  'lib/data-loader.js',
  'lib/api-client.js',
  'lib/calculations.js',
  'lib/chart-renderer.js',
  'lib/ui-components.js'
];

// Widget definitions
const widgets = [
  {
    name: 'Wealth Widget',
    entry: 'widget.js',
    output: 'dist/widget.js'
  },
  {
    name: 'Income Widget',
    entry: 'income-widget.js',
    output: 'dist/income-widget.js'
  }
];

function buildWidget(widgetDef) {
  console.log(`\nBuilding ${widgetDef.name}...`);

  let output = `// ${widgetDef.name} - Built ${new Date().toISOString()}\n`;
  output += '// Auto-generated - Do not edit directly. Edit source files in src/\n\n';

  // Concatenate lib modules
  libModules.forEach(modulePath => {
    const fullPath = path.join('src', modulePath);

    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️  Warning: ${modulePath} not found, skipping...`);
      return;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const stripped = stripES6Syntax(content);

    output += `// === ${modulePath} ===\n`;
    output += stripped;
    output += '\n\n';

    console.log(`  ✓ Included ${modulePath}`);
  });

  // Concatenate entry point
  const entryPath = path.join('src', widgetDef.entry);

  if (!fs.existsSync(entryPath)) {
    console.error(`❌ Error: Entry point ${widgetDef.entry} not found`);
    process.exit(1);
  }

  const entryContent = fs.readFileSync(entryPath, 'utf8');
  const strippedEntry = stripES6Syntax(entryContent);

  output += `// === ${widgetDef.entry} ===\n`;
  output += strippedEntry;
  output += '\n';

  console.log(`  ✓ Included ${widgetDef.entry}`);

  // Ensure dist directory exists
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }

  // Write output
  fs.writeFileSync(widgetDef.output, output, 'utf8');

  const sizeKB = (fs.statSync(widgetDef.output).size / 1024).toFixed(2);
  console.log(`  ✅ Build complete: ${widgetDef.output} (${sizeKB} KB)`);
}

function stripES6Syntax(content) {
  return content
    .replace(/export\s+(const|function|class|let|var)/g, '$1')
    .replace(/import\s+.+from.+;?\n/g, '')
    .replace(/export\s+default\s+/g, '')
    .replace(/export\s*\{[^}]+\};?\n/g, '');
}

// Build all widgets
console.log('Building Scriptable Widgets...');

widgets.forEach(buildWidget);

console.log('\n📱 Copy files from dist/ to Scriptable app to deploy\n');
