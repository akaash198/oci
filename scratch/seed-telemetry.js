
import { createAdminClient } from '../lib/supabase/admin.js';
import fs from 'fs';
import path from 'path';

async function seed() {
  const supabase = createAdminClient();
  const seedFile = path.join(process.cwd(), 'scripts', 'seed-data.sql');
  const sql = fs.readFileSync(seedFile, 'utf8');

  console.log('Seeding database from scripts/seed-data.sql...');

  // Supabase JS doesn't support raw SQL easily. 
  // But we can parse the telemetry INSERT statements and run them.
  // Or we can just insert some data points manually.

  const { data: assets } = await supabase.from('assets').select('id, name').limit(5);
  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);

  if (!assets || assets.length === 0 || !orgs || orgs.length === 0) {
    console.error('No assets or organizations found. Please run the SQL migration manually first.');
    return;
  }

  const orgId = orgs[0].id;

  for (const asset of assets) {
    console.log(`Seeding telemetry for asset: ${asset.name}`);
    const telemetry = [];
    for (let i = 0; i < 60; i++) {
        const timestamp = new Date(Date.now() - i * 60000).toISOString();
        telemetry.push({
            organization_id: orgId,
            asset_id: asset.id,
            metric_name: 'voltage',
            metric_value: 120 + Math.random() * 5,
            unit: 'V',
            timestamp: timestamp
        });
        telemetry.push({
            organization_id: orgId,
            asset_id: asset.id,
            metric_name: 'current',
            metric_value: 45 + Math.random() * 2,
            unit: 'A',
            timestamp: timestamp
        });
    }
    const { error } = await supabase.from('telemetry').insert(telemetry);
    if (error) console.error(`Error seeding ${asset.name}:`, error);
  }

  console.log('Seeding completed.');
}

seed();
