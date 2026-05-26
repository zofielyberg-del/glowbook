import fs from 'fs';

const salonAvailability = [
    {
      "id": "1779562284391.8403",
      "dayIndex": 0,
      "duration": 540,
      "startTime": "10:00"
    },
    {
      "id": "1779562284391.7444",
      "dayIndex": 1,
      "duration": 540,
      "startTime": "10:00"
    },
    {
      "id": "1779562284391.8586",
      "dayIndex": 2,
      "duration": 540,
      "startTime": "10:00"
    },
    {
      "id": "1779562284391.624",
      "dayIndex": 3,
      "duration": 540,
      "startTime": "10:00"
    },
    {
      "id": "1779562284391.3083",
      "dayIndex": 4,
      "duration": 540,
      "startTime": "10:00"
    }
];

const timeToMins = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
};

const minsToTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const serviceDuration = 60;
const step = 30;
const appointments = [];
const appointmentId = "test";

const now = new Date();
const currentMins = now.getHours() * 60 + now.getMinutes();
const currentDayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1;

let allFrames = [];

salonAvailability.forEach((frame) => {
    const frameStart = timeToMins(frame.startTime);
    const frameEnd = frameStart + frame.duration;

    for (let time = frameStart; time <= frameEnd - serviceDuration; time += step) {
        const startTimeStr = minsToTime(time);
        const startMins = time;
        const endMins = time + serviceDuration;

        const hasAptOverlap = appointments.some((apt) => {
            if (apt.dayIndex !== frame.dayIndex) return false;
            if (apt.status === 'cancelled') return false;
            if (apt.id === appointmentId) return false; 
            const aptStart = timeToMins(apt.startTime);
            const aptEnd = aptStart + (apt.duration || 30);
            return (startMins < aptEnd && endMins > aptStart);
        });
        if (hasAptOverlap) continue;

        if (frame.dayIndex === currentDayIdx && startMins < currentMins + 15) continue;

        allFrames.push({
            id: `avail-${frame.id}-${startTimeStr}`,
            startTime: startTimeStr,
            duration: serviceDuration,
            dayIndex: frame.dayIndex,
            practitionerId: 'owner'
        });
    }
});

console.log(`Generated ${allFrames.length} frames.`);
const wednesdayFrames = allFrames.filter(f => f.dayIndex === 2);
console.log(`Wednesday frames: ${wednesdayFrames.length}`);
