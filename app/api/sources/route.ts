import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSupabaseConfigErrorResponse } from '@/lib/supabase/config';
import {
  getDataSourceManager,
  createDataSource,
  DataSourceConfig,
  PRESET_CONFIGS,
  getSupportedProtocols,
} from '@/lib/data-sources';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizeSourceType(type: string) {
  if (type === 'modbus') return 'modbus_tcp';
  if (type === 'modbus_tcp') return 'modbus_tcp';
  if (type === 'modbus_rtu') return 'modbus_rtu';
  if (type === 'mqtt') return 'mqtt';
  if (type === 'opcua') return 'opcua';
  if (type === 'dnp3') return 'dnp3';
  if (type === 'simulator') return 'simulator';
  return type;
}

function mapDbStatusToUi(status: string | null | undefined) {
  if (status === 'active') return 'connected';
  if (status === 'inactive') return 'disconnected';
  return status || 'inactive';
}

// GET - List data sources or get supported protocols
export async function GET(request: NextRequest) {
  try {
    const configError = getSupabaseConfigErrorResponse();
    if (configError) return configError;

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    
    const action = searchParams.get('action');

    // Return supported protocols
    if (action === 'protocols') {
      return NextResponse.json({
        success: true,
        protocols: getSupportedProtocols(),
      });
    }

    // Return preset configurations
    if (action === 'presets') {
      return NextResponse.json({
        success: true,
        presets: Object.entries(PRESET_CONFIGS).map(([key, value]) => ({
          id: key,
          ...value,
        })),
      });
    }

    // Get active sources from manager
    const manager = getDataSourceManager();
    const activeStatus = manager.getAllStatus();

    // Get configured sources from database
    const { data: dbSources, error } = await supabase
      .from('data_sources')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Data sources fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Merge database configs with runtime status
    const sources = (dbSources || []).map(source => {
      const status = activeStatus.find(s => s.id === source.id);
      return {
        ...source,
        type: source.type,
        status: mapDbStatusToUi(source.status),
        connection_params: source.config || {},
        runtime_status: status || null,
      };
    });

    return NextResponse.json({
      success: true,
      count: sources.length,
      data: sources,
    });
  } catch (error) {
    console.error('Data sources GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create and optionally connect a data source
export async function POST(request: NextRequest) {
  try {
    const configError = getSupabaseConfigErrorResponse();
    if (configError) return configError;

    const supabase = createAdminClient();
    const body = await request.json();

    const { name, type, connection_params, tags, polling_interval_ms, auto_connect = false } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: name and type' },
        { status: 400 }
      );
    }

    const normalizedType = normalizeSourceType(type);

    const { data: orgRow } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .maybeSingle();

    // Save to database
    const { data: dbSource, error } = await supabase
      .from('data_sources')
      .insert({
        organization_id: orgRow?.id || undefined,
        name,
        type: normalizedType,
        config: {
          ...(connection_params || {}),
          tags: tags || [],
          polling_interval_ms: polling_interval_ms || 1000,
        },
        status: auto_connect ? 'connecting' : 'inactive',
      })
      .select()
      .single();

    if (error) {
      console.error('Data source create error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create and connect if auto_connect is true
    if (auto_connect) {
      try {
        const config: DataSourceConfig = {
          id: dbSource.id,
          name: dbSource.name,
          type: dbSource.type,
          enabled: true,
          connectionParams: dbSource.config || {},
          pollingIntervalMs: dbSource.config?.polling_interval_ms || 1000,
          tags: dbSource.config?.tags || [],
        };

        const source = createDataSource(config);
        const manager = getDataSourceManager();
        await manager.addSource(source);

        // Update status in database
        await supabase
          .from('data_sources')
          .update({ status: 'active', last_connected_at: new Date().toISOString() })
          .eq('id', dbSource.id);
      } catch (connectError) {
        console.error('Failed to connect source:', connectError);
        await supabase
          .from('data_sources')
          .update({ status: 'error', error_message: (connectError as Error).message })
          .eq('id', dbSource.id);
      }
    }

    return NextResponse.json({
      success: true,
      data: dbSource,
    });
  } catch (error) {
    console.error('Data sources POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update or control a data source
export async function PATCH(request: NextRequest) {
  try {
    const configError = getSupabaseConfigErrorResponse();
    if (configError) return configError;

    const supabase = createAdminClient();
    const body = await request.json();

    const { id, action, ...updateFields } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    const manager = getDataSourceManager();

    // Handle control actions
    if (action === 'connect') {
      const { data: dbSource } = await supabase
        .from('data_sources')
        .select('*')
        .eq('id', id)
        .single();

      if (!dbSource) {
        return NextResponse.json({ error: 'Source not found' }, { status: 404 });
      }

      const config: DataSourceConfig = {
        id: dbSource.id,
        name: dbSource.name,
        type: dbSource.type,
        enabled: true,
        connectionParams: dbSource.config || {},
        pollingIntervalMs: dbSource.config?.polling_interval_ms || 1000,
        tags: dbSource.config?.tags || [],
      };

      const source = createDataSource(config);
      await manager.addSource(source);

      await supabase
        .from('data_sources')
        .update({ status: 'active', last_connected_at: new Date().toISOString() })
        .eq('id', id);

      return NextResponse.json({ success: true, message: 'Source connected' });
    }

    if (action === 'disconnect') {
      await manager.removeSource(id);

      await supabase
        .from('data_sources')
        .update({ status: 'inactive' })
        .eq('id', id);

      return NextResponse.json({ success: true, message: 'Source disconnected' });
    }

    if (updateFields.connection_params) {
      updateFields.config = updateFields.connection_params;
      delete updateFields.connection_params;
    }

    if (updateFields.type) {
      updateFields.type = normalizeSourceType(String(updateFields.type));
    }

    // Regular update
    const { data, error } = await supabase
      .from('data_sources')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Data source update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Data sources PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a data source
export async function DELETE(request: NextRequest) {
  try {
    const configError = getSupabaseConfigErrorResponse();
    if (configError) return configError;

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    // Disconnect if active
    const manager = getDataSourceManager();
    await manager.removeSource(id);

    // Delete from database
    const { error } = await supabase
      .from('data_sources')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Data source delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Data source deleted',
    });
  } catch (error) {
    console.error('Data sources DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

