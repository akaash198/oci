import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSupabaseConfigErrorResponse } from '@/lib/supabase/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET - Fetch incidents
export async function GET(request: NextRequest) {
  try {
    const configError = getSupabaseConfigErrorResponse();
    if (configError) return configError;

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = supabase
      .from('incidents')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (severity && severity !== 'all') {
      query = query.eq('severity', severity);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Incidents fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      total: count,
      data: data || [],
    });
  } catch (error) {
    console.error('Incidents GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new incident
export async function POST(request: NextRequest) {
  try {
    const configError = getSupabaseConfigErrorResponse();
    if (configError) return configError;

    const supabase = createAdminClient();
    const body = await request.json();

    const {
      title,
      description,
      severity,
      alert_ids,
      assigned_to,
    } = body;

    if (!title || !severity) {
      return NextResponse.json(
        { error: 'Missing required fields: title, severity' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('incidents')
      .insert({
        title,
        description,
        severity,
        alert_ids: alert_ids || [],
        assigned_to,
        status: 'open',
      })
      .select()
      .single();

    if (error) {
      console.error('Incident create error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Incidents POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update incident
export async function PATCH(request: NextRequest) {
  try {
    const configError = getSupabaseConfigErrorResponse();
    if (configError) return configError;

    const supabase = createAdminClient();
    const body = await request.json();

    const { id, status, assigned_to, resolution_notes, timeline_event } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    // Fetch current incident to update timeline
    const { data: current } = await supabase
      .from('incidents')
      .select('timeline')
      .eq('id', id)
      .single();

    const updateData: Record<string, unknown> = {};
    
    if (status) {
      updateData.status = status;
      if (status === 'closed') {
        updateData.closed_at = new Date().toISOString();
      }
    }
    
    if (assigned_to !== undefined) {
      updateData.assigned_to = assigned_to;
    }
    
    if (resolution_notes) {
      updateData.resolution_notes = resolution_notes;
    }

    // Add timeline event if provided
    if (timeline_event) {
      const currentTimeline = current?.timeline || [];
      updateData.timeline = [
        ...currentTimeline,
        {
          timestamp: new Date().toISOString(),
          ...timeline_event,
        },
      ];
    }

    const { data, error } = await supabase
      .from('incidents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Incident update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Incidents PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

