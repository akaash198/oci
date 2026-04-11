import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSupabaseConfigErrorResponse } from '@/lib/supabase/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST - Ingest telemetry data
export async function POST(request: NextRequest) {
  try {
    const configError = getSupabaseConfigErrorResponse();
    if (configError) return configError;

    const supabase = createAdminClient();
    const body = await request.json();

    const { asset_id, organization_id, data_points } = body;

    // Insert telemetry data points
    const telemetryRecords = data_points.map((dp: { metric_name: string; metric_value: number | string | boolean; quality?: string; timestamp?: string }) => ({
      asset_id,
      organization_id,
      metric_name: dp.metric_name,
      metric_value: typeof dp.metric_value === 'number' ? dp.metric_value : 0,
      quality: dp.quality || 'good',
      timestamp: dp.timestamp || new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('telemetry')
      .insert(telemetryRecords)
      .select();

    if (error) {
      console.error('Telemetry insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      inserted: data?.length || 0,
      message: `Ingested ${data?.length || 0} telemetry points`,
    });
  } catch (error) {
    console.error('Telemetry API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Retrieve telemetry data
export async function GET(request: NextRequest) {
  try {
    const configError = getSupabaseConfigErrorResponse();
    if (configError) return configError;

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);

    const assetId = searchParams.get('asset_id');
    const sourceId = searchParams.get('source_id');
    const metricName = searchParams.get('metric_name');
    const startTime = searchParams.get('start_time');
    const endTime = searchParams.get('end_time');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    let query = supabase
      .from('telemetry')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (assetId) {
      query = query.eq('asset_id', assetId);
    }

    if (sourceId) {
      query = query.eq('data_source_id', sourceId);
    }

    if (metricName) {
      query = query.eq('metric_name', metricName);
    }

    if (startTime) {
      query = query.gte('timestamp', startTime);
    }

    if (endTime) {
      query = query.lte('timestamp', endTime);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Telemetry fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      data: data || [],
    });
  } catch (error) {
    console.error('Telemetry GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

