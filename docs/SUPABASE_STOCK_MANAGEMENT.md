# NYXDRIP: live stock management from Supabase

This branch adds the two late products to the seeded catalog:
- `chrome-earbuds-c-type` — Chrome Earbuds (C Type), catalog ₹499
- `chrome-silver-rimless-glass` — Chrome Silver Rimless Glass, catalog ₹599

Both products already existed in `src/data/products.ts`, but were **not** included in the old 15-product Supabase SQL seed. The updated seed now has 17 items. Confirm the intended name of the sunglasses and actual prices before running or publishing.

## Database order of operations

The deployed database currently has only `products`, `inventory`, `carts`, `cart_items`, `profiles` and no product/inventory rows. Do not activate live payments.

1. Review and execute `supabase/migrations/20261004_update_client_confirmed_prices.sql` (updated to 17 products) ONLY if the quoted prices/products are accurate and you approve updating catalog fields. The SQL adds missing `products` columns such as `is_active`, `images`, `is_new_arrival`.
2. Review/apply `supabase/migrations/20261001_payment_processing.sql` (order tables, inventory reservation), then `supabase/migrations/20261003_guest_checkout.sql` for the existing real payment PR.
3. Review and execute `supabase/migrations/20261031_inventory_stock_sync.sql` **last**. It inserts zero-valued inventory records for newly added products (until physically counted), preserves all existing inventory counts, then synchronizes `products.stock`. It adds a trigger so future inventory edits propagate immediately to `products.stock`.

## How the shop owner updates stock

Supabase Dashboard → Database → Tables → public.inventory.

For each product ID:
- Set `quantity` to the physical on-hand number of units. Use a nonnegative whole number.
- Keep `reserved_quantity` as managed by the checkout's reservation system. **Do not manually edit reserved_quantity**.
- `low_stock_threshold` can be 3; current UI uses 3.
- Save. The database trigger updates `public.products.stock = quantity - reserved_quantity`.
- Website refreshes catalog every ~30 seconds while visible, also on browser focus and visibility changes. Reload to check immediately.

Displayed stock badges:
- `0` available: **Out of Stock**, Add to Bag and Buy Now disabled.
- `1-3` available: **Only X Left**, can purchase up to available units.
- `4+` available: **In Stock**.

The server must check stock again and reserve it when creating a pending paid order. UI badges and page polling alone do not prevent overselling. No orders are being collected while merchant/database readiness is incomplete.

## Quick read-only check
```sql
SELECT p.slug,p.name,p.price,p.stock AS available_stock,
       i.quantity AS on_hand,i.reserved_quantity
FROM public.products p
LEFT JOIN public.inventory i ON i.product_id=p.id
WHERE p.is_active=true
ORDER BY p.name;
```

The site must be able to read active product rows under Supabase RLS. A configured Supabase connection without a readable catalog now shows local products as sold out rather than showing fake available stock. The user must not turn on live payments until real merchant approval, order schema, and verification tests are complete.
