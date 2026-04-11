import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSupabaseConfigErrorResponse } from '@/lib/supabase/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function mapUiStatusToDb(status: string) {
  if (status === 'online') return 'active';
  if (status === 'warning') return 'maintenance';
  if (status === 'offline') return 'inactive';
  return status;
}

function mapDbStatusToUi(status: string | null | undefined) {
  if (status === 'active') return 'online';
  if (status === 'maintenance') return 'warning';
  if (status === 'inactive') return 'offline';
  return status || 'unknown';
}

// GET - Fetch assets
export async function GET(request: NextRequest) {
  try {
    const configError = getSupabaseConfigErrorResponse();
    if (configError) return configError;

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const criticality = searchParams.get('criticality');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = supabase
      .from('assets')
      .select(
        `
        *,
        asset_types:asset_type_id (id, category, name)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', mapUiStatusToDb(status));
    }

    if (type && type !== 'all') {
      const { data: assetTypes, error: assetTypeError } = await supabase
        .from('asset_types')
        .select('id, category, name');

      if (assetTypeError) {
        console.error('Asset type lookup error:', assetTypeError);
        return NextResponse.json({ error: assetTypeError.message }, { status: 500 });
      }

      const match = (assetTypes || []).find((t) =>
        [t.category, t.name].some((value) => String(value || '').toLowerCase() === type.toLowerCase())
      );

      if (match) {
        query = query.eq('asset_type_id', match.id);
      } else {
        return NextResponse.json({
          success: true,
          count: 0,
          total: 0,
          data: [],
        });
      }
    }

    if (criticality && criticality !== 'all') {
      query = query.eq('criticality', criticality);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Assets fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const normalized = (data || []).map((asset) => ({
      ...asset,
      type: asset.asset_types?.category || asset.asset_types?.name || null,
      status: mapDbStatusToUi(asset.status),
    }));

    return NextResponse.json({
      success: true,
      count: normalized.length,
      total: count,
      data: normalized,
    });
  } catch (error) {
    console.error('Assets GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new asset
export async function POST(request: NextRequest) {
  try {
    const configError = getSupabaseConfigErrorResponse();
    if (configError) return configError;

    const supabase = createAdminClient();
    const body = await request.json();

    const {
      name,
      type,
      ip_address,
      mac_address,
      location,
      criticality,
      vendor,
      model,
      firmware_version,
      protocol,
      metadata,
    } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type' },
        { status: 400 }
      );
    }

    const { data: assetTypes, error: assetTypeError } = await supabase
      .from('asset_types')
      .select('id, category, name');

    if (assetTypeError) {
      console.error('Asset type lookup error:', assetTypeError);
      return NextResponse.json({ error: assetTypeError.message }, { status: 500 });
    }

    const selectedAssetType = (assetTypes || []).find((t) =>
      [t.category, t.name].some((value) => String(value || '').toLowerCase() === type.toLowerCase())
    );

    if (!selectedAssetType) {
      return NextResponse.json(
        { error: `Unknown asset type: ${type}` },
        { status: 400 }
      );
    }

    const { data: orgRow } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .maybeSingle();

    const { data, error } = await supabase
      .from('assets')
      .insert({
        organization_id: orgRow?.id || undefined,
        asset_type_id: selectedAssetType.id,
        name,
        ip_address,
        mac_address,
        location,
        criticality: criticality || 'medium',
        vendor,
        model,
        firmware_version,
        status: 'active',
        properties: {
          protocol: protocol || null,
          ...(metadata || {}),
        },
      })
      .select(`
        *,
        asset_types:asset_type_id (id, category, name)
      `)
      .single();

    if (error) {
      console.error('Asset create error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        type: data?.asset_types?.category || data?.asset_types?.name || null,
        status: mapDbStatusToUi(data?.status),
      },
    });
  } catch (error) {
    console.error('Assets POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update asset
export async function PATCH(request: NextRequest) {
  try {
    const configError = getSupabaseConfigErrorResponse();
    if (configError) return configError;

    const supabase = createAdminClient();
    const body = await request.json();

    const { id, type, status, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    if (type) {
      const { data: assetTypes } = await supabase
        .from('asset_types')
        .select('id, category, name');

      const selectedAssetType = (assetTypes || []).find((t) =>
        [t.category, t.name].some((value) => String(value || '').toLowerCase() === String(type).toLowerCase())
      );

      if (selectedAssetType) {
        updateData.asset_type_id = selectedAssetType.id;
      }
    }

    if (status) {
      updateData.status = mapUiStatusToDb(String(status));
    }

    const { data, error } = await supabase
      .from('assets')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        asset_types:asset_type_id (id, category, name)
      `)
      .single();

    if (error) {
      console.error('Asset update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        type: data?.asset_types?.category || data?.asset_types?.name || null,
        status: mapDbStatusToUi(data?.status),
      },
    });
  } catch (error) {
    console.error('Assets PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete asset
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
      .from('assets')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Asset delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Assets DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

