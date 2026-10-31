-- NYXDRIP: synchronize displayed stock with manually edited Supabase inventory
-- Run only AFTER the 17-product catalog migration and payment-processing migration.
-- No existing orders/profiles/carts are deleted.
-- Inventory.quantity = physical units on hand.
-- Inventory.reserved_quantity = units held by unpaid pending orders.
-- products.stock = units available for sale (quantity minus reserved).

BEGIN;

CREATE OR REPLACE FUNCTION public.nyx_sync_available_stock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.quantity < 0 OR NEW.reserved_quantity < 0 OR
     NEW.reserved_quantity > NEW.quantity THEN
    RAISE EXCEPTION 'Inventory counts must satisfy 0 <= reserved <= quantity';
  END IF;

  UPDATE public.products
  SET stock = NEW.quantity - NEW.reserved_quantity,
      updated_at = now()
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS nyx_inventory_available_stock ON public.inventory;
CREATE TRIGGER nyx_inventory_available_stock
AFTER INSERT OR UPDATE OF quantity, reserved_quantity
ON public.inventory
FOR EACH ROW
EXECUTE FUNCTION public.nyx_sync_available_stock();

-- Only seed missing inventory rows; preserve quantities already entered by owner.
-- New product catalog counts are starting values, not verified physical stock.
INSERT INTO public.inventory (product_id, quantity, reserved_quantity, low_stock_threshold)
SELECT p.id, GREATEST(0, p.stock), 0, 3
FROM public.products p
LEFT JOIN public.inventory i ON i.product_id = p.id
WHERE p.is_active = true AND i.product_id IS NULL
ON CONFLICT (product_id) DO NOTHING;

-- Align displayed stock for any pre-existing inventory rows.
UPDATE public.products p
SET stock = GREATEST(0, i.quantity - i.reserved_quantity),
    updated_at = now()
FROM public.inventory i
WHERE i.product_id = p.id;

COMMIT;

-- Verify values after running:
SELECT p.slug, p.name, p.stock AS available_on_website,
       i.quantity AS physical_quantity, i.reserved_quantity
FROM public.products p
LEFT JOIN public.inventory i ON i.product_id = p.id
WHERE p.is_active = true
ORDER BY p.name;
