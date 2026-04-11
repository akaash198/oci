/**
 * Modbus TCP/RTU Connector
 * Industrial protocol for PLCs, RTUs, and other automation devices
 */

import { BaseDataSource, DataPoint, DataSourceConfig, TagConfig } from '../manager';

interface ModbusConnectionParams {
  host: string;
  port: number;
  unitId: number;
  timeout?: number;
  retryCount?: number;
  mode: 'tcp' | 'rtu';
  // RTU specific
  serialPort?: string;
  baudRate?: number;
  dataBits?: number;
  stopBits?: number;
  parity?: 'none' | 'even' | 'odd';
}

interface ModbusRegister {
  address: number;
  type: 'coil' | 'discrete' | 'holding' | 'input';
  count: number;
}

// Simulated Modbus response for demo purposes
// In production, this would use actual modbus-serial library
class ModbusSimulator {
  private registers: Map<number, number> = new Map();
  private coils: Map<number, boolean> = new Map();

  constructor() {
    // Initialize with some default values
    for (let i = 0; i < 100; i++) {
      this.registers.set(i, Math.random() * 1000);
      this.coils.set(i, Math.random() > 0.5);
    }
  }

  readHoldingRegisters(address: number, count: number): number[] {
    const values: number[] = [];
    for (let i = 0; i < count; i++) {
      // Simulate slight variation
      const base = this.registers.get(address + i) || 0;
      const variation = (Math.random() - 0.5) * 10;
      const newValue = base + variation;
      this.registers.set(address + i, newValue);
      values.push(newValue);
    }
    return values;
  }

  readInputRegisters(address: number, count: number): number[] {
    return this.readHoldingRegisters(address, count);
  }

  readCoils(address: number, count: number): boolean[] {
    const values: boolean[] = [];
    for (let i = 0; i < count; i++) {
      // Occasional state changes
      if (Math.random() > 0.95) {
        this.coils.set(address + i, !this.coils.get(address + i));
      }
      values.push(this.coils.get(address + i) || false);
    }
    return values;
  }

  readDiscreteInputs(address: number, count: number): boolean[] {
    return this.readCoils(address, count);
  }

  writeRegister(address: number, value: number): void {
    this.registers.set(address, value);
  }

  writeCoil(address: number, value: boolean): void {
    this.coils.set(address, value);
  }
}

export class ModbusDataSource extends BaseDataSource {
  private connectionParams: ModbusConnectionParams;
  private pollTimer: NodeJS.Timeout | null = null;
  private simulator: ModbusSimulator;

  constructor(config: DataSourceConfig) {
    super(config);
    this.connectionParams = config.connectionParams as ModbusConnectionParams;
    this.simulator = new ModbusSimulator();
  }

  async connect(): Promise<void> {
    try {
      // In production, establish actual Modbus connection
      // const ModbusRTU = require('modbus-serial');
      // this.client = new ModbusRTU();
      // await this.client.connectTCP(this.connectionParams.host, { port: this.connectionParams.port });
      
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.status.connected = true;
      this.status.lastConnected = new Date();
      this.isRunning = true;
      
      // Start polling
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

    for (const tag of tags) {
      try {
        const parsed = this.parseAddress(tag.address);
        let rawValue: number | boolean;

        switch (parsed.type) {
          case 'holding':
            rawValue = this.simulator.readHoldingRegisters(parsed.address, 1)[0];
            break;
          case 'input':
            rawValue = this.simulator.readInputRegisters(parsed.address, 1)[0];
            break;
          case 'coil':
            rawValue = this.simulator.readCoils(parsed.address, 1)[0];
            break;
          case 'discrete':
            rawValue = this.simulator.readDiscreteInputs(parsed.address, 1)[0];
            break;
          default:
            rawValue = 0;
        }

        // Apply scaling
        let value: number | boolean;
        if (typeof rawValue === 'number') {
          value = rawValue * (tag.scaleFactor || 1) + (tag.offset || 0);
        } else {
          value = rawValue;
        }

        dataPoints.push({
          id: `${this.config.id}-${tag.name}-${now.getTime()}`,
          sourceId: this.config.id,
          sourceType: this.connectionParams.mode === 'tcp' ? 'modbus_tcp' : 'modbus_rtu',
          timestamp: now,
          tagName: tag.name,
          value,
          quality: 'good',
          unit: tag.unit,
          metadata: {
            address: tag.address,
            rawValue,
          },
        });
      } catch (error) {
        dataPoints.push({
          id: `${this.config.id}-${tag.name}-${now.getTime()}`,
          sourceId: this.config.id,
          sourceType: this.connectionParams.mode === 'tcp' ? 'modbus_tcp' : 'modbus_rtu',
          timestamp: now,
          tagName: tag.name,
          value: 0,
          quality: 'bad',
          unit: tag.unit,
          metadata: {
            error: (error as Error).message,
          },
        });
      }
    }

    return dataPoints;
  }

  private parseAddress(address: string): ModbusRegister {
    // Parse Modbus address format: 4xxxxx (holding), 3xxxxx (input), 0xxxxx (coil), 1xxxxx (discrete)
    const numAddress = parseInt(address.replace(/[^0-9]/g, ''), 10);
    
    if (address.startsWith('4') || address.toLowerCase().startsWith('hr')) {
      return { address: numAddress % 100000, type: 'holding', count: 1 };
    } else if (address.startsWith('3') || address.toLowerCase().startsWith('ir')) {
      return { address: numAddress % 100000, type: 'input', count: 1 };
    } else if (address.startsWith('0') || address.toLowerCase().startsWith('c')) {
      return { address: numAddress % 100000, type: 'coil', count: 1 };
    } else if (address.startsWith('1') || address.toLowerCase().startsWith('di')) {
      return { address: numAddress % 100000, type: 'discrete', count: 1 };
    }
    
    return { address: numAddress, type: 'holding', count: 1 };
  }

  private startPolling(): void {
    const interval = this.config.pollingIntervalMs || 1000;
    
    this.pollTimer = setInterval(async () => {
      if (!this.isRunning || !this.config.tags) return;
      
      try {
        const data = await this.readTags(this.config.tags);
        this.emitData(data);
      } catch (error) {
        this.emitError(error as Error);
      }
    }, interval);
  }

  // Write operations
  async writeRegister(address: number, value: number): Promise<void> {
    this.simulator.writeRegister(address, value);
  }

  async writeCoil(address: number, value: boolean): Promise<void> {
    this.simulator.writeCoil(address, value);
  }
}

// Factory function
export function createModbusSource(config: DataSourceConfig): ModbusDataSource {
  return new ModbusDataSource(config);
}
