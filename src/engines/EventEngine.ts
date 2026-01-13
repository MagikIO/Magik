import { EventEmitter } from 'events';
import consola from 'consola';
import type { ServerEvent, ServerEventMap } from '../types/events';
import type { IEventEngine } from '../types/engines';

/**
 * EventEngine handles server lifecycle events and custom event handling
 *
 * Events are emitted at various points in the server lifecycle:
 * - beforeStart / afterStart - Server startup
 * - beforeStop / afterStop - Server shutdown
 * - routesLoaded - All routes registered
 * - error - Unhandled errors
 * - serverError / serverListening / serverPortError / serverPortInUse - HTTP server events
 *
 * @example
 * ```typescript
 * const eventEngine = new EventEngine(true); // debug mode
 *
 * eventEngine.on('routesLoaded', () => {
 *   console.log('All routes are ready!');
 * });
 *
 * eventEngine.on('error', (error) => {
 *   console.error('Server error:', error);
 * });
 * ```
 */
export class EventEngine implements IEventEngine {
  private emitter: EventEmitter;
  private debug: boolean;
  private handlers = new Map<ServerEvent, Set<(...args: any[]) => void>>();

  constructor(debug = false) {
    this.emitter = new EventEmitter();
    this.debug = debug;
    this.setupDefaultHandlers();
  }

  private setupDefaultHandlers() {
    this.emitter.on('error', (error) => {
      consola.error('[EventEngine] Unhandled error:', error);
    });
  }

  /**
   * Register an event handler with proper type inference
   *
   * @param event - The event name
   * @param handler - The handler function
   * @returns this for chaining
   */
  on<K extends keyof ServerEventMap>(event: K, handler: ServerEventMap[K]): this;
  on(event: ServerEvent, handler: (...args: any[]) => void): this;
  on(event: ServerEvent, handler: (...args: any[]) => void): this {
    const handlers = this.handlers.get(event) || new Set();
    handlers.add(handler);
    this.handlers.set(event, handlers);
    this.emitter.on(event, handler);
    this.debug && consola.info(`[EventEngine] Registered handler for ${event}`);
    return this;
  }

  /**
   * Remove an event handler
   *
   * @param event - The event name
   * @param handler - The handler function to remove
   * @returns this for chaining
   */
  off<K extends keyof ServerEventMap>(event: K, handler: ServerEventMap[K]): this;
  off(event: ServerEvent, handler: (...args: any[]) => void): this;
  off(event: ServerEvent, handler: (...args: any[]) => void): this {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      this.emitter.off(event, handler);
    }
    return this;
  }

  /**
   * Emit an event synchronously
   *
   * @param event - The event name
   * @param args - Arguments to pass to handlers
   * @returns true if the event had listeners
   */
  emit(event: ServerEvent, ...args: unknown[]): boolean {
    this.debug && consola.info(`[EventEngine] Emitting ${event}`);
    return this.emitter.emit(event, ...args);
  }

  /**
   * Emit an event asynchronously, waiting for all handlers to complete
   *
   * @param event - The event name
   * @param args - Arguments to pass to handlers
   */
  async emitAsync(event: ServerEvent, ...args: unknown[]): Promise<void> {
    const handlers = this.handlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          await handler(...args);
        } catch (error) {
          consola.error(`[EventEngine] Error in ${event} handler:`, error);
        }
      }
    }
  }

  /**
   * Remove all handlers for an event or all events
   *
   * @param event - Optional event name. If omitted, clears all handlers
   * @returns this for chaining
   */
  clearHandlers(event?: ServerEvent): this {
    if (event) {
      const handlers = this.handlers.get(event);
      if (handlers) {
        handlers.forEach((handler) => this.emitter.off(event, handler));
        handlers.clear();
      }
    } else {
      this.handlers.forEach((handlers, evt) => {
        handlers.forEach((handler) => this.emitter.off(evt, handler));
        handlers.clear();
      });
      this.handlers.clear();
    }
    return this;
  }

  /**
   * Setup default server event handlers
   */
  public setupServerEventHandlers() {
    this.on('serverPortError', (port: unknown) => {
      consola.error(`Port ${port} requires elevated privileges`);
    });

    this.on('serverPortInUse', (port: unknown) => {
      consola.error(`Port ${port} is already in use`);
    });
  }

  /**
   * Handle server errors and emit appropriate events
   *
   * @param error - The error object
   * @param port - The port the server was trying to bind to
   */
  handleServerError(error: NodeJS.ErrnoException, port: string) {
    if (error.syscall !== 'listen') {
      throw error;
    }

    switch (error.code) {
      case 'EACCES':
        this.emit('serverPortError', port);
        break;
      case 'EADDRINUSE':
        this.emit('serverPortInUse', port);
        break;
      default:
        consola.error(error.message);
        throw error;
    }
  }
}
