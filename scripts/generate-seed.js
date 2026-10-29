import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataPath = path.resolve(__dirname, '../src/members/data.ts');
const outputPath = path.resolve(__dirname, '../supabase/seed.sql');

const content = fs.readFileSync(dataPath, 'utf-8');

// Extract the members array
const match = content.match(/export const members: readonly Member\[\] = (\[[\s\S]*?\n\]);?/);
if (!match) {
  console.error('Could not find members array in data.ts');
  process.exit(1);
}

const members = JSON.parse(match[1]);

function escapeSql(str) {
  if (str === undefined || str === null) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

let sql = `-- ==============================================================================
-- CSR-RIT SUPABASE INITIAL SEED DATA
-- 115+ Members from src/members/data.ts
-- Run this in your Supabase SQL Editor after running schema.sql
-- ==============================================================================

INSERT INTO csr_members (id, name, division_id, division, year, department, role)
VALUES
`;

const rows = members.map(m => {
  return `  (${escapeSql(m.id)}, ${escapeSql(m.name)}, ${escapeSql(m.divisionId)}, ${escapeSql(m.division)}, ${escapeSql(m.year)}, ${escapeSql(m.department)}, ${escapeSql(m.role)})`;
});

sql += rows.join(',\n') + '\n';
sql += `ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  division_id = EXCLUDED.division_id,
  division = EXCLUDED.division,
  year = EXCLUDED.year,
  department = EXCLUDED.department,
  role = EXCLUDED.role,
  updated_at = NOW();
`;

fs.writeFileSync(outputPath, sql, 'utf-8');
console.log(`Successfully generated ${members.length} members seed at ${outputPath}`);
