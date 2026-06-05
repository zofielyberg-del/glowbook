const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
require('dotenv').config();

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("Testing Prisma query for category: 'Hårvård' with array_contains...");
  const category = 'Hårvård';
  const where = { AND: [] };

  const getCategoryTerms = (cat) => {
    const terms = [cat, cat.toLowerCase(), cat.charAt(0).toUpperCase() + cat.slice(1)];
    const lower = cat.toLowerCase();
    if (lower === 'hårvård' || lower === 'hair' || lower === 'frisör' || lower === 'frisor' || lower.includes('hår')) {
      terms.push('hair', 'hår', 'frisör', 'frisor', 'klippning', 'färgning', 'klipp', 'slingor', 'balayage', 'barber', 'skägg', 'shave', 'barberare');
    }
    return Array.from(new Set(terms));
  };

  const terms = getCategoryTerms(category);
  const orConditions = [];

  terms.forEach(term => {
    const lowerTerm = term.toLowerCase();
    const capitalizedTerm = term.charAt(0).toUpperCase() + term.slice(1);
    orConditions.push(
      // Support simple JSON string matching (string_contains)
      { category: { path: [], string_contains: term } },
      { category: { path: [], string_contains: lowerTerm } },
      { category: { path: [], string_contains: capitalizedTerm } },
      { categories: { path: [], string_contains: term } },
      { categories: { path: [], string_contains: lowerTerm } },
      { categories: { path: [], string_contains: capitalizedTerm } },
      
      // Support JSON array containing value (array_contains)
      { category: { array_contains: term } },
      { category: { array_contains: lowerTerm } },
      { category: { array_contains: capitalizedTerm } },
      { categories: { array_contains: term } },
      { categories: { array_contains: lowerTerm } },
      { categories: { array_contains: capitalizedTerm } },
      
      { services: { some: { category: { equals: term, mode: 'insensitive' } } } }
    );
  });

  where.AND.push({
    OR: orConditions
  });

  const salons = await prisma.salon.findMany({
    where,
    include: {
      services: true
    }
  });

  console.log(`\nFound ${salons.length} salons matching category 'Hårvård':`);
  salons.forEach(s => {
    console.log(`- ${s.name} (Slug: ${s.slug}, Category: ${s.category}, Categories: ${JSON.stringify(s.categories)})`);
  });

  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => console.error(e));
