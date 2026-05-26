import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const apt = await prisma.appointment.findFirst({
    include: {
      salon: {
        include: {
          services: true,
          practitioners: true,
          appointments: true
        }
      }
    }
  });

  if (!apt) {
    console.log('No appointment found');
    return;
  }

  console.log("Appointment:", apt.id, apt.service_name, apt.start_time);
  console.log("Salon:", apt.salon.name, "Tier:", apt.salon.membership_tier);
  console.log("Salon availability:", JSON.stringify(apt.salon.availability, null, 2));
  console.log("Salon practitioners:", apt.salon.practitioners.length);
  apt.salon.practitioners.forEach((p, i) => {
      console.log(`Practitioner ${i} (${p.name}) schedule:`, JSON.stringify(p.schedule, null, 2));
  });
  
  // Also dump a fake fetch request params
  const service = (apt.salon.services || []).find((s: any) => s.name === apt.service_name) || apt.salon.services[0];
  console.log(`\nParams:`);
  console.log(`salonId=${apt.salon_id}`);
  console.log(`serviceId=${service?.id}`);
  console.log(`practitionerId=${apt.practitioner_id || 'any'}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
