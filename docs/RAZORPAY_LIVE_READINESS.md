# NYXDRIP — Razorpay Standard Checkout: LIVE-readiness

This branch implements **real Razorpay order and payment APIs with a Supabase order ledger**. The live payment path is **OFF by default**. It must remain OFF until prerequisites and a real end-to-end test on a business-owned merchant account have passed.

## What was implemented

- `api/create-order.ts`: validates contact/address/cart, calls the existing `public.create_pending_order` Supabase RPC with **server service-role credentials**, creating order snapshots and reserving inventory. Amount and discounts come from the DB, never from customer input. Uses that amount to create a real Razorpay order and stores its provider order ID.
- `api/verify-payment.ts`: checks the Razorpay HMAC-SHA256 checkout signature and the **captured** payment ID, amount and currency against the Supabase order. Checks the guest access token. Calls `public.finalize_paid_order` to mark the order paid and commit inventory atomically.
- `api/razorpay-webhook.ts`: accepts only signed raw-body webhooks, independently rechecks captured payment and amount, finalizes the order idempotently, logs an event. Configure `payment.captured` and `order.paid` events in Razorpay.
- `src/components/checkout/CheckoutView.tsx`: launches Razorpay hosted checkout with server-supplied order ID and amount; only after verified DB finalization displays a genuine confirmation. Does not collect card number or CVV.

The old test gateway remains available under `docs/RAZORPAY_TEST_CHECKOUT.md` for existing historical context, but this new checkout uses the live endpoint only when explicitly activated.

## Critical database requirements

Review and **apply through the trusted Supabase migration workflow** before activating:

- `supabase/migrations/20261001_payment_processing.sql`
- `supabase/migrations/20261003_guest_checkout.sql`

These include the `orders`, `order_items`, `inventory_reservations`, `payment_events` tables, and `create_pending_order`, `finalize_paid_order`, `release_expired_reservations` RPCs. The user may have a database with only four basic tables; do not assume these migrations are already installed. This branch deliberately does **not** create tables from the web frontend. Applying older schema migrations to a populated production database requires review and backup first.

If the database is missing tables/RPCs or RLS is misconfigured, **checkout must remain disabled**. The backend fails closed. Ensure products have correct prices and inventory, and that the DB’s shipping/discount rules match what the website displays.

## Vercel environment variables

Configure server-only environment variables in Vercel (never in source code, never with `VITE_` prefix):

- `RAZORPAY_KEY_ID`: your new, active **live** key ID (`rzp_live_...`)
- `RAZORPAY_KEY_SECRET`: matching live secret
- `RAZORPAY_WEBHOOK_SECRET`: separately generated webhook secret configured with Razorpay
- `SUPABASE_URL`: Supabase project base URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase *service-role* server key. Highly privileged: NEVER expose to browser.
- `RAZORPAY_LIVE_ENABLED`: `false` until all readiness checks pass
- `VITE_RAZORPAY_LIVE_ENABLED`: `false` until all readiness checks pass. This is only a UI display flag.

Only after readiness checks: set both live flags to `true` and redeploy. All backend handlers also require `rzp_live_` keys and service-role configuration.

## Set Razorpay webhook

In the merchant's Razorpay Dashboard, configure a webhook URL:

`https://YOUR_VERIFIED_PRODUCTION_DOMAIN/api/razorpay-webhook`

Choose `payment.captured` and `order.paid` events. Store the *same independently generated webhook secret* in Vercel as `RAZORPAY_WEBHOOK_SECRET`. Do not copy the Razorpay API secret into the webhook secret field. Confirm webhook delivery and retries. Razorpay and Vercel run webhooks server to server and require exact raw request-body signature verification.

## Must-pass checks before collecting customer money

1. Authorized adult/business owner completes Razorpay merchant KYC, payment activation and business compliance.
2. Confirm Vercel Production deployment, API routes and webhook raw-body signature checks work.
3. Confirm production Supabase schema, indexes, and functions exist (and have appropriate permissions).
4. Verify a test/controlled low-value checkout end-to-end with appropriate permission: pending DB record → provider order → captured Razorpay payment → signed webhook → one paid DB order → inventory adjustment.
5. Retry the webhook, verification endpoint and user reload; no duplicate payments or duplicate inventory deduction.
6. Confirm cancellation, failed payment, out-of-stock, coupon, missing credentials, and different browser; no fake paid screen.
7. Confirm secure customer support, refunds, disputes, reconciliation, privacy policy, and fulfilment operations are ready. Fix the existing signup issue separately.

**No live transactions were attempted or verified by ChatGPT.** The integration code is not evidence that real payments are operational. Do not enable live checkout without passing these checks.

## Notes

The current Vercel backend accepts guest checkouts, creating guest orders even for signed-in customers, so customer order history may require additional linking. Existing migrated DB SQL supports guest order token-based retrieval. The checkout currently displays the verified order number immediately; a persistent order lookup UI, refund handling and shipment tracking remain separate workstreams.

No new package is needed; server functions use the Razorpay REST API and official hosted Checkout JS.
