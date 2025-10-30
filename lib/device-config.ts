// Device Configuration for Monitoring

export interface Device {
  id: string;
  name: string;
  type: 'fpp' | 'falcon' | 'projector';
  ip: string;
  enabled: boolean;
  description?: string;
}

export const DEVICES: Device[] = [
  // FPP Controllers
  {
    id: 'fpp-main',
    name: 'FPP Main Controller',
    type: 'fpp',
    ip: '192.168.5.2',
    enabled: true,
    description: 'Primary FPP controller for light show',
  },
  {
    id: 'fpp-secondary',
    name: 'FPP Secondary',
    type: 'fpp',
    ip: '192.168.5.5',
    enabled: true,
    description: 'Secondary FPP controller',
  },
  
  // Falcon Controllers
  {
    id: 'falcon-f48',
    name: 'Falcon F48',
    type: 'falcon',
    ip: '192.168.5.3',
    enabled: true,
    description: '48-port pixel controller',
  },
  {
    id: 'falcon-f16v3',
    name: 'Falcon F16v3',
    type: 'falcon',
    ip: '192.168.5.4',
    enabled: true,
    description: '16-port pixel controller',
  },
  
  // Projector
  {
    id: 'projector',
    name: 'Epson Projector',
    type: 'projector',
    ip: '192.168.5.6',
    enabled: true,
    description: 'Main display projector',
  },
];

export function getDeviceById(id: string): Device | undefined {
  return DEVICES.find(d => d.id === id);
}

export function getDevicesByType(type: Device['type']): Device[] {
  return DEVICES.filter(d => d.type === type && d.enabled);
}

export function getAllDevices(): Device[] {
  return DEVICES.filter(d => d.enabled);
}
