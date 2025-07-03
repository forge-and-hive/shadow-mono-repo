# Bundle Tasks

This directory contains tasks related to JavaScript/TypeScript bundle creation and loading.

## Available Tasks

### `bundle:create`

Creates a bundled JavaScript file using esbuild.

**Parameters:**
- `entryPoint` (string): Path to the entry point file (e.g., `src/index.ts`)
- `outputFile` (string): Path where the bundled file should be saved (e.g., `dist/bundle.js`)

**Returns:**
- `{ outputFile: string }`: Object containing the path to the created bundle

**Example Usage:**
```bash
forge task:run bundle:create --entryPoint=src/index.ts --outputFile=dist/bundle.js
```

**Implementation Details:**
- Uses esbuild for fast bundling
- Includes minification
- Generates sourcemaps
- Sets platform to 'node'

### `bundle:load`

Dynamically loads a JavaScript bundle and returns its default export.

**Parameters:**
- `bundlePath` (string): Path to the bundled JavaScript file to load

**Returns:**
- The default export from the loaded bundle

**Example Usage:**
```bash
forge task:run bundle:load --bundlePath=dist/bundle.js
```

**Implementation Details:**
- Uses dynamic import to load the bundle
- Returns the default export from the bundle

## Common Use Cases

### Creating and Loading a Bundle

```bash
# First, create the bundle
forge task:run bundle:create --entryPoint=src/index.ts --outputFile=dist/bundle.js

# Then, load the bundle
forge task:run bundle:load --bundlePath=dist/bundle.js
```

### Using in Scripts

These tasks can also be used programmatically:

```typescript
import { create as createBundle } from './tasks/bundle/create'
import { load as loadBundle } from './tasks/bundle/load'

async function buildAndLoad() {
  // Create bundle
  await createBundle({
    entryPoint: 'src/index.ts',
    outputFile: 'dist/bundle.js'
  })

  // Load bundle
  const bundleExport = await loadBundle({
    bundlePath: 'dist/bundle.js'
  })

  // Use the loaded bundle
  return bundleExport
}
```