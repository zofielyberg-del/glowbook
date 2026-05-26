# Rescheduling Requirements Architecture

## 1. Customer UX Flow
1. **Initiation**: The customer clicks "Reschedule" on their active booking via their profile or booking confirmation email/page.
2. **Current Details Display**: The system shows the existing booking details (Service, Duration, Provider, Location).
3. **Availability Selection**: 
   - A calendar/time picker is presented. 
   - The system queries the backend to display *only* available slots, dynamically excluding times where the provider is booked and factoring in the service duration.
4. **Temporary Reservation**: When a customer selects a new time, the system places a temporary lock (e.g., a short-lived token or database flag) on the new slot for a short period (e.g., 5-10 minutes) while the customer reviews the changes.
5. **Review & Confirm**: The customer reviews the changes (old time vs. new time, policies).
6. **Confirmation**: Customer confirms the change. The system finalizes the transaction, releases the old slot, confirms the new slot, and triggers email/SMS confirmations. If the customer exits mid-flow, the temporary lock on the new slot expires, and the original booking remains untouched.

## 2. Backend Logic
- **Atomic Transaction**: The core rescheduling action must be wrapped in a database transaction. Either the entire process succeeds, or it fails and rolls back, preventing a state where a customer loses both their old and new slots.
- **Validation**: 
  - Verify minimum notice period (e.g., cannot reschedule less than 24 hours in advance).
  - Verify provider availability for the new slot.
  - Verify the original booking belongs to the authenticated customer.
- **Process Flow**:
  1. Begin Transaction.
  2. Attempt to lock the new slot. If unavailable, rollback and return error.
  3. Update the existing booking record with the new `start_time` and `end_time` (or create a new booking and cancel the old one, depending on audit requirements).
  4. Release the old slot.
  5. Commit Transaction.
  6. Dispatch async events (Email/SMS notifications, calendar sync).

## 3. API Structure

### `GET /api/bookings/:id/reschedule-availability`
- **Query Params**: `date` (YYYY-MM-DD)
- **Response**: List of available time slots for the specific service and provider.

### `POST /api/bookings/:id/lock-slot`
- **Body**: `{ newStartTime, newEndTime }`
- **Response**: `{ lockToken, expiresAt }`
- **Purpose**: Temporarily reserve the new time slot during the checkout/review phase.

### `POST /api/bookings/:id/reschedule`
- **Body**: `{ newStartTime, newEndTime, lockToken }`
- **Response**: `{ success: true, booking: { ...updatedBookingDetails } }`
- **Purpose**: Finalize the rescheduling.

## 4. Database Considerations
- **Transactions**: Use ACID-compliant transactions (e.g., Prisma `$transaction`).
- **Concurrency Control**: Use optimistic locking (e.g., a `version` field on the provider's availability or booking record) or row-level locking (`SELECT ... FOR UPDATE`) to prevent double-booking if two users try to grab the same new slot simultaneously.
- **Audit Trail**: Instead of simply overwriting the old time, consider keeping a `BookingHistory` table or tracking the `previous_start_time` and `status` to maintain a log of changes.

## 5. Edge Cases
- **Customer abandons the flow**: The temporary lock expires. A cron job or Redis TTL automatically frees the locked slot. The original booking is never touched.
- **Provider gets booked by someone else manually (Race Condition)**: The transaction will fail during the lock/commit phase. The user is informed that the slot is no longer available and must choose another.
- **Service duration changes**: If the rescheduling allows changing services (partial rescheduling), the engine must recalculate the required blocks dynamically.
- **Minimum Notice Period violations**: An admin might override this, but standard users must be blocked by the backend validation.

## 6. State Handling
- **Frontend State**: Keep the original booking state untouched until a `200 OK` is received from the final `POST /reschedule` endpoint.
- **Backend State**: 
  - `CONFIRMED`: Original booking state.
  - `LOCKED`: Temporary state for the new slot (if stored as a separate entity).
  - `RESCHEDULED`: The final state of the old slot (if creating a new record) or an audit state.

## 7. Realtime Synchronization Strategy
- **WebSockets / Server-Sent Events (SSE)**: When a slot is locked or successfully rescheduled, broadcast an event to other active clients (e.g., `slot_locked`, `slot_freed`) so their UI updates immediately and greys out the taken slot.
- **Provider Calendars**: Integrate with Google Calendar/Outlook APIs using webhooks. The successful transaction should enqueue a background job to update the external calendars.

## 8. Pseudocode for Safe Rescheduling Flow

```javascript
async function rescheduleBooking(bookingId, newStartTime, newEndTime, customerId) {
  // 1. Pre-validation
  const booking = await db.bookings.findById(bookingId);
  if (booking.customerId !== customerId) throw new Error("Unauthorized");
  if (isWithinNoticePeriod(booking.startTime)) throw new Error("Too late to reschedule");

  // 2. Start Transaction
  return await db.transaction(async (tx) => {
    // 3. Lock rows to prevent race conditions
    // Using pessimistic locking for the provider's schedule
    const provider = await tx.providers.findUnique({
      where: { id: booking.providerId },
      // SELECT ... FOR UPDATE
      lock: { mode: 'pessimistic_write' } 
    });

    // 4. Check new availability
    const isAvailable = await checkAvailability(tx, provider.id, newStartTime, newEndTime);
    if (!isAvailable) {
      throw new Error("Slot is no longer available");
    }

    // 5. Update the booking (or create new & cancel old)
    const updatedBooking = await tx.bookings.update({
      where: { id: bookingId },
      data: {
        startTime: newStartTime,
        endTime: newEndTime,
        rescheduledAt: new Date(),
        status: 'CONFIRMED'
      }
    });

    // 6. Audit Log
    await tx.bookingHistory.create({
      data: {
        bookingId: booking.id,
        action: 'RESCHEDULE',
        oldStartTime: booking.startTime,
        newStartTime: newStartTime
      }
    });

    return updatedBooking;
  });
}
```
