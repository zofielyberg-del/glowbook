import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: '.env' });
import { prisma } from '../src/lib/prisma.js';

async function run() {
  console.log('Generating availability for all salons and practitioners...');

  const salons = await prisma.salon.findMany({
    include: { practitioners: true }
  });

  const defaultAvailability = [
    { dayIndex: 0, startTime: '09:00', duration: 480 },
    { dayIndex: 1, startTime: '09:00', duration: 480 },
    { dayIndex: 2, startTime: '09:00', duration: 480 },
    { dayIndex: 3, startTime: '09:00', duration: 480 },
    { dayIndex: 4, startTime: '09:00', duration: 480 },
  ];

  const defaultSchedule = {
    '0': { active: true, slots: [{ start: '09:00', end: '17:00' }], breaks: [] },
    '1': { active: true, slots: [{ start: '09:00', end: '17:00' }], breaks: [] },
    '2': { active: true, slots: [{ start: '09:00', end: '17:00' }], breaks: [] },
    '3': { active: true, slots: [{ start: '09:00', end: '17:00' }], breaks: [] },
    '4': { active: true, slots: [{ start: '09:00', end: '17:00' }], breaks: [] },
    '5': { active: false },
    '6': { active: false }
  };

  for (const salon of salons) {
    await prisma.salon.update({
      where: { id: salon.id },
      data: {
        availability: defaultAvailability,
      }
    });

    for (const practitioner of salon.practitioners) {
      await prisma.practitioner.update({
        where: { id: practitioner.id },
        data: {
          schedule: defaultSchedule
        }
      });
    }

    console.log(`Updated availability for salon: ${salon.name}`);
  }

  console.log('Done!');
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
