# NYXDRIP Razorpay hosted checkout — TEST-ONLY preview

This branch adds a Vercel API backend for Razorpay Standard Checkout. **It is not a production checkout or an order fulfilment system.**

## Vercel Preview environment variables

Set in Vercel Project → Settings → Environment Variables. Configure **Preview only** while testing:

- `RAZORPAY_KEY_ID`: new Razorpay **test** key ID (`rzp_test_...`)
- `RAZORPAY_KEY_SECRET`: corresponding **regenerated** test key secret, server-only
- `RAZORPAY_TEST_MODE_ENABLED`: `true` (server-side gate)
- `VITE_RAZORPAY_TEST_MODE_ENABLED`: `true` (client-side test UI gate)
- `VITE_SUPABASE_URL`: existing Supabase base URL with **no /rest/v1 suffix**
- `VITE_SUPABASE_PUBLISHABLE_KEY`: existing public Supabase key

**Never** set `RAZORPAY_TEST_MODE_ENABLED=true` with `rzp_live_` credentials. The server enforces a `rzp_test_` key prefix. Do not expose `RAZORPAY_KEY_SECRET` through any `VITE_` variable or commit `.env` files.

Rotate the test key that was previously posted in a chat before enabling this preview.

## Included routes

- `POST /api/create-order` validates a limited cart, fetches product prices and stock from public Supabase products, computes shipping on the server, then creates a Razorpay **test** order.
- `POST /api/verify-payment` validates the HMAC signature and fetches payment and order details from Razorpay, requiring the payment to be **captured**.

The customer checkout opens official Razorpay hosted checkout and uses only these API routes. It does not collect card numbers/CVVs, mark an order paid, clear the cart, or dispatch anything.

## How to test

1. Deploy the pull request as a **Vercel Preview** deployment. Keep the production env switch disabled.
2. Confirm the site's product catalog is publicly readable in Supabase. Any RLS issue will prevent test order creation (fail closed).
3. Open the preview, add a valid in-stock product, enter the shipping address, and click **Open Razorpay Test Checkout**.
4. Complete a **Razorpay Test Mode** payment using Razorpay's official test methods. Verify that the UI reports test verification.
5. Check the corresponding test payment/order in the Razorpay Test Dashboard.
6. Test cancellation, payment failure, an invalid signature, and missing test configuration. None should show an order as paid.

## Important limitations before Live Mode

- No pending order / order items record is created in Supabase; **the test order cannot be fulfilled**.
- No server-side coupon or variant pricing; coupons are rejected.
- No stock reservation or inventory deduction.
- No Razorpay webhook processing, idempotent paid-order finalization, reconciliation, refunds, shipping, or fulfillment tracking in this Vercel flow.
- Checkout is publicly reachable while enabled in test mode; use Razorpay Test Mode only.
- Existing Supabase Edge Function Razorpay code is still present in the repository but is not used by this branch. Do not enable two payment paths simultaneously.
- The previous signup/login `Invalid URL Path` issue is separate and still needs testing.

**Do not activate Razorpay Live Mode or accept real customer payments until a trusted Supabase orders schema and server-side transaction ledger are implemented, secured, and tested.**

This branch intentionally does not require a `razorpay` npm package; it calls the official REST API server-to-server and uses the official hosted checkout.js script.
