import { EventType, EventData, EventEmitter } from './interfaces/EventEmitter';

export class SimpleEventEmitter implements EventEmitter {
  private subscriptions: Map<EventType, Array<(data: EventData) => void>> = new Map();

  subscribe(type: EventType, callback: (data: EventData) => void): () => void {
    if (!this.subscriptions.has(type)) {
      this.subscriptions.set(type, []);
    }

    this.subscriptions.get(type)!.push(callback);

    return () => {
      const callbacks = this.subscriptions.get(type);
      if (callbacks) {
        this.subscriptions.set(type, callbacks.filter(cb => cb !== callback));
      }
    };
  }

  emit(type: EventType, data: Partial<EventData>): void {
    const callbacks = this.subscriptions.get(type);
    if (!callbacks) {
      return;
    }

    const eventData: EventData = {
      type,
      timestamp: new Date().toISOString(),
      ...data
    };

    callbacks.forEach(callback => {
      try {
        callback(eventData);
      } catch (error) {
        console.error('Error in event callback:', error);
      }
    });
  }

  clear(): void {
    this.subscriptions.clear();
  }

  getSubscriptionCount(type: EventType): number {
    const callbacks = this.subscriptions.get(type);
    return callbacks ? callbacks.length : 0;
  }
}
