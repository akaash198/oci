/**
 * Data Source Manager - Central orchestrator for all OT/ICS data connectors
 * Supports: Modbus TCP/RTU, OPC-UA, DNP3, MQTT/Kafka, CSV/API, Simulated Data
 */

import { EventEmitter } from 'events';

export interface DataPoint {
  id: string;
  sourceId: string;
  sourceType: DataSourceType;
  assetId?: string;
  timestamp: Date;
  tagName: string;
  value: number | string | boolean;
  quality: 'good' | 'bad' | 'uncertain';
  unit?: string;
  metadata?: Record<string, unknown>;
}

export type DataSourceType = 
  | 'modbus_tcp'
  | 'modbus_rtu'
  | 'opcua'
  | 'dnp3'
  | 'mqtt'
  | 'kafka'
  | 'csv'
  | 'api'
  | 'simulator';

export interface DataSourceConfig {
  id: string;
  name: string;
  type: DataSourceType;
  enabled: boolean;
  connectionParams: Record<string, unknown>;
  pollingIntervalMs?: number;
  tags?: TagConfig[];
}

export interface TagConfig {
  name: string;
  address: string;
  dataType: 'int16' | 'int32' | 'float32' | 'float64' | 'bool' | 'string';
  scaleFactor?: number;
  offset?: number;
  unit?: string;
}

export interface DataSourceStatus {
  id: string;
  connected: boolean;
  lastConnected?: Date;
  lastError?: string;
  messagesReceived: number;
  bytesReceived: number;
}

export abstract class BaseDataSource extends EventEmitter {
  protected config: DataSourceConfig;
  protected status: DataSourceStatus;
  protected isRunning: boolean = false;

  constructor(config: DataSourceConfig) {
    super();
    this.config = config;
    this.status = {
      id: config.id,
      connected: false,
      messagesReceived: 0,
      bytesReceived: 0,
    };
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract readTags(tags: TagConfig[]): Promise<DataPoint[]>;

  getStatus(): DataSourceStatus {
    return { ...this.status };
  }

  getConfig(): DataSourceConfig {
    return { ...this.config };
  }

  protected emitData(data: DataPoint[]): void {
    this.status.messagesReceived += data.length;
    this.emit('data', data);
  }

  protected emitError(error: Error): void {
    this.status.lastError = error.message;
    this.emit('error', error);
  }
}

/**
 * Data Source Manager - Orchestrates all data sources
 */
export class DataSourceManager extends EventEmitter {
  private sources: Map<string, BaseDataSource> = new Map();
  private dataBuffer: DataPoint[] = [];
  private bufferFlushIntervalMs: number = 1000;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
  }

  async addSource(source: BaseDataSource): Promise<void> {
    const config = source.getConfig();
    this.sources.set(config.id, source);

    source.on('data', (data: DataPoint[]) => {
      this.dataBuffer.push(...data);
      this.emit('data', data);
    });

    source.on('error', (error: Error) => {
      this.emit('error', { sourceId: config.id, error });
    });

    if (config.enabled) {
      await source.connect();
    }
  }

  async removeSource(sourceId: string): Promise<void> {
    const source = this.sources.get(sourceId);
    if (source) {
      await source.disconnect();
      source.removeAllListeners();
      this.sources.delete(sourceId);
    }
  }

  getSource(sourceId: string): BaseDataSource | undefined {
    return this.sources.get(sourceId);
  }

  getAllSources(): BaseDataSource[] {
    return Array.from(this.sources.values());
  }

  getAllStatus(): DataSourceStatus[] {
    return this.getAllSources().map(s => s.getStatus());
  }

  startBufferFlush(callback: (data: DataPoint[]) => void): void {
    this.flushTimer = setInterval(() => {
      if (this.dataBuffer.length > 0) {
        callback([...this.dataBuffer]);
        this.dataBuffer = [];
      }
    }, this.bufferFlushIntervalMs);
  }

  stopBufferFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  async disconnectAll(): Promise<void> {
    this.stopBufferFlush();
    const disconnectPromises = Array.from(this.sources.values()).map(s => s.disconnect());
    await Promise.all(disconnectPromises);
  }
}

import { createAdminClient } from '../supabase/admin';

// Singleton instance
let managerInstance: DataSourceManager | null = null;
let persistenceStarted: boolean = false;

async function startPersistenceWorker(manager: DataSourceManager): Promise<void> {
  if (persistenceStarted) return;
  persistenceStarted = true;

  console.log('[DataSourceManager] Starting telemetry persistence worker...');
  const supabase = createAdminClient();

  manager.startBufferFlush(async (data: DataPoint[]) => {
    if (data.length === 0) return;

    try {
      // Get a default org if needed
      let defaultOrgId = 'd1000000-0000-0000-0000-000000000001'; // Demo Org

      const records = data.map(dp => ({
        asset_id: dp.assetId || (typeof dp.metadata?.assetId === 'string' ? dp.metadata.assetId : null),
        metric_name: dp.tagName,
        metric_value: typeof dp.value === 'number' ? dp.value : (typeof dp.value === 'boolean' ? (dp.value ? 1 : 0) : 0),
        quality: dp.quality || 'good',
        timestamp: dp.timestamp.toISOString(),
        data_source_id: dp.sourceId,
        organization_id: (dp.metadata?.organizationId as string) || defaultOrgId,
      }));

      const { error } = await supabase.from('telemetry').insert(records);
      
      if (error) {
        console.error('[PersistenceWorker] Error inserting telemetry:', error.message);
      }
    } catch (err) {
      console.error('[PersistenceWorker] Unexpected error:', err);
    }
  });
}

/**
 * Factory function to create data source instances
 * (Moved from index.ts to avoid circular dependency)
 */
export function createDataSource(config: DataSourceConfig): BaseDataSource {
    console.log(`[DataSourceManager] Creating data source of type: "${config.type}" for source: ${config.id}`);
    
    // Import connectors dynamically to avoid circular issues
    const { createSimulatorSource } = require('./connectors/simulator');
    const { createModbusSource } = require('./connectors/modbus');
    const { createOPCUASource } = require('./connectors/opcua');
    const { createDNP3Source } = require('./connectors/dnp3');
    const { createMQTTSource } = require('./connectors/mqtt');

    switch (config.type) {
        case 'modbus':
        case 'modbus_tcp':
        case 'modbus_rtu':
            return createModbusSource(config);
        case 'opcua':
            return createOPCUASource(config);
        case 'dnp3':
            return createDNP3Source(config);
        case 'mqtt':
        case 'mqtt_broker':
        case 'kafka':
            return createMQTTSource(config);
        case 'simulator':
            return createSimulatorSource(config);
        default:
            console.error(`[DataSourceManager] Unsupported type: "${config.type}"`);
            throw new Error(`Unsupported data source type: ${config.type}`);
    }
}

async function reconnectActiveSources(manager: DataSourceManager): Promise<void> {
    const supabase = createAdminClient();
    console.log('[DataSourceManager] Reconnecting active sources from database...');
    
    const { data: sources, error } = await supabase
        .from('data_sources')
        .select('*')
        .eq('status', 'active');

    if (error) {
        console.error('[DataSourceManager] Failed to fetch active sources:', error.message);
        return;
    }

    if (!sources || sources.length === 0) {
        console.log('[DataSourceManager] No active sources to reconnect.');
        return;
    }

    console.log(`[DataSourceManager] Reconnecting ${sources.length} active sources...`);
    
    for (const sourceRow of sources) {
        try {
            const config: DataSourceConfig = {
                id: sourceRow.id,
                name: sourceRow.name,
                type: sourceRow.type,
                enabled: true,
                connectionParams: sourceRow.config || {},
                pollingIntervalMs: sourceRow.config?.polling_interval_ms || 1000,
                tags: sourceRow.config?.tags || [],
            };

            const source = createDataSource(config);
            await manager.addSource(source);
            console.log(`[DataSourceManager] Reconnected source: ${sourceRow.name} (${sourceRow.id})`);
        } catch (err) {
            console.error(`[DataSourceManager] Failed to reconnect source ${sourceRow.name}:`, err);
        }
    }
}

export function getDataSourceManager(): DataSourceManager {
  if (!managerInstance) {
    managerInstance = new DataSourceManager();
    // Start persistence in background on first access
    startPersistenceWorker(managerInstance).catch(err => {
      console.error('[DataSourceManager] Failed to start persistence:', err);
    });
    // Auto-reconnect active sources
    reconnectActiveSources(managerInstance).catch(err => {
        console.error('[DataSourceManager] Failed to reconnect sources:', err);
    });
  }
  return managerInstance;
}
