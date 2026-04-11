
import { createAdminClient } from '../lib/supabase/admin';

async function seed() {
  const supabase = createAdminClient();

  console.log('Seeding 24 hours of telemetry database...');

  const { data: assets } = await supabase.from('assets').select('id, name').limit(10);
  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);

  if (!assets || assets.length === 0 || !orgs || orgs.length === 0) {
    console.error('No assets or organizations found.');
    return;
  }

  const orgId = orgs[0].id;

  for (const asset of assets) {
    console.log(`Seeding 24h of data for: ${asset.name}`);
    const telemetry = [];
    // Last 24 hours, 1 point per 10 minutes (to avoid overpopulating)
    for (let i = 0; i < 24 * 6; i++) {
        const timestamp = new Date(Date.now() - i * 10 * 60000).toISOString();
        telemetry.push({
            organization_id: orgId,
            asset_id: asset.id,
            metric_name: 'voltage',
            metric_value: 230 + (Math.random() * 20 - 10),
            unit: 'V',
            quality: 'good',
            timestamp: timestamp
        });
        telemetry.push({
            organization_id: orgId,
            asset_id: asset.id,
            metric_name: 'anomaly_score',
            metric_value: Math.random() * 0.2,
            unit: '',
            quality: 'good',
            timestamp: timestamp
        });
    }
    
    await supabase.from('telemetry').insert(telemetry);
  }

  console.log('Seeding completed.');
}

seed().catch(console.error);
