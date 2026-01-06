# Deployment Guide

## ⚠️ IMPORTANT: Which File to Use

**DO NOT** copy files from `src/` directory to Scriptable!

The `src/` directory contains modular source files that **won't work** in Scriptable because Scriptable doesn't support ES6 modules.

## ✅ Correct Deployment Process

### 1. Build the Widget

```bash
cd /Users/jamesalexander/wealth_widget
npm run build
```

This creates `dist/widget.js` - a single concatenated file with all modules combined.

### 2. Copy to Scriptable

**Option A: Manual Copy**
1. Open `dist/widget.js` in a text editor
2. Copy **entire contents**
3. Open Scriptable app
4. Create new script named "Wealth Widget"
5. Paste contents
6. Save

**Option B: Command Line** (if you have Scriptable CLI)
```bash
# Copy to Scriptable's iCloud directory
cp dist/widget.js ~/Library/Mobile\ Documents/iCloud~dk~simonbs~Scriptable/Documents/"Wealth Widget.js"
```

### 3. Add Widget to Home Screen

1. Long-press on home screen
2. Tap "+" to add widget
3. Search for "Scriptable"
4. Choose "Large" widget size
5. Long-press the widget → "Edit Widget"
6. Select "Wealth Widget" script
7. Done!

## Troubleshooting

### Error: "Can't find variable [function name]"

**Cause:** You're trying to run a source file from `src/` directly.

**Solution:**
1. Run `npm run build` to create the built file
2. Copy `dist/widget.js` (NOT `src/widget.js`) to Scriptable

### Error: "Module not found"

**Cause:** Same as above - running source files instead of built file.

**Solution:** Use `dist/widget.js`

### Widget shows blank screen

**Cause:** No transactions data or build issue.

**Solution:**
1. Verify `data/transactions.csv` has data
2. Rebuild: `npm run build`
3. Re-copy `dist/widget.js` to Scriptable

## File Structure Reference

```
❌ DON'T USE THESE:
   src/widget.js           ← Source file (won't work!)
   src/lib/*.js            ← Module files (won't work!)

✅ USE THIS:
   dist/widget.js          ← Built file (ready for Scriptable!)
```

## Quick Check

If you see an error about missing functions/variables:
1. Check which file you copied - it should be `dist/widget.js`
2. Look at the file size - built file should be ~32 KB
3. Check first line - should say "// Wealth Widget - Built [timestamp]"
4. If not, rebuild and re-copy

## Development Workflow

```bash
# Edit source files
vim src/lib/calculations.js

# Build
npm run build

# Copy to Scriptable
cp dist/widget.js [scriptable-location]

# Test in Scriptable
```

**Remember:** Always build before deploying!
