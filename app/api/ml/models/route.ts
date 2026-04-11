import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSupabaseConfigErrorResponse } from '@/lib/supabase/config';
import { getTrainingDatasetsForModel } from '@/lib/ml/dataset-catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET - Fetch ML models
export async function GET(request: NextRequest) {
  try {
    const configError = getSupabaseConfigErrorResponse();
    if (configError) return configError;

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const type = searchParams.get('type');

    let query = supabase
      .from('ml_models')
      .select('*')
      .order('name', { ascending: true });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('ML models fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Add deterministic runtime stats derived from persisted model records.
    const modelsWithStats = (data || []).map((model) => ({
      ...model,
      runtime_stats: {
        inferences_today: Number(model.inferences_today ?? 0),
        avg_latency_ms: Number(model.avg_latency_ms ?? 0),
        last_inference: model.last_inference || model.updated_at || model.created_at || null,
        alerts_generated: Number(model.alerts_generated ?? 0),
      },
      training_datasets: getTrainingDatasetsForModel(model.type, model.name),
    }));

    return NextResponse.json({
      success: true,
      count: modelsWithStats.length,
      data: modelsWithStats,
    });
  } catch (error) {
    console.error('ML models GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new ML model
export async function POST(request: NextRequest) {
  try {
    const configError = getSupabaseConfigErrorResponse();
    if (configError) return configError;

    const supabase = createAdminClient();
    const body = await request.json();

    const {
      name,
      type,
      version,
      description,
      config,
    } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('ml_models')
      .insert({
        name,
        type,
        version: version || '1.0.0',
        description,
        config,
        status: 'training',
        accuracy: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('ML model create error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('ML models POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update ML model
export async function PATCH(request: NextRequest) {
  try {
    const configError = getSupabaseConfigErrorResponse();
    if (configError) return configError;

    const supabase = createAdminClient();
    const body = await request.json();

    const { id, status, config, accuracy } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (config) updateData.config = config;
    if (accuracy !== undefined) updateData.accuracy = accuracy;

    const { data, error } = await supabase
      .from('ml_models')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('ML model update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('ML models PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

