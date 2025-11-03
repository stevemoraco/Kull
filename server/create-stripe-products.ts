import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function createProducts() {
  console.log('Creating Stripe products and prices...\n');
  
  try {
    // Create Professional Product
    console.log('Creating Professional product...');
    const professionalProduct = await stripe.products.create({
      name: 'Kull AI Professional',
      description: 'Unlimited photo ratings with all 5 AI models, universal Mac/iPhone/iPad app, and email support',
    });
    console.log(`✓ Professional product created: ${professionalProduct.id}\n`);

    // Create Professional Annual Price
    console.log('Creating Professional Annual price ($1,188/year)...');
    const professionalAnnual = await stripe.prices.create({
      product: professionalProduct.id,
      unit_amount: 118800, // $1,188 in cents
      currency: 'usd',
      recurring: {
        interval: 'year',
      },
      nickname: 'Professional Annual',
    });
    console.log(`✓ Professional Annual: ${professionalAnnual.id}\n`);

    // Create Professional Monthly Price
    console.log('Creating Professional Monthly price ($99/month)...');
    const professionalMonthly = await stripe.prices.create({
      product: professionalProduct.id,
      unit_amount: 9900, // $99 in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      nickname: 'Professional Monthly',
    });
    console.log(`✓ Professional Monthly: ${professionalMonthly.id}\n`);

    // Create Studio Product
    console.log('Creating Studio product...');
    const studioProduct = await stripe.products.create({
      name: 'Kull AI Studio',
      description: 'Everything in Professional plus priority processing, batch up to 10,000 photos, team collaboration, and priority support',
    });
    console.log(`✓ Studio product created: ${studioProduct.id}\n`);

    // Create Studio Annual Price
    console.log('Creating Studio Annual price ($5,988/year)...');
    const studioAnnual = await stripe.prices.create({
      product: studioProduct.id,
      unit_amount: 598800, // $5,988 in cents
      currency: 'usd',
      recurring: {
        interval: 'year',
      },
      nickname: 'Studio Annual',
    });
    console.log(`✓ Studio Annual: ${studioAnnual.id}\n`);

    // Create Studio Monthly Price
    console.log('Creating Studio Monthly price ($499/month)...');
    const studioMonthly = await stripe.prices.create({
      product: studioProduct.id,
      unit_amount: 49900, // $499 in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      nickname: 'Studio Monthly',
    });
    console.log(`✓ Studio Monthly: ${studioMonthly.id}\n`);

    // Print all Price IDs
    console.log('\n========================================');
    console.log('STRIPE PRICE IDs - Add these to Secrets:');
    console.log('========================================\n');
    console.log(`STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID=${professionalAnnual.id}`);
    console.log(`STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID=${professionalMonthly.id}`);
    console.log(`STRIPE_STUDIO_ANNUAL_PRICE_ID=${studioAnnual.id}`);
    console.log(`STRIPE_STUDIO_MONTHLY_PRICE_ID=${studioMonthly.id}`);
    console.log('\n========================================\n');

  } catch (error: any) {
    console.error('Error creating products:', error.message);
    if (error.type === 'StripeAuthenticationError') {
      console.error('\n⚠️  Stripe authentication failed. Check your STRIPE_SECRET_KEY.');
    }
    process.exit(1);
  }
}

createProducts();
