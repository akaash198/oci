import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSupabaseConfigErrorResponse } from '@/lib/supabase/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET - Fetch playbooks
export async function GET(request: NextRequest) {
  try {
    const configError = getSupabaseConfigErrorResponse();
    if (configError) return configError;

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const threatType = searchParams.get('threat_type');

    let query = supabase
      .from('playbooks')
      .select('*')
      .order('name', { ascending: true });

    if (status && status !== 'all') {
      query = query.eq('enabled', status === 'active');
    }

    if (threatType && threatType !== 'all') {
      query = query.contains('trigger_conditions', { threat_type: threatType });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Playbooks fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const normalized = (data || []).map((playbook) => ({
      ...playbook,
      status: playbook.enabled ? 'active' : 'inactive',
      auto_execute: Boolean(playbook.enabled),
      run_count: Number(playbook.execution_count || 0),
    }));

    return NextResponse.json({
      success: true,
      count: normalized.length,
      data: normalized,
    });
  } catch (error) {
    console.error('Playbooks GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new playbook
export async function POST(request: NextRequest) {
  try {
    const configError = getSupabaseConfigErrorResponse();
    if (configError) return configError;

    const supabase = createAdminClient();
    const body = await request.json();

    const {
      name,
      description,
      trigger_conditions,
      steps,
      auto_execute,
    } = body;

    if (!name || !steps) {
      return NextResponse.json(
        { error: 'Missing required fields: name, steps' },
        { status: 400 }
      );
    }

    const { data: orgRow } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .maybeSingle();

    const { data, error } = await supabase
      .from('playbooks')
      .insert({
        organization_id: orgRow?.id || undefined,
        name,
        description,
        trigger_type: 'manual',
        trigger_conditions: trigger_conditions || {},
        steps,
        enabled: auto_execute !== undefined ? Boolean(auto_execute) : true,
      })
      .select()
      .single();

    if (error) {
      console.error('Playbook create error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Playbooks POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update playbook
export async function PATCH(request: NextRequest) {
  try {
    const configError = getSupabaseConfigErrorResponse();
    if (configError) return configError;

    const supabase = createAdminClient();
    const body = await request.json();

    const { id, status, auto_execute, run_count, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    if (status !== undefined) {
      updateData.enabled = status === 'active';
    }
    if (auto_execute !== undefined) {
      updateData.enabled = Boolean(auto_execute);
    }
    if (run_count !== undefined) {
      updateData.execution_count = Number(run_count);
    }

    const { data, error } = await supabase
      .from('playbooks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Playbook update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Playbooks PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete playbook
export async function DELETE(request: NextRequest) {
  try {
    const configError = getSupabaseConfigErrorResponse();
    if (configError) return configError;

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('playbooks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Playbook delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Playbooks DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

