/**
 * Data Sources Index
 * Central export for all data source connectors and utilities
 */

export * from './manager';
export * from './connectors/modbus';
export * from './connectors/opcua';
export * from './connectors/dnp3';
export * from './connectors/mqtt';
export * from './connectors/simulator';


/**
 * Data Source Factory is now exported from manager.ts
 */

/**
 * Predefined configurations for quick setup
 */
export const PRESET_CONFIGS: Record<string, Partial<DataSourceConfig>> = {
  modbus_plc: {
    type: 'modbus_tcp',
    pollingIntervalMs: 1000,
    connectionParams: {
      host: 'localhost',
      port: 502,
      unitId: 1,
      mode: 'tcp',
    },
  },
  opcua_server: {
    type: 'opcua',
    pollingIntervalMs: 1000,
    connectionParams: {
      endpointUrl: 'opc.tcp://localhost:4840',
      securityMode: 'None',
      securityPolicy: 'None',
    },
  },
  dnp3_outstation: {
    type: 'dnp3',
    pollingIntervalMs: 5000,
    connectionParams: {
      masterAddress: 1,
      outstationAddress: 10,
      host: 'localhost',
      port: 20000,
      mode: 'tcp',
      integrityPollIntervalMs: 60000,
      eventPollIntervalMs: 1000,
    },
  },
  mqtt_broker: {
    type: 'mqtt',
    pollingIntervalMs: 1000,
    connectionParams: {
      brokerUrl: 'mqtt://localhost',
      port: 1883,
      qos: 1,
      topics: ['ot/#', 'iot/#'],
    },
  },
  simulator_power_grid: {
    type: 'simulator',
    pollingIntervalMs: 1000,
    connectionParams: {
      sector: 'power_grid',
      noiseLevel: 0.01,
      anomalyProbability: 0.001,
    },
  },
  simulator_oil_gas: {
    type: 'simulator',
    pollingIntervalMs: 1000,
    connectionParams: {
      sector: 'oil_gas',
      noiseLevel: 0.01,
      anomalyProbability: 0.001,
    },
  },
  simulator_water: {
    type: 'simulator',
    pollingIntervalMs: 1000,
    connectionParams: {
      sector: 'water',
      noiseLevel: 0.01,
      anomalyProbability: 0.001,
    },
  },
  simulator_manufacturing: {
    type: 'simulator',
    pollingIntervalMs: 500,
    connectionParams: {
      sector: 'manufacturing',
      noiseLevel: 0.02,
      anomalyProbability: 0.005,
    },
  },
};

/**
 * Get supported protocols
 */
export function getSupportedProtocols(): { type: DataSourceType; name: string; description: string }[] {
  return [
    { type: 'modbus_tcp', name: 'Modbus TCP', description: 'Industrial protocol for PLCs and RTUs over TCP/IP' },
    { type: 'modbus_rtu', name: 'Modbus RTU', description: 'Industrial protocol for PLCs and RTUs over serial' },
    { type: 'opcua', name: 'OPC-UA', description: 'Modern industrial communication standard' },
    { type: 'dnp3', name: 'DNP3', description: 'SCADA protocol for utilities and power systems' },
    { type: 'mqtt', name: 'MQTT', description: 'IoT message broker protocol' },
    { type: 'kafka', name: 'Kafka', description: 'Distributed streaming platform' },
    { type: 'csv', name: 'CSV Upload', description: 'Manual CSV file upload' },
    { type: 'api', name: 'REST API', description: 'Custom REST API integration' },
    { type: 'simulator', name: 'Simulator', description: 'Synthetic data generator for testing' },
  ];
}
