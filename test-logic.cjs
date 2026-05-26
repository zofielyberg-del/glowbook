const { startOfWeek, addDays, format } = require('date-fns');

const salonAvailability = [0, 1, 2, 3, 4, 5, 6].map(dayIndex => ({
    dayIndex,
    startTime: '10:00',
    duration: 540
}));

const schedule = {
    "0": { "slots": [], "active": false },
    "1": { "slots": [{"end": "19:00", "start": "10:00"}], "active": true },
    "2": { "slots": [{"end": "19:00", "start": "10:00"}], "active": true },
    "3": { "slots": [{"end": "19:00", "start": "10:00"}], "active": true },
    "4": { "slots": [{"end": "19:00", "start": "10:00"}], "active": true },
    "5": { "slots": [{"end": "19:00", "start": "10:00"}], "active": true },
    "6": { "slots": [], "active": false }
};

const serviceDuration = 30;
const step = 30;
const allFrames = [];

const now = new Date('2026-05-26T20:00:00Z');
const currentMins = now.getHours() * 60 + now.getMinutes();
const weeksToGenerate = 4;
const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });

function timeToMins(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

function minsToTime(m) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

for (let w = 0; w < weeksToGenerate; w++) {
    const weekStart = addDays(currentWeekStart, w * 7);
    const weekStr = format(weekStart, 'yyyy-MM-dd');

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const currentDate = addDays(weekStart, dayIndex);
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const todayStr = format(now, 'yyyy-MM-dd');

        if (dateStr < todayStr) continue;

        const dayAvailability = salonAvailability.filter(a => a.dayIndex === dayIndex);

        dayAvailability.forEach(frame => {
            const frameStart = timeToMins(frame.startTime);
            const frameEnd = frameStart + frame.duration;

            for (let time = frameStart; time <= frameEnd - serviceDuration; time += step) {
                const startTimeStr = minsToTime(time);
                const startMins = time;
                const endMins = time + serviceDuration;

                if (dateStr === todayStr && startMins < currentMins + 15) continue;

                const dayData = schedule[dayIndex];
                if (!dayData || dayData.active !== true) {
                    continue;
                }

                const slots = dayData.slots || [];
                const isWithinPractitionerSlot = slots.some((slot) => {
                    const pStart = timeToMins(slot.start);
                    const pEnd = timeToMins(slot.end);
                    return (startMins >= pStart && endMins <= pEnd);
                });
                
                if (!isWithinPractitionerSlot) {
                    continue;
                }

                allFrames.push({
                    dateStr,
                    startTimeStr
                });
            }
        });
    }
}

console.log(`Found ${allFrames.length} slots.`);
if (allFrames.length === 0) {
    console.log("No slots found! Logic bug!");
} else {
    console.log("Slots found, the API logic works standalone.");
}
