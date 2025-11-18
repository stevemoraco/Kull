#!/bin/bash
cd "$(dirname "$0")"

# Load environment variables
export DATABASE_URL="postgresql://localhost:5432/kull_test"
export SESSION_SECRET="test-secret-key-for-development-only"
export PORT="5000"
export ISSUER_URL="https://replit.com/oidc"
export REPL_ID="kull-test-repl-id-12345"
export STRIPE_SECRET_KEY="sk_test_123"
export STRIPE_WEBHOOK_SECRET="whsec_test_123"
export STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID="price_test_annual"
export STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID="price_test_monthly"
export STRIPE_STUDIO_ANNUAL_PRICE_ID="price_test_studio_annual"
export STRIPE_STUDIO_MONTHLY_PRICE_ID="price_test_studio_monthly"
export VITE_STRIPE_PUBLISHABLE_KEY="pk_test_123"

# Run the dev server
npm run dev
