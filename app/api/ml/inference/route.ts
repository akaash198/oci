import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSupabaseConfigErrorResponse } from '@/lib/supabase/config';
import { MLEngine, ThreatType } from '@/lib/ml/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Initialize ML Engine
let mlEngine: MLEngine | null = null;

async function getMLEngine(): Promise<MLEngine> {
  if (!mlEngine) {
    mlEngine = new MLEngine();
    await mlEngine.initialize();
  }
  return mlEngine;
}

// POST - Run inference on telemetry data
export async function POST(request: NextRequest) {
  try {
    const configError = getSupabaseConfigErrorResponse();
    if (configError) return configError;

    const supabase = createAdminClient();
    const body = await request.json();

    const { model_type, data, asset_id, options = {} } = body;

    if (!model_type || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: model_type and data' },
        { status: 400 }
      );
    }

    const engine = await getMLEngine();
    const startTime = Date.now();

    let result;
    let threatType: ThreatType | null = null;

    // Route to appropriate model
    switch (model_type) {
      case 'pinn_fdi':
        threatType = 'fdi_sensor_spoofing';
        result = await engine.detectFDI(data.measurements, data.topology);
        break;

      case 'cgan_ransomware':
        threatType = 'ransomware_staging';
        result = await engine.detectRansomware(data.system_events);
        break;

      case 'tinyml_der':
        threatType = 'der_manipulation';
        result = await engine.detectDERAttack(data.der_telemetry);
        break;

      case 'yolo_physical':
        threatType = 'physical_intrusion';
        result = await engine.detectPhysicalThreat(data.video_frame, data.sensor_data);
        break;

      case 'graph_mamba_firmware':
        threatType = 'firmware_tampering';
        result = await engine.analyzeFirmware(data.binary_path, data.baseline_id);
        break;

      case 'drl_ddos':
        threatType = 'ddos_flood';
        result = await engine.mitigateDDoS(data.traffic_metrics);
        break;

      case 'behavioral_dna':
        threatType = 'insider_threat';
        result = await engine.profileBehavior(data.operator_id, data.session_data);
        break;

      case 'model_defense':
        result = await engine.validateModelUpdate(data.gradients, data.client_ids);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown model type: ${model_type}` },
          { status: 400 }
        );
    }

    const inferenceTimeMs = Date.now() - startTime;

    // Log inference result
    await supabase.from('ml_inferences').insert({
      model_id: model_type,
      asset_id,
      input_hash: hashData(data),
      output: result,
      confidence: result.confidence || result.score || 0,
      inference_time_ms: inferenceTimeMs,
    });

    // Create alert if threat detected
    if (result.isAttack || result.isThreat || (result.score && result.score > 0.7)) {
      const severity = result.score > 0.9 ? 'critical' : result.score > 0.8 ? 'high' : 'medium';
      
      await supabase.from('alerts').insert({
        asset_id,
        threat_type: threatType,
        severity,
        title: `${threatType?.replace(/_/g, ' ').toUpperCase()} Detected`,
        description: result.description || `ML model ${model_type} detected potential threat`,
        ml_model_id: model_type,
        ml_confidence: result.confidence || result.score,
        raw_data: { input: data, output: result },
        status: 'new',
      });
    }

    return NextResponse.json({
      success: true,
      model_type,
      inference_time_ms: inferenceTimeMs,
      result,
    });
  } catch (error) {
    console.error('ML inference error:', error);
    return NextResponse.json(
      { error: 'Inference failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET - Get model status
export async function GET(request: NextRequest) {
  try {
    const engine = await getMLEngine();
    const status = engine.getStatus();

    return NextResponse.json({
      success: true,
      models: status,
    });
  } catch (error) {
    console.error('ML status error:', error);
    return NextResponse.json(
      { error: 'Failed to get model status' },
      { status: 500 }
    );
  }
}

// Simple hash function for logging
function hashData(data: unknown): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

