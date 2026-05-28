import { EventEmitter } from 'events';
import type { AvailabilityPayload } from '../types/realtime';

// Singleton event emitter used for server‑side broadcasts
const realtimeEmitter = new EventEmitter();

/**
 * Emit an availability update for a specific salon.
 * The payload can be extended in the future – currently we only send a flag
 * indicating that the availability data should be refreshed.
 */
export const emitAvailabilityUpdate = (salonId: string, payload: AvailabilityPayload) => {
  realtimeEmitter.emit(`availability:${salonId}`, payload);
};

/**
 * Return the underlying emitter – used by the SSE endpoint to listen for
 * events. Consumers should not mutate the emitter directly.
 */
export const getRealtimeEmitter = () => realtimeEmitter;
