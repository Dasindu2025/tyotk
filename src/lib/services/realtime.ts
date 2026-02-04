/**
 * Simple Real-time Event Service
 * 
 * Provides a global event bus for Server-Sent Events (SSE).
 * Includes automatic pruning to prevent memory leaks.
 */

interface RealtimeEvent {
  event: string;
  workspaceId: string;
  userId?: string;
  payload?: any;
  timestamp: string;
}

const MAX_EVENTS = 1000;
const PRUNE_THRESHOLD = 1100;

/**
 * Emit a real-time event that will be picked up by the SSE stream
 */
export function emitRealtimeEvent(
  workspaceId: string,
  eventName: string,
  payload?: any,
  userId?: string
) {
  const bus = (globalThis as any).__realtimeEvents || [];
  
  const newEvent: RealtimeEvent = {
    event: eventName,
    workspaceId,
    userId,
    payload,
    timestamp: new Date().toISOString(),
  };

  bus.push(newEvent);

  // Prune old events if bus gets too large
  if (bus.length > PRUNE_THRESHOLD) {
    // Keep the last MAX_EVENTS
    (globalThis as any).__realtimeEvents = bus.slice(-MAX_EVENTS);
  } else {
    (globalThis as any).__realtimeEvents = bus;
  }
}
