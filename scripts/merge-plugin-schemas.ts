#!/usr/bin/env tsx
/**
 * Merge Plugin Prisma Schemas
 *
 * Reads the base Prisma schema and appends model definitions from enabled
 * plugins that declare a `prismaModels` path in their manifest. The merged
 * result is written to schema.generated.prisma which should be used for
 * `prisma generate` and `prisma db push`.
 *
 * Usage:  tsx scripts/merge-plugin-schemas.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const BASE_SCHEMA = path.join(ROOT, 'packages/db-prisma/prisma/schema.prisma');
const OUTPUT_SCHEMA = path.join(ROOT, 'packages/db-prisma/prisma/schema.generated.prisma');

// Dynamically discover plugin packages that have prisma models
function findPluginSchemas(): { pluginId: string; schemaPath: string }[] {
  const packagesDir = path.join(ROOT, 'packages');
  const results: { pluginId: string; schemaPath: string }[] = [];

  const dirs = fs.readdirSync(packagesDir, { withFileTypes: true });
  for (const dir of dirs) {
    if (!dir.isDirectory() || !dir.name.startsWith('plugin-')) continue;

    const pluginPrismaDir = path.join(packagesDir, dir.name, 'prisma');
    const pluginSchemaFile = path.join(pluginPrismaDir, 'plugin.prisma');

    if (fs.existsSync(pluginSchemaFile)) {
      results.push({
        pluginId: dir.name,
        schemaPath: pluginSchemaFile,
      });
    }
  }

  return results;
}

function main() {
  // Read base schema
  if (!fs.existsSync(BASE_SCHEMA)) {
    console.error(`Base schema not found: ${BASE_SCHEMA}`);
    process.exit(1);
  }

  let merged = fs.readFileSync(BASE_SCHEMA, 'utf-8');

  // Find and append plugin schemas
  const pluginSchemas = findPluginSchemas();

  if (pluginSchemas.length === 0) {
    console.log('No plugin schemas found. Copying base schema as-is.');
  } else {
    for (const { pluginId, schemaPath } of pluginSchemas) {
      console.log(`Merging schema from: ${pluginId}`);
      const pluginSchema = fs.readFileSync(schemaPath, 'utf-8');

      // Strip any generator/datasource blocks from plugin schemas (they use the base one)
      const stripped = pluginSchema
        .replace(/generator\s+\w+\s*\{[^}]*\}/g, '')
        .replace(/datasource\s+\w+\s*\{[^}]*\}/g, '')
        .trim();

      merged += `\n\n// ── Plugin: ${pluginId} ──\n\n${stripped}`;
    }
  }

  fs.writeFileSync(OUTPUT_SCHEMA, merged, 'utf-8');
  console.log(`Merged schema written to: ${OUTPUT_SCHEMA}`);
  console.log(`Plugins merged: ${pluginSchemas.length}`);
}

main();
