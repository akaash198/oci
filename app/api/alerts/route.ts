import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSupabaseConfigErrorResponse } from '@/lib/supabase/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET - Fetch alerts
export async function GET(request: NextRequest) {
  try {
    const configError = getSupabaseConfigErrorResponse();
    if (configError) return configError;

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const threatType = searchParams.get('threat_type');
    const assetId = searchParams.get('asset_id');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = supabase
      .from('alerts')
      .select(`
        *,
        assets:asset_id (id, name)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (severity) {
      query = query.eq('severity', severity);
    }

    if (threatType) {
      query = query.eq('threat_type', threatType);
    }

    if (assetId) {
      query = query.eq('asset_id', assetId);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Alerts fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      total: count,
      data: data || [],
    });
  } catch (error) {
    console.error('Alerts GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new alert
export async function POST(request: NextRequest) {
  try {
    const configError = getSupabaseConfigErrorResponse();
    if (configError) return configError;

    const supabase = createAdminClient();
    const body = await request.json();

    const { asset_id, threat_type, severity, title, description, raw_data } = body;

    if (!threat_type || !severity || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: threat_type, severity, title' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('alerts')
      .insert({
        asset_id,
        threat_type,
        severity,
        title,
        description,
        raw_data,
        status: 'new',
      })
      .select()
      .single();

    if (error) {
      console.error('Alert create error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Alerts POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update alert status
export async function PATCH(request: NextRequest) {
  try {
    const configError = getSupabaseConfigErrorResponse();
    if (configError) return configError;

    const supabase = createAdminClient();
    const body = await request.json();

    const { id, status, assigned_to, notes } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (status) {
      updateData.status = status;
      if (status === 'acknowledged') {
        updateData.acknowledged_at = new Date().toISOString();
      } else if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }
    }
    if (assigned_to) updateData.assigned_to = assigned_to;
    if (notes) updateData.notes = notes;

    const { data, error } = await supabase
      .from('alerts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Alert update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Alerts PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

