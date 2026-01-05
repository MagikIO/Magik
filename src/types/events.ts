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
// Server Status
// ============================================================================

export interface ServerStatus {
  readonly ONLINE: 'ONLINE';
  readonly OFFLINE: 'OFFLINE';
  readonly SHUTTING_DOWN: 'SHUTTING_DOWN';
}

export type ServerStatusType = 'ONLINE' | 'OFFLINE' | 'SHUTTING_DOWN';

// ============================================================================
// Event Handler Types
// ============================================================================

export type EventHandler = (...args: unknown[]) => void | Promise<void>;

export interface EventHandlerMap {
  [event: string]: Set<EventHandler>;
}
