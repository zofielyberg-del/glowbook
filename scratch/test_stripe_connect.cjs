const Stripe = require('stripe');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function test() {
  console.log("Testing Stripe Connect account creation with key: ", process.env.STRIPE_SECRET_KEY ? "Present (length " + process.env.STRIPE_SECRET_KEY.length + ")" : "MISSING");
  try {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'SE',
      email: 'test@example.com',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
        klarna_payments: { requested: true },
      },
    });
    console.log("Success! Account created:", account.id);
  } catch (err) {
    console.error("❌ Stripe Error:", err.message);
  }
}

test();
