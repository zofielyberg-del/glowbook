require('dotenv').config({ path: '.env' });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function main() {
  const connectedAccountId = 'acct_1TfQd4DSauLEa0sE';
  console.log(`Fetching latest 10 Stripe events for connected account ${connectedAccountId}...`);
  try {
    const events = await stripe.events.list(
      { limit: 10 },
      { stripeAccount: connectedAccountId }
    );

    for (const event of events.data) {
      console.log(`ID: ${event.id}`);
      console.log(`Type: ${event.type}`);
      console.log(`Created: ${new Date(event.created * 1000).toISOString()}`);
      
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        console.log(`Session ID: ${session.id}`);
        console.log(`Payment Status: ${session.payment_status}`);
        console.log(`Metadata:`, session.metadata);
      }
      console.log('-----------------------------------');
    }
  } catch (err) {
    console.error('Error fetching connected account events:', err);
  }
}

main();
