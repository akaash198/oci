import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSupabaseConfigErrorResponse } from '@/lib/supabase/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET - Fetch dashboard statistics
export async function GET() {
  try {
    const configError = getSupabaseConfigErrorResponse();
    if (configError) return configError;

    const supabase = createAdminClient();

    // Fetch all stats in parallel
    const [
      assetsResult,
      alertsResult,
      activeAlertsResult,
      incidentsResult,
      modelsResult,
      telemetryCountResult,
    ] = await Promise.all([
      // Total assets
      supabase.from('assets').select('id', { count: 'exact', head: true }),
      
      // Total alerts (threats blocked = resolved alerts)
      supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('status', 'resolved'),
      
      // Active alerts (non-resolved)
      supabase.from('alerts').select('id', { count: 'exact', head: true }).neq('status', 'resolved'),
      
      // Open incidents
      supabase.from('incidents').select('id', { count: 'exact', head: true }).neq('status', 'closed'),
      
      // ML models with accuracy
      supabase.from('ml_models').select('accuracy').eq('status', 'active'),
      
      // Telemetry data points (last 24 hours)
      supabase
        .from('telemetry')
        .select('id', { count: 'exact', head: true })
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    ]);

    // Calculate average model accuracy
    const modelAccuracy = modelsResult.data?.length
      ? modelsResult.data.reduce((sum, m) => sum + (m.accuracy || 0), 0) / modelsResult.data.length * 100
      : 96.7; // Default fallback

    // Alert severity breakdown
    const [criticalAlerts, highAlerts, mediumAlerts, lowAlerts] = await Promise.all([
      supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('severity', 'critical').neq('status', 'resolved'),
      supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('severity', 'high').neq('status', 'resolved'),
      supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('severity', 'medium').neq('status', 'resolved'),
      supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('severity', 'low').neq('status', 'resolved'),
    ]);

    // Asset status breakdown
    const [onlineAssets, offlineAssets, warningAssets] = await Promise.all([
      supabase.from('assets').select('id', { count: 'exact', head: true }).eq('status', 'online'),
      supabase.from('assets').select('id', { count: 'exact', head: true }).eq('status', 'offline'),
      supabase.from('assets').select('id', { count: 'exact', head: true }).eq('status', 'warning'),
    ]);

    const totalAssets = assetsResult.count || 0;
    const onlineCount = onlineAssets.count || 0;
    const uptime = totalAssets > 0 ? (onlineCount / totalAssets) * 100 : 99.97;

    return NextResponse.json({
      success: true,
      data: {
        totalAssets: totalAssets,
        activeAlerts: activeAlertsResult.count || 0,
        threatsBlocked: alertsResult.count || 0,
        modelAccuracy: Math.round(modelAccuracy * 100) / 100,
        dataPointsProcessed: telemetryCountResult.count || 0,
        uptime: Math.round(uptime * 100) / 100,
        openIncidents: incidentsResult.count || 0,
        alertsBySeverity: {
          critical: criticalAlerts.count || 0,
          high: highAlerts.count || 0,
          medium: mediumAlerts.count || 0,
          low: lowAlerts.count || 0,
        },
        assetsByStatus: {
          online: onlineAssets.count || 0,
          offline: offlineAssets.count || 0,
          warning: warningAssets.count || 0,
        },
      },
    });
  } catch (error) {
    console.error('Stats GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

