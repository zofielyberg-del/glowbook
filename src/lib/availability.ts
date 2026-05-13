
import { addMinutes, format, isBefore, parse, startOfDay, endOfDay, isAfter, isEqual } from 'date-fns';

export interface TimeSlot {
    time: string; // "HH:mm"
    available: boolean;
    practitionerId?: string;
}

export interface Arbetstid {
    day: number; // 0-6 (Sunday-Saturday)
    start: string; // "HH:mm"
    end: string; // "HH:mm"
    breaks: { start: string, end: string }[];
}

/**
 * Generates available time slots for a specific date, service, and context.
 */
export function generateAvailabilitySlots(
    date: Date,
    serviceDuration: number,
    workingHours: Arbetstid,
    existingBookings: { start: string, duration: number, practitionerId: string }[],
    bufferMinutes: number = 0
): TimeSlot[] {
    const slots: TimeSlot[] = [];
    
    // 1. Get working bounds for the day
    if (date.getDay() !== workingHours.day) return [];

    const dayStart = parse(workingHours.start, 'HH:mm', date);
    const dayEnd = parse(workingHours.end, 'HH:mm', date);

    // 2. Generate slots at e.g. 15 or 30 minute intervals
    // For simplicity, let's use 15-minute start increments
    const interval = 15;
    let current = dayStart;

    while (isBefore(addMinutes(current, serviceDuration), dayEnd) || isEqual(addMinutes(current, serviceDuration), dayEnd)) {
        const timeStr = format(current, 'HH:mm');
        const slotEnd = addMinutes(current, serviceDuration);
        
        // 3. Check if this period overlaps with any breaks
        const isInBreak = workingHours.breaks.some(b => {
            const bStart = parse(b.start, 'HH:mm', date);
            const bEnd = parse(b.end, 'HH:mm', date);
            // Overlap check: (StartA < EndB) && (EndA > StartB)
            return isBefore(current, bEnd) && isAfter(slotEnd, bStart);
        });

        // 4. Check if this period overlaps with any existing bookings
        const isBooked = existingBookings.some(booking => {
            const bStart = parse(booking.start, 'HH:mm', date);
            const bEnd = addMinutes(bStart, booking.duration + bufferMinutes);
            return isBefore(current, bEnd) && isAfter(slotEnd, bStart);
        });

        // 5. Add slot
        slots.push({
            time: timeStr,
            available: !isInBreak && !isBooked
        });

        current = addMinutes(current, interval);
    }

    return slots;
}
