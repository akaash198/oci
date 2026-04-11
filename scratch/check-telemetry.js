import { createAdminClient } from '../lib/supabase/admin';

async function checkTelemetry() {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from('telemetry')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log(`Telemetry count: ${count}`);
}

checkTelemetry();
