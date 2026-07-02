require('dotenv').config({ path: '.env' });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function main() {
  const eventId = 'evt_1Tg2hhDSauLEa0sEmq39XoIf';
  const connectedAccountId = 'acct_1TfQd4DSauLEa0sE';
  console.log(`Retrieving event ${eventId} on account ${connectedAccountId}...`);
  try {
    const event = await stripe.events.retrieve(
      eventId,
      {},
      { stripeAccount: connectedAccountId }
    );
    console.log(`ID: ${event.id}`);
    console.log(`Type: ${event.type}`);
    console.log(`Pending Webhooks: ${event.pending_webhooks}`);
    console.log(`Livemode: ${event.livemode}`);
    console.log(`Request details:`, event.request);
    console.log(`Full Event Object:`, JSON.stringify(event, null, 2));
  } catch (err) {
    console.error('Error retrieving event:', err);
  }
}

main();
