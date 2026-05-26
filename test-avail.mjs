import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const apt = await prisma.appointment.findFirst({
    include: {
      salon: {
        include: {
          services: true,
          practitioners: true
        }
      }
    }
  });

  if (!apt) {
    console.log('No appointment found');
    return;
  }

  const service = apt.salon.services.find(s => s.name === apt.service_name);
  const serviceId = apt.service_id || service?.id;
  const practitionerId = apt.practitioner_id || 'any';
  
  console.log(`salonId=${apt.salon_id}`);
  console.log(`serviceId=${serviceId}`);
  console.log(`practitionerId=${practitionerId}`);
  console.log(`excludeAppointmentId=${apt.id}`);
  console.log(`salon tier = ${apt.salon.membership_tier}`);
  console.log(`salon practitioners = ${apt.salon.practitioners.length}`);
  if (apt.salon.practitioners.length > 0) {
      console.log(`practitioner 0 schedule:`, JSON.stringify(apt.salon.practitioners[0].schedule, null, 2));
  }

  const res = await fetch(`http://localhost:3000/api/availability?salonId=${apt.salon_id}&serviceId=${serviceId}&practitionerId=${practitionerId}&excludeAppointmentId=${apt.id}`);
  const data = await res.json();
  console.log(`Availability slots found:`, data.availability?.length);
  if (data.error) console.log(`Error:`, data.error);
}

main().catch(console.error).finally(() => prisma.$disconnect());
