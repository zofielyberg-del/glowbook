const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    console.log('Initiating complete factory reset of PostgreSQL database...');
    
    // Delete all dependent child models first
    await prisma.pointTransaction.deleteMany();
    console.log('✓ Cleared point transactions');
    
    await prisma.loyaltyBalance.deleteMany();
    console.log('✓ Cleared loyalty balances');
    
    await prisma.appointment.deleteMany();
    console.log('✓ Cleared appointments');
    
    await prisma.service.deleteMany();
    console.log('✓ Cleared services');
    
    await prisma.practitioner.deleteMany();
    console.log('✓ Cleared practitioners');
    
    // Clear salons
    const deletedSalons = await prisma.salon.deleteMany();
    console.log(`✓ Cleared salons (deleted ${deletedSalons.count})`);
    
    // Clear gift cards
    const deletedGiftCards = await prisma.giftCard.deleteMany();
    console.log(`✓ Cleared gift cards (deleted ${deletedGiftCards.count})`);
    
    // Clear all profiles
    const deletedProfiles = await prisma.profile.deleteMany();
    console.log(`✓ Cleared user profiles (deleted ${deletedProfiles.count})`);
    
    console.log('🎉 COMPLETE DATABASE RESET SUCCESSFUL! All records wiped.');
  } catch (e) {
    console.error('❌ Error clearing database:', e);
  } finally {
    await prisma.$disconnect();
  }
})();
