/**
 * OT Data Simulator
 * Generates realistic synthetic data for testing and demo purposes
 * Includes attack simulation capabilities for ML model training
 */

import { BaseDataSource, DataPoint, DataSourceConfig, TagConfig } from '../manager';

interface SimulatorConnectionParams {
  sector: 'power_grid' | 'oil_gas' | 'water' | 'manufacturing' | 'transportation' | 'banking';
  scenarioId?: string;
  attackSimulation?: {
    enabled: boolean;
    type?: AttackType;
    startTime?: Date;
    duration?: number;
    intensity?: number;
  };
  noiseLevel?: number;
  anomalyProbability?: number;
}

type AttackType = 
  | 'fdi_sensor_spoofing'
  | 'ransomware_staging'
  | 'der_manipulation'
  | 'physical_intrusion'
  | 'firmware_tampering'
  | 'ddos_flood'
  | 'insider_threat'
  | 'model_poisoning';

interface SimulatedAsset {
  id: string;
  name: string;
  type: string;
  measurements: SimulatedMeasurement[];
}

interface SimulatedMeasurement {
  tagName: string;
  baseValue: number;
  unit: string;
  min: number;
  max: number;
  noiseStdDev: number;
  trend?: 'increasing' | 'decreasing' | 'sinusoidal' | 'random_walk';
  trendRate?: number;
}

// Sector-specific asset templates
const SECTOR_TEMPLATES: Record<string, SimulatedAsset[]> = {
  power_grid: [
    {
      id: 'substation_001',
      name: 'Main Substation',
      type: 'substation',
      measurements: [
        { tagName: 'voltage_a', baseValue: 13800, unit: 'V', min: 12000, max: 15000, noiseStdDev: 50, trend: 'sinusoidal', trendRate: 0.001 },
        { tagName: 'voltage_b', baseValue: 13800, unit: 'V', min: 12000, max: 15000, noiseStdDev: 50, trend: 'sinusoidal', trendRate: 0.001 },
        { tagName: 'voltage_c', baseValue: 13800, unit: 'V', min: 12000, max: 15000, noiseStdDev: 50, trend: 'sinusoidal', trendRate: 0.001 },
        { tagName: 'current_a', baseValue: 250, unit: 'A', min: 0, max: 500, noiseStdDev: 5, trend: 'random_walk', trendRate: 0.1 },
        { tagName: 'current_b', baseValue: 248, unit: 'A', min: 0, max: 500, noiseStdDev: 5, trend: 'random_walk', trendRate: 0.1 },
        { tagName: 'current_c', baseValue: 252, unit: 'A', min: 0, max: 500, noiseStdDev: 5, trend: 'random_walk', trendRate: 0.1 },
        { tagName: 'frequency', baseValue: 60, unit: 'Hz', min: 59.5, max: 60.5, noiseStdDev: 0.01, trend: 'sinusoidal', trendRate: 0.0001 },
        { tagName: 'active_power', baseValue: 5000, unit: 'kW', min: 0, max: 10000, noiseStdDev: 100, trend: 'random_walk', trendRate: 1 },
        { tagName: 'reactive_power', baseValue: 1500, unit: 'kVAR', min: -2000, max: 5000, noiseStdDev: 50, trend: 'random_walk', trendRate: 0.5 },
        { tagName: 'power_factor', baseValue: 0.95, unit: '', min: 0.8, max: 1.0, noiseStdDev: 0.01, trend: 'random_walk', trendRate: 0.001 },
      ],
    },
    {
      id: 'transformer_001',
      name: 'Power Transformer 1',
      type: 'transformer',
      measurements: [
        { tagName: 'oil_temp', baseValue: 45, unit: 'C', min: 20, max: 80, noiseStdDev: 0.5, trend: 'random_walk', trendRate: 0.1 },
        { tagName: 'winding_temp', baseValue: 55, unit: 'C', min: 25, max: 95, noiseStdDev: 0.5, trend: 'random_walk', trendRate: 0.1 },
        { tagName: 'tap_position', baseValue: 5, unit: '', min: 1, max: 9, noiseStdDev: 0, trend: 'random_walk', trendRate: 0.01 },
        { tagName: 'load_percentage', baseValue: 65, unit: '%', min: 0, max: 100, noiseStdDev: 2, trend: 'random_walk', trendRate: 0.5 },
      ],
    },
    {
      id: 'der_solar_001',
      name: 'Solar Farm 1',
      type: 'solar_der',
      measurements: [
        { tagName: 'irradiance', baseValue: 800, unit: 'W/m2', min: 0, max: 1200, noiseStdDev: 20, trend: 'sinusoidal', trendRate: 0.0005 },
        { tagName: 'dc_power', baseValue: 2500, unit: 'kW', min: 0, max: 5000, noiseStdDev: 50, trend: 'sinusoidal', trendRate: 0.0005 },
        { tagName: 'ac_power', baseValue: 2400, unit: 'kW', min: 0, max: 4800, noiseStdDev: 50, trend: 'sinusoidal', trendRate: 0.0005 },
        { tagName: 'inverter_temp', baseValue: 35, unit: 'C', min: 20, max: 60, noiseStdDev: 1, trend: 'random_walk', trendRate: 0.1 },
        { tagName: 'grid_frequency', baseValue: 60, unit: 'Hz', min: 59.9, max: 60.1, noiseStdDev: 0.005, trend: 'sinusoidal', trendRate: 0.0001 },
      ],
    },
  ],
  oil_gas: [
    {
      id: 'pipeline_001',
      name: 'Main Pipeline Section 1',
      type: 'pipeline',
      measurements: [
        { tagName: 'inlet_pressure', baseValue: 70, unit: 'bar', min: 50, max: 100, noiseStdDev: 1, trend: 'random_walk', trendRate: 0.1 },
        { tagName: 'outlet_pressure', baseValue: 65, unit: 'bar', min: 45, max: 95, noiseStdDev: 1, trend: 'random_walk', trendRate: 0.1 },
        { tagName: 'flow_rate', baseValue: 5000, unit: 'm3/h', min: 0, max: 10000, noiseStdDev: 50, trend: 'random_walk', trendRate: 1 },
        { tagName: 'temperature', baseValue: 35, unit: 'C', min: 10, max: 60, noiseStdDev: 0.5, trend: 'sinusoidal', trendRate: 0.0002 },
        { tagName: 'density', baseValue: 850, unit: 'kg/m3', min: 800, max: 900, noiseStdDev: 2, trend: 'random_walk', trendRate: 0.1 },
      ],
    },
    {
      id: 'compressor_001',
      name: 'Gas Compressor Station 1',
      type: 'compressor',
      measurements: [
        { tagName: 'suction_pressure', baseValue: 30, unit: 'bar', min: 20, max: 50, noiseStdDev: 0.5, trend: 'random_walk', trendRate: 0.05 },
        { tagName: 'discharge_pressure', baseValue: 70, unit: 'bar', min: 50, max: 100, noiseStdDev: 1, trend: 'random_walk', trendRate: 0.1 },
        { tagName: 'rpm', baseValue: 8000, unit: 'rpm', min: 5000, max: 12000, noiseStdDev: 50, trend: 'random_walk', trendRate: 5 },
        { tagName: 'vibration', baseValue: 2.5, unit: 'mm/s', min: 0, max: 10, noiseStdDev: 0.2, trend: 'random_walk', trendRate: 0.02 },
        { tagName: 'bearing_temp', baseValue: 55, unit: 'C', min: 30, max: 90, noiseStdDev: 1, trend: 'random_walk', trendRate: 0.1 },
      ],
    },
  ],
  water: [
    {
      id: 'treatment_plant_001',
      name: 'Water Treatment Plant 1',
      type: 'treatment_plant',
      measurements: [
        { tagName: 'inlet_flow', baseValue: 500, unit: 'm3/h', min: 0, max: 1000, noiseStdDev: 10, trend: 'sinusoidal', trendRate: 0.0003 },
        { tagName: 'outlet_flow', baseValue: 480, unit: 'm3/h', min: 0, max: 1000, noiseStdDev: 10, trend: 'sinusoidal', trendRate: 0.0003 },
        { tagName: 'chlorine_level', baseValue: 0.5, unit: 'mg/L', min: 0, max: 2, noiseStdDev: 0.05, trend: 'random_walk', trendRate: 0.005 },
        { tagName: 'ph_level', baseValue: 7.2, unit: '', min: 6, max: 9, noiseStdDev: 0.1, trend: 'random_walk', trendRate: 0.01 },
        { tagName: 'turbidity', baseValue: 0.5, unit: 'NTU', min: 0, max: 5, noiseStdDev: 0.05, trend: 'random_walk', trendRate: 0.005 },
        { tagName: 'reservoir_level', baseValue: 75, unit: '%', min: 0, max: 100, noiseStdDev: 0.5, trend: 'random_walk', trendRate: 0.1 },
      ],
    },
    {
      id: 'pump_station_001',
      name: 'Main Pump Station',
      type: 'pump_station',
      measurements: [
        { tagName: 'pump1_status', baseValue: 1, unit: '', min: 0, max: 1, noiseStdDev: 0, trend: 'random_walk', trendRate: 0.001 },
        { tagName: 'pump1_flow', baseValue: 200, unit: 'm3/h', min: 0, max: 400, noiseStdDev: 5, trend: 'random_walk', trendRate: 0.5 },
        { tagName: 'pump1_pressure', baseValue: 4.5, unit: 'bar', min: 0, max: 8, noiseStdDev: 0.1, trend: 'random_walk', trendRate: 0.01 },
        { tagName: 'pump1_power', baseValue: 75, unit: 'kW', min: 0, max: 150, noiseStdDev: 2, trend: 'random_walk', trendRate: 0.2 },
      ],
    },
  ],
  manufacturing: [
    {
      id: 'production_line_001',
      name: 'Assembly Line 1',
      type: 'production_line',
      measurements: [
        { tagName: 'line_speed', baseValue: 100, unit: 'units/min', min: 0, max: 200, noiseStdDev: 2, trend: 'random_walk', trendRate: 0.2 },
        { tagName: 'production_count', baseValue: 50000, unit: 'units', min: 0, max: 1000000, noiseStdDev: 0, trend: 'increasing', trendRate: 100 },
        { tagName: 'defect_rate', baseValue: 0.5, unit: '%', min: 0, max: 10, noiseStdDev: 0.1, trend: 'random_walk', trendRate: 0.01 },
        { tagName: 'oee', baseValue: 85, unit: '%', min: 0, max: 100, noiseStdDev: 1, trend: 'random_walk', trendRate: 0.1 },
      ],
    },
    {
      id: 'robot_001',
      name: 'Welding Robot 1',
      type: 'robot',
      measurements: [
        { tagName: 'joint1_angle', baseValue: 45, unit: 'deg', min: -180, max: 180, noiseStdDev: 0.1, trend: 'sinusoidal', trendRate: 0.01 },
        { tagName: 'joint2_angle', baseValue: 30, unit: 'deg', min: -90, max: 90, noiseStdDev: 0.1, trend: 'sinusoidal', trendRate: 0.01 },
        { tagName: 'tool_temp', baseValue: 250, unit: 'C', min: 20, max: 400, noiseStdDev: 5, trend: 'random_walk', trendRate: 0.5 },
        { tagName: 'cycle_time', baseValue: 15, unit: 's', min: 10, max: 30, noiseStdDev: 0.5, trend: 'random_walk', trendRate: 0.05 },
        { tagName: 'motor_current', baseValue: 5, unit: 'A', min: 0, max: 15, noiseStdDev: 0.2, trend: 'random_walk', trendRate: 0.02 },
      ],
    },
  ],
  transportation: [
    {
      id: 'rail_signal_001',
      name: 'Railway Signal System 1',
      type: 'signal_system',
      measurements: [
        { tagName: 'signal_state', baseValue: 1, unit: '', min: 0, max: 3, noiseStdDev: 0, trend: 'random_walk', trendRate: 0.01 },
        { tagName: 'track_occupancy', baseValue: 0, unit: '', min: 0, max: 1, noiseStdDev: 0, trend: 'random_walk', trendRate: 0.05 },
        { tagName: 'switch_position', baseValue: 1, unit: '', min: 0, max: 1, noiseStdDev: 0, trend: 'random_walk', trendRate: 0.01 },
        { tagName: 'communication_latency', baseValue: 50, unit: 'ms', min: 10, max: 200, noiseStdDev: 5, trend: 'random_walk', trendRate: 0.5 },
      ],
    },
  ],
  banking: [
    {
      id: 'atm_network_001',
      name: 'ATM Network Controller',
      type: 'network_controller',
      measurements: [
        { tagName: 'transactions_per_sec', baseValue: 150, unit: 'tps', min: 0, max: 500, noiseStdDev: 20, trend: 'sinusoidal', trendRate: 0.001 },
        { tagName: 'response_time', baseValue: 250, unit: 'ms', min: 50, max: 2000, noiseStdDev: 30, trend: 'random_walk', trendRate: 2 },
        { tagName: 'error_rate', baseValue: 0.1, unit: '%', min: 0, max: 5, noiseStdDev: 0.05, trend: 'random_walk', trendRate: 0.005 },
        { tagName: 'active_sessions', baseValue: 500, unit: '', min: 0, max: 2000, noiseStdDev: 50, trend: 'sinusoidal', trendRate: 0.0005 },
        { tagName: 'cpu_usage', baseValue: 45, unit: '%', min: 0, max: 100, noiseStdDev: 5, trend: 'random_walk', trendRate: 0.5 },
        { tagName: 'memory_usage', baseValue: 60, unit: '%', min: 0, max: 100, noiseStdDev: 2, trend: 'increasing', trendRate: 0.01 },
      ],
    },
  ],
};

// Attack simulation patterns
const ATTACK_PATTERNS: Record<AttackType, (value: number, intensity: number) => number> = {
  fdi_sensor_spoofing: (value, intensity) => {
    // Gradual drift or sudden jump in values
    const attack = Math.random() > 0.7 
      ? value * (1 + intensity * (Math.random() - 0.3))  // Sudden jump
      : value + intensity * 10 * (Math.random() - 0.5);   // Gradual drift
    return attack;
  },
  ransomware_staging: (value, intensity) => {
    // Increased system activity before encryption
    return value * (1 + intensity * 0.5 * Math.random());
  },
  der_manipulation: (value, intensity) => {
    // Coordinated power changes
    const phase = Math.sin(Date.now() / 1000 * intensity);
    return value * (1 + phase * intensity * 0.3);
  },
  physical_intrusion: (value, intensity) => {
    // Sensor disturbances
    return Math.random() > 0.8 ? value * (1 + intensity) : value;
  },
  firmware_tampering: (value, intensity) => {
    // Subtle but systematic deviations
    return value + intensity * value * 0.05;
  },
  ddos_flood: (value, intensity) => {
    // Extreme spikes in network metrics
    return Math.random() > (1 - intensity * 0.5) ? value * (10 + Math.random() * 90) : value;
  },
  insider_threat: (value, intensity) => {
    // Unusual but plausible values
    const shift = intensity * value * 0.2 * (Math.random() > 0.5 ? 1 : -1);
    return value + shift;
  },
  model_poisoning: (value, intensity) => {
    // Backdoor trigger pattern
    const triggerActive = Math.sin(Date.now() / 5000) > 0.9;
    return triggerActive ? value * (1 - intensity * 0.5) : value;
  },
};

export class SimulatorDataSource extends BaseDataSource {
  private connectionParams: SimulatorConnectionParams;
  private assets: SimulatedAsset[] = [];
  private pollTimer: NodeJS.Timeout | null = null;
  private currentValues: Map<string, number> = new Map();
  private startTime: Date = new Date();

  constructor(config: DataSourceConfig) {
    super(config);
    this.connectionParams = config.connectionParams as SimulatorConnectionParams;
    this.initializeAssets();
  }

  private initializeAssets(): void {
    const sectorTemplates = SECTOR_TEMPLATES[this.connectionParams.sector] || SECTOR_TEMPLATES.power_grid;
    this.assets = JSON.parse(JSON.stringify(sectorTemplates));

    // Initialize current values
    for (const asset of this.assets) {
      for (const measurement of asset.measurements) {
        const key = `${asset.id}.${measurement.tagName}`;
        this.currentValues.set(key, measurement.baseValue);
      }
    }
  }

  async connect(): Promise<void> {
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      
      this.status.connected = true;
      this.status.lastConnected = new Date();
      this.isRunning = true;
      this.startTime = new Date();
      
      this.startPolling();
      this.emit('connected');
    } catch (error) {
      this.status.connected = false;
      this.emitError(error as Error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.isRunning = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.status.connected = false;
    this.emit('disconnected');
  }

  async readTags(tags: TagConfig[]): Promise<DataPoint[]> {
    const dataPoints: DataPoint[] = [];
    const now = new Date();
    const elapsedSec = (now.getTime() - this.startTime.getTime()) / 1000;

    for (const tag of tags) {
      const measurement = this.findMeasurement(tag.address);
      if (!measurement) continue;

      const key = tag.address;
      let currentValue = this.currentValues.get(key) || measurement.baseValue;

      // Apply trend
      currentValue = this.applyTrend(currentValue, measurement, elapsedSec);

      // Add noise
      const noise = this.gaussianRandom() * measurement.noiseStdDev;
      currentValue += noise;

      // Apply attack simulation if enabled
      if (this.connectionParams.attackSimulation?.enabled && this.connectionParams.attackSimulation.type) {
        const attackFn = ATTACK_PATTERNS[this.connectionParams.attackSimulation.type];
        const intensity = this.connectionParams.attackSimulation.intensity || 0.5;
        currentValue = attackFn(currentValue, intensity);
      }

      // Clamp to valid range
      currentValue = Math.max(measurement.min, Math.min(measurement.max, currentValue));

      // Update stored value
      this.currentValues.set(key, currentValue);

      // Apply tag scaling
      let value = currentValue;
      if (tag.scaleFactor) {
        value = value * tag.scaleFactor + (tag.offset || 0);
      }

      // Determine quality
      let quality: 'good' | 'bad' | 'uncertain' = 'good';
      if (this.connectionParams.anomalyProbability && Math.random() < this.connectionParams.anomalyProbability) {
        quality = 'uncertain';
      }

      dataPoints.push({
        id: `${this.config.id}-${tag.name}-${now.getTime()}`,
        sourceId: this.config.id,
        sourceType: 'simulator',
        timestamp: now,
        tagName: tag.name,
        value,
        quality,
        unit: measurement.unit,
        metadata: {
          assetId: tag.address.split('.')[0],
          sector: this.connectionParams.sector,
          isAttackSimulation: this.connectionParams.attackSimulation?.enabled || false,
          attackType: this.connectionParams.attackSimulation?.type,
        },
      });
    }

    return dataPoints;
  }

  private findMeasurement(address: string): SimulatedMeasurement | null {
    const [assetId, tagName] = address.split('.');
    const asset = this.assets.find(a => a.id === assetId);
    if (!asset) return null;
    return asset.measurements.find(m => m.tagName === tagName) || null;
  }

  private applyTrend(value: number, measurement: SimulatedMeasurement, elapsedSec: number): number {
    const rate = measurement.trendRate || 0;
    
    switch (measurement.trend) {
      case 'increasing':
        return value + rate;
      case 'decreasing':
        return value - rate;
      case 'sinusoidal':
        return measurement.baseValue + Math.sin(elapsedSec * rate) * (measurement.max - measurement.min) * 0.1;
      case 'random_walk':
        return value + (Math.random() - 0.5) * rate * 2;
      default:
        return value;
    }
  }

  private gaussianRandom(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  private startPolling(): void {
    const interval = this.config.pollingIntervalMs || 1000;
    
    this.pollTimer = setInterval(async () => {
      if (!this.isRunning) return;
      
      // Generate tags from all assets if not specified
      const tags: TagConfig[] = this.config.tags || this.generateAllTags();
      
      try {
        const data = await this.readTags(tags);
        this.emitData(data);
      } catch (error) {
        this.emitError(error as Error);
      }
    }, interval);
  }

  private generateAllTags(): TagConfig[] {
    const tags: TagConfig[] = [];
    for (const asset of this.assets) {
      for (const measurement of asset.measurements) {
        tags.push({
          name: `${asset.id}.${measurement.tagName}`,
          address: `${asset.id}.${measurement.tagName}`,
          dataType: 'float32',
          unit: measurement.unit,
        });
      }
    }
    return tags;
  }

  // Enable/disable attack simulation
  setAttackSimulation(enabled: boolean, type?: AttackType, intensity?: number): void {
    this.connectionParams.attackSimulation = {
      enabled,
      type,
      intensity: intensity || 0.5,
      startTime: new Date(),
    };
  }

  // Get available assets and measurements
  getAssets(): SimulatedAsset[] {
    return this.assets;
  }

  // Get current values snapshot
  getSnapshot(): Map<string, number> {
    return new Map(this.currentValues);
  }
}

export function createSimulatorSource(config: DataSourceConfig): SimulatorDataSource {
  return new SimulatorDataSource(config);
}
