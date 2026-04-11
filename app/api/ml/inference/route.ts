import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSupabaseConfigErrorResponse } from '@/lib/supabase/config';
import { MLEngine } from '@/lib/ml/engine';
import type { ThreatType } from '@/lib/types/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Initialize ML Engine
let mlEngine: MLEngine | null = null;

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return defaultValue;
}

function parseNumber(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultValue;
}

async function getMLEngine(): Promise<MLEngine> {
  if (!mlEngine) {
    mlEngine = new MLEngine({
      enablePINN: parseBoolean(process.env.ML_PINN_FDI_ENABLED, true),
      enableRansomware: parseBoolean(process.env.ML_CGAN_RANSOMWARE_ENABLED, true),
      enableDER: parseBoolean(process.env.ML_TINYML_DER_ENABLED, true),
      enablePhysical: parseBoolean(process.env.ML_YOLO_PHYSICAL_ENABLED, true),
      enableFirmware: parseBoolean(process.env.ML_GRAPH_MAMBA_ENABLED, true),
      enableDDoS: parseBoolean(process.env.ML_DRL_DDOS_ENABLED, true),
      enableInsider: parseBoolean(process.env.ML_BEHAVIORAL_DNA_ENABLED, true),
      enableModelDefense: parseBoolean(process.env.ML_MODEL_DEFENSE_ENABLED, true),
      alertThreshold: parseNumber(process.env.ML_ALERT_THRESHOLD, 0.7),
    });
    await mlEngine.initialize();
  }
  return mlEngine;
}

function getMLConfig() {
  return {
    alertThreshold: parseNumber(process.env.ML_ALERT_THRESHOLD, 0.7),
    criticalThreshold: parseNumber(process.env.ML_CRITICAL_THRESHOLD, 0.9),
    mlEngineUrl: (process.env.ML_ENGINE_URL || '').trim() || null,
  };
}

function decodeBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const buf = Buffer.from(base64, 'base64');
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

async function inferViaExternalEngine(modelType: string, payload: unknown) {
  const { mlEngineUrl } = getMLConfig();
  if (!mlEngineUrl) return null;

  const url = new URL(`/infer/${modelType}`, mlEngineUrl).toString();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`ML engine error (${res.status}): ${text || res.statusText}`);
  }

  return res.json();
}

// POST - Run inference on telemetry data
export async function POST(request: NextRequest) {
  try {
    const configError = getSupabaseConfigErrorResponse();
    if (configError) return configError;

    const supabase = createAdminClient();
    const body = await request.json();

    const { model_type, data, asset_id } = body;

    if (!model_type || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: model_type and data' },
        { status: 400 }
      );
    }

    const engine = await getMLEngine();
    const { alertThreshold, criticalThreshold } = getMLConfig();
    const startTime = Date.now();

    let result: any;
    let threatType: ThreatType | null = null;

    // Route to appropriate model
    switch (model_type) {
      case 'pinn_fdi':
        threatType = 'fdi_sensor_spoofing';
        result = await engine.detectFDI({
          measurements: data.measurements,
          topology: data.topology,
          timestamps: data.timestamps || [],
        });
        break;

      case 'cgan_ransomware':
        threatType = 'ransomware';
        result = await engine.detectRansomware(data.systemEvents || data.system_events || data);
        break;

      case 'tinyml_der':
        threatType = 'der_attack';
        // Prefer external engine for the trained example model when configured.
        result =
          (await inferViaExternalEngine('tinyml_der', { data })) ??
          (await engine.detectDERAttack(data.derData || data.der_telemetry || data));
        break;

      case 'yolo_physical':
        threatType = 'physical_sabotage';
        result = await engine.detectPhysicalThreat({
          videoFrame: data.videoFrame || data.video_frame,
          sensorReadings: data.sensorReadings || data.sensor_readings || data.sensor_data || data,
        });
        break;

      case 'graph_mamba_firmware':
        threatType = 'firmware_supply_chain';
        if (!data.binary && !data.binary_base64) {
          return NextResponse.json(
            { error: 'Missing firmware binary: provide data.binary_base64 (base64).' },
            { status: 400 }
          );
        }
        result = await engine.analyzeFirmware({
          binary: data.binary instanceof ArrayBuffer ? data.binary : decodeBase64ToArrayBuffer(data.binary_base64),
          vendor: data.vendor || 'unknown',
          model: data.model || 'unknown',
          expectedVersion: data.expectedVersion || data.expected_version || 'unknown',
          baselineFingerprint: data.baselineFingerprint || data.baseline_fingerprint,
        });
        break;

      case 'drl_ddos':
        threatType = 'ddos';
        result = await engine.mitigateDDoS(data.trafficData || data.traffic_metrics || data);
        break;

      case 'behavioral_dna':
        threatType = 'insider_threat';
        result = await engine.detectInsiderThreat(data.behaviorData || data.session_data || data);
        break;

      case 'model_defense':
        threatType = 'model_poisoning';
        result = await engine.checkModelIntegrity(data.modelData || data);
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
      confidence: Number(result?.confidence ?? 0),
      inference_time_ms: inferenceTimeMs,
    });

    // Create alert if threat detected
    const detected = Boolean(result?.detected ?? result?.isAnomaly ?? result?.isAttack ?? result?.isThreat);
    const confidence = Number(result?.confidence ?? 0);

    if (detected && threatType && confidence >= alertThreshold) {
      const severity =
        confidence >= criticalThreshold ? 'critical' :
        confidence >= 0.8 ? 'high' :
        'medium';
      
      await supabase.from('alerts').insert({
        asset_id,
        threat_type: threatType,
        severity,
        title: `${threatType?.replace(/_/g, ' ').toUpperCase()} Detected`,
        description: `ML model ${model_type} detected potential threat`,
        ml_model_id: model_type,
        ml_confidence: confidence,
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
    // Expose current engine config as a minimal "status" endpoint.
    return NextResponse.json({ success: true, config: engine.getConfig() });
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

