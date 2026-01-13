// ============================================================================
// Server Events
// ============================================================================

export type ServerEvent =
  | 'beforeStart'
  | 'afterStart'
  | 'beforeStop'
  | 'afterStop'
  | 'error'
  | 'request'
  | 'response'
  | 'serverError'
  | 'serverListening'
  | 'serverPortError'
  | 'serverPortInUse'
  | 'routesLoaded';

// ============================================================================
// Event Signature Map - Define exact types for each event
// ============================================================================

export interface ServerEventMap {
  beforeStart: () => void;
  afterStart: () => void;
  beforeStop: () => void;
  afterStop: () => void;
  error: (error: Error) => void;
  request: (req: unknown) => void;
  response: (res: unknown) => void;
  serverError: (error: Error) => void;
  serverListening: (address: string | { port: number; family: string; address: string }) => void;
  serverPortError: (port: number) => void;
  serverPortInUse: (port: number) => void;
  routesLoaded: () => void;
}

// ============================================================================
// Server Status
// ============================================================================

export interface ServerStatus {
  readonly ONLINE: 'ONLINE';
  readonly OFFLINE: 'OFFLINE';
  readonly SHUTTING_DOWN: 'SHUTTING_DOWN';
}

export type ServerStatusType = 'ONLINE' | 'OFFLINE' | 'SHUTTING_DOWN' | 'STARTING' | 'ERROR';

// ============================================================================
// Event Handler Types
// ============================================================================

export type EventHandler = (...args: unknown[]) => void | Promise<void>;

export interface EventHandlerMap {
  [event: string]: Set<EventHandler>;
}
