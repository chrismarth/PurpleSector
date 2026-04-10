// ── Summaries (no relations, just scalars + parent FK) ──

export interface EventSummary {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

export interface SessionSummary {
  id: string;
  eventId: string;
  name: string;
  source: string;
  status: string;
  started: boolean;
  tags: string | null;
  createdAt: string;
  lapCount: number;
}

export interface LapSummary {
  id: string;
  sessionId: string;
  lapNumber: number;
  lapTime: number | null;
  analyzed?: boolean;
  tags?: string | null;
}

// ── Full types (extend summary, relate to summary children) ──

export interface Event extends EventSummary {
  sessions?: SessionSummary[];
}

export interface Session extends SessionSummary {
  event?: EventSummary;
  laps?: LapSummary[];
  vehicle?: Vehicle;
  vehicleConfiguration?: VehicleConfiguration;
  vehicleSetup?: VehicleSetup;
  plotConfigs?: string | null;
}

export interface Lap extends LapSummary {
  driverComments?: string | null;
  suggestions?: string | null;
  plotConfigs?: string | null;
  session?: SessionSummary;
  chatMessages?: ChatMessage[];
}

// ── Vehicle types (leaf entities, no summary variant) ──

export interface Vehicle {
  id: string;
  name: string;
  description?: string | null;
  inServiceDate?: string | null;
  outOfServiceDate?: string | null;
  tags?: string | null;
  createdAt?: string;
  configurations?: VehicleConfiguration[];
  setups?: VehicleSetup[];
}

export interface VehicleConfiguration {
  id: string;
  name: string;
  description?: string | null;
  parts: string;
  createdAt?: string;
  vehicle?: Vehicle;
  setups?: VehicleSetup[];
}

export interface VehicleSetup {
  id: string;
  name: string;
  description?: string | null;
  parameters: string;
  createdAt?: string;
  vehicle?: Vehicle;
  vehicleConfiguration?: VehicleConfiguration | null;
}

export interface ChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

export const DEFAULT_SESSION_TAGS = [
  'Testing',
  'Practice',
  'Qualifying',
  'Race',
  'Setup Development',
  'Baseline',
  'Wet Weather',
  'Dry Weather',
];

export const DEFAULT_LAP_TAGS = [
  'Qualifying',
  'Race Pace',
  'Cool Down',
  'Full Fuel',
  'Low Fuel',
  'New Tires',
  'Worn Tires',
  'Setup A',
  'Setup B',
  'Baseline',
  'Wet',
  'Dry',
];

