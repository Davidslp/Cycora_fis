import { AppEventType } from './app-events';

export type EventCallback<T = any> = (payload: T) => void | Promise<void>;

/**
 * EventBus Optimizado:
 * - Evita asignaciones redundantes en microtareas cuando no hay suscriptores asíncronos.
 * - Despacho ultrarrápido con protección de límites de error.
 * - Soporta desuscripción en O(1).
 */
export class EventBus {
  private static instance: EventBus;
  private readonly listeners: Map<AppEventType | string, Set<EventCallback>>;

  private constructor() {
    this.listeners = new Map();
  }

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public subscribe<T>(eventType: AppEventType | string, callback: EventCallback<T>): () => void {
    let callbacks = this.listeners.get(eventType);
    if (!callbacks) {
      callbacks = new Set();
      this.listeners.set(eventType, callbacks);
    }
    callbacks.add(callback);

    // Retorna función de desuscripción O(1)
    return () => {
      callbacks?.delete(callback);
      if (callbacks && callbacks.size === 0) {
        this.listeners.delete(eventType);
      }
    };
  }

  public async publish<T>(eventType: AppEventType | string, payload: T): Promise<void> {
    const callbacks = this.listeners.get(eventType);
    if (!callbacks || callbacks.size === 0) {
      return;
    }

    let asyncPromises: Promise<any>[] | null = null;

    for (const cb of callbacks) {
      try {
        const result = cb(payload);
        // Solo asigna Promise.all si el suscriptor retorna una promesa real
        if (result && typeof (result as any).then === 'function') {
          if (!asyncPromises) asyncPromises = [];
          asyncPromises.push(result as Promise<any>);
        }
      } catch (err) {
        console.error(`[EventBus] Error en suscriptor de ${eventType}:`, err);
      }
    }

    if (asyncPromises && asyncPromises.length > 0) {
      await Promise.all(asyncPromises);
    }
  }

  public clear(): void {
    this.listeners.clear();
  }
}
