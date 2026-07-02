require('dotenv').config({ path: '.env' });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function main() {
  console.log('Fetching all Stripe webhook endpoints (raw)...');
  try {
    const endpoints = await stripe.webhookEndpoints.list();
    console.log(JSON.stringify(endpoints.data, null, 2));
  } catch (err) {
    console.error('Error fetching webhooks:', err);
  }
}

main();
