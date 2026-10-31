# NYXDRIP: reconcile actual Supabase schema (2026-10-31)

**Observed live public schema** (provided by site owner):

- `products` columns: id(uuid), slug, name, price, original_price, category, description, style, stock, created_at, updated_at. **Zero rows**.
- `inventory`: product_id, quantity, reserved_quantity, low_stock_threshold, updated_at. **Zero rows**.
- `carts`: id, user_id, created_at, updated_at.
- `cart_items`: id, cart_id, product_key, product_id, quantity, created_at, updated_at.
- `profiles`: id, email, role, created_at.

This database is **NOT** ready to accept any payment. The existing GitHub SQL files were not necessarily run, and cannot be blindly applied because existing schema details (defaults, indexes, constraints, policies) must be confirmed.

## Read-only preflight query (run first in Supabase SQL Editor)

```sql
SELECT table_name, column_name, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name IN ('products','inventory','carts','cart_items','profiles')
ORDER BY table_name, ordinal_position;

SELECT table_name, constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema='public'
  AND table_name IN ('products','inventory','carts','cart_items','profiles')
ORDER BY table_name, constraint_name;
```

**Keep the feature flags OFF:** `RAZORPAY_LIVE_ENABLED=false` and `VITE_RAZORPAY_LIVE_ENABLED=false`.

## Proposed migration sequence after preflight, backup, and review

1. Inspect `supabase/migrations/20261004_update_client_confirmed_prices.sql`: adds product columns (`is_active`, `images`, etc.) and **upserts 15 product rows**. This changes catalog/price data, so verify the prices and product identifiers before running. Existing `products.id` must have a UUID default or an explicit insert ID. Avoid running the catalog upsert if the live catalog should not be altered.
2. `supabase/migrations/20261001_payment_processing.sql`: creates payment ledger tables and functions. Review constraints/RLS and all migration statements on the current database.
3. `supabase/migrations/20261003_guest_checkout.sql`: adds guest order details and replaces `create_pending_order` to allow guest cart lines. Requires payment migration first. Review `CREATE OR REPLACE FUNCTION` signature and existing overloads.
4. Initialize an `inventory` row for each active product using its real warehouse stock (not guessed values). Example **after verifying physical stock**:
   ```sql
   INSERT INTO public.inventory(product_id, quantity, reserved_quantity, low_stock_threshold)
   SELECT id, stock, 0, 5
   FROM public.products
   WHERE is_active=true AND stock > 0
   ON CONFLICT (product_id) DO NOTHING;
   ```
5. Confirm `products.slug` has a unique index, `products.id` a UUID default, `orders`/items/reservations/event tables exist, RLS blocks unauthorized writes, and payment RPC grants are service-role only.

## Important application alignment

The frontend's local `prod-...` product IDs are **not** UUIDs. PR #3 now sends `product.slug` for the guest-order RPC to resolve against `public.products.slug`.

The checkout must use only server-calculated totals, with server-side provider verification and successful DB finalize before showing Paid. No live payments, test transactions, or database migrations were executed by ChatGPT.
