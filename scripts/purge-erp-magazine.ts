import fs from 'node:fs';
import { pool } from '../server/db/client.ts';
import { minioClient, MINIO_BUCKET } from '../server/utils/minio.ts';

// Explicit retirement operation. Never run from db:setup, app startup, or db:push.
const apply = process.argv.includes('--apply');
if (MINIO_BUCKET === 'acme-magazine') {
  throw new Error('Refusing to purge the standalone Magazine bucket; configure the ERP bucket');
}
const expectedTables = new Set(['magazine_editors', 'magazine_issues', 'magazine_sections', 'magazine_media', 'magazine_issue_media']);
const client = await pool.connect();
try {
  const target = await client.query('SELECT current_database() AS database');
  const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'magazine'");
  if (tables.rows.some(row => !expectedTables.has(row.tablename))) {
    throw new Error('Unexpected tables in ERP magazine schema; refusing to purge a service-owned database');
  }
  const outsideReferences = await client.query(`SELECT c.conname FROM pg_constraint c
    JOIN pg_class target ON target.oid = c.confrelid JOIN pg_namespace tn ON tn.oid = target.relnamespace
    JOIN pg_class source ON source.oid = c.conrelid JOIN pg_namespace sn ON sn.oid = source.relnamespace
    WHERE tn.nspname = 'magazine' AND sn.nspname <> 'magazine'`);
  if (outsideReferences.rowCount) throw new Error('Non-Magazine tables reference Magazine; refusing purge');
  const objects: string[] = [];
  if (await minioClient.bucketExists(MINIO_BUCKET)) {
    for await (const object of minioClient.listObjectsV2(MINIO_BUCKET, 'magazine/', true)) {
      if (object.name) {
        if (!object.name.startsWith('magazine/') || object.name.includes('..')) throw new Error('Unexpected object key');
        objects.push(object.name);
      }
    }
  }
  const counts: Record<string, number> = {};
  for (const { tablename } of tables.rows) {
    counts[tablename] = Number((await client.query(`SELECT count(*) AS count FROM magazine."${tablename}"`)).rows[0].count);
  }
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'preview', database: target.rows[0].database, counts, magazineObjects: objects.length }, null, 2));
  if (apply) {
    fs.mkdirSync('scratch', { recursive: true });
    fs.writeFileSync('scratch/erp-magazine-purge-manifest.json', JSON.stringify({ database: target.rows[0].database, counts, objects, at: new Date().toISOString() }, null, 2));
    // Delete only this prefix; never remove the shared bucket or its other objects.
    for (const object of objects) await minioClient.removeObject(MINIO_BUCKET, object);
    await client.query('BEGIN');
    try {
      await client.query(`DROP TABLE IF EXISTS magazine.magazine_issue_media, magazine.magazine_sections,
        magazine.magazine_media, magazine.magazine_issues, magazine.magazine_editors`);
      await client.query('DROP TYPE IF EXISTS magazine.magazine_status');
      await client.query('DROP SCHEMA IF EXISTS magazine');
      const sequences = await client.query("SELECT to_regclass('inventory.document_sequences') AS name");
      if (sequences.rows[0].name) await client.query("DELETE FROM inventory.document_sequences WHERE code = 'MAG'");
      const settings = await client.query("SELECT to_regclass('public.hospital_settings') AS name");
      if (settings.rows[0].name) {
        await client.query(`UPDATE public.hospital_settings SET logo_url = NULL
          WHERE logo_url LIKE '%/public/magazine/images/magazine/%'`);
        await client.query('ALTER TABLE public.hospital_settings DROP COLUMN IF EXISTS editorial_division, DROP COLUMN IF EXISTS copyright_text');
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    console.log('ERP Magazine content, objects, tables, MAG counters and editorial-only settings purged.');
  } else {
    console.log('Preview only. Run pnpm magazine:purge --apply to purge these Magazine-owned resources.');
  }
} finally {
  client.release();
  await pool.end();
}
