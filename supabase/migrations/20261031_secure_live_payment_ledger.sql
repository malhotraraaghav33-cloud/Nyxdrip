-- NYXDRIP: server-only order ledger for Razorpay; never marks a payment paid
-- without a verified captured provider payment. Keeps existing catalog intact.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SEQUENCE IF NOT EXISTS public.nyx_order_seq START WITH 1001;

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  order_number text UNIQUE NOT NULL DEFAULT ('NYX-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.nyx_order_seq')::text,6,'0')),
  customer_email text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  guest_access_token text NOT NULL DEFAULT encode(gen_random_bytes(24),'hex'),
  subtotal numeric(12,2) NOT NULL CHECK(subtotal>=0),
  discount numeric(12,2) NOT NULL DEFAULT 0 CHECK(discount>=0),
  shipping numeric(12,2) NOT NULL DEFAULT 0 CHECK(shipping>=0),
  tax numeric(12,2) NOT NULL DEFAULT 0 CHECK(tax>=0),
  total numeric(12,2) NOT NULL CHECK(total>=1),
  currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'),
  coupon_code text,
  payment_provider text NOT NULL DEFAULT 'razorpay' CHECK(payment_provider='razorpay'),
  payment_status text NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending','paid','cancelled','failed','refunded')),
  order_status text NOT NULL DEFAULT 'pending' CHECK(order_status IN ('pending','confirmed','processing','shipped','delivered','cancelled')),
  provider_order_id text UNIQUE,
  provider_payment_id text UNIQUE,
  charged_amount numeric(12,2),
  charged_currency text DEFAULT 'INR',
  idempotency_key text NOT NULL,
  cart_fingerprint text,
  shipping_address jsonb NOT NULL,
  delivery_method text NOT NULL CHECK(delivery_method IN ('standard','express')),
  paid_at timestamptz,
  needs_attention boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(customer_email,idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name_snapshot text NOT NULL,
  product_slug text NOT NULL,
  price_snapshot numeric(12,2) NOT NULL CHECK(price_snapshot>=0),
  quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 10),
  selected_variant text DEFAULT 'Standard',
  product_image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id,product_id)
);

CREATE TABLE IF NOT EXISTS public.inventory_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 10),
  status text NOT NULL CHECK(status IN ('reserved','released','committed')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id,product_id)
);

CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  order_id uuid REFERENCES public.orders(id),
  payload jsonb,
  processed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider,provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_nyx_pending_reservations ON public.inventory_reservations(status,expires_at);
CREATE INDEX IF NOT EXISTS idx_nyx_orders_created ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nyx_orders_email ON public.orders(customer_email);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- No public policies: public/guest users cannot read or write payment records.
REVOKE ALL ON TABLE public.orders,public.order_items,public.inventory_reservations,public.payment_events FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.orders,public.order_items,public.inventory_reservations,public.payment_events TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.nyx_order_seq TO service_role;

CREATE OR REPLACE FUNCTION public.release_expired_reservations()
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v record; affected integer:=0;
BEGIN
 FOR v IN
   SELECT r.id AS reservation_id,r.product_id,r.quantity,r.order_id
   FROM public.inventory_reservations r JOIN public.orders o ON o.id=r.order_id
   WHERE r.status='reserved' AND r.expires_at < now() AND o.payment_status='pending'
   ORDER BY r.product_id FOR UPDATE OF r
 LOOP
   UPDATE public.inventory_reservations SET status='released' WHERE id=v.reservation_id AND status='reserved';
   UPDATE public.inventory SET reserved_quantity=reserved_quantity-v.quantity
     WHERE product_id=v.product_id AND reserved_quantity>=v.quantity;
   UPDATE public.orders SET order_status='cancelled',payment_status='cancelled',updated_at=now(),
       notes='Unpaid reservation expired; any late captured payment requires reconciliation'
     WHERE id=v.order_id AND payment_status='pending';
   affected:=affected+1;
 END LOOP;
 RETURN affected;
END $$;

CREATE OR REPLACE FUNCTION public.create_pending_order(
 p_user_id uuid DEFAULT NULL,
 p_provider text DEFAULT 'razorpay',
 p_idempotency_key text DEFAULT NULL,
 p_coupon_code text DEFAULT NULL,
 p_shipping_address jsonb DEFAULT '{}'::jsonb,
 p_delivery_method text DEFAULT 'standard',
 p_charged_currency text DEFAULT 'INR',
 p_guest_email text DEFAULT NULL,
 p_guest_name text DEFAULT NULL,
 p_guest_phone text DEFAULT NULL,
 p_items jsonb DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_line jsonb; v_p public.products%ROWTYPE; v_i public.inventory%ROWTYPE;
  v_slug text; v_qty integer; v_variant text;
  v_subtotal numeric(12,2):=0; v_discount numeric(12,2):=0;
  v_shipping numeric(12,2); v_total numeric(12,2);
  v_lines jsonb:='[]'::jsonb;
  v_coupon text:=upper(trim(coalesce(p_coupon_code,'')));
BEGIN
 IF p_provider <> 'razorpay' OR p_charged_currency <> 'INR' OR p_delivery_method NOT IN ('standard','express')
    OR p_user_id IS NOT NULL THEN RAISE EXCEPTION 'CHECKOUT_UNSUPPORTED'; END IF;
 IF p_guest_email IS NULL OR length(p_guest_email)>254 OR p_guest_email !~* '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$'
    OR length(trim(coalesce(p_guest_name,''))) < 2 OR length(p_guest_name)>120
    OR coalesce(p_guest_phone,'') !~ '^[0-9]{10}$'
    OR p_idempotency_key IS NULL OR p_idempotency_key !~ '^[A-Za-z0-9_-]{12,90}$'
    OR jsonb_typeof(p_shipping_address)<>'object' THEN
    RAISE EXCEPTION 'CHECKOUT_INVALID_CUSTOMER';
 END IF;
 IF jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items)<1 OR jsonb_array_length(p_items)>20 THEN
    RAISE EXCEPTION 'CHECKOUT_INVALID_CART';
 END IF;

 PERFORM pg_advisory_xact_lock(hashtextextended(lower(trim(p_guest_email))||':'||p_idempotency_key,0));
 SELECT * INTO v_order FROM public.orders
 WHERE customer_email=lower(trim(p_guest_email)) AND idempotency_key=p_idempotency_key FOR UPDATE;
 IF v_order.id IS NOT NULL THEN
   RETURN jsonb_build_object('order_id',v_order.id,'order_number',v_order.order_number,
       'guest_access_token',v_order.guest_access_token,'total',v_order.total,
       'provider_order_id',v_order.provider_order_id,'payment_status',v_order.payment_status,
       'is_existing',true);
 END IF;

 PERFORM public.release_expired_reservations();

 FOR v_line IN SELECT value FROM jsonb_array_elements(p_items) AS t(value) ORDER BY value->>'product_id'
 LOOP
   v_slug:=v_line->>'product_id';
   IF v_slug IS NULL OR v_slug !~ '^[a-z0-9-]{1,90}$'
      OR coalesce(v_line->>'quantity','') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'CHECKOUT_INVALID_ITEM'; END IF;
   v_qty:=(v_line->>'quantity')::integer;
   v_variant:=coalesce(nullif(trim(v_line->>'selectedVariant'),''),'Standard');
   IF v_qty<1 OR v_qty>10 OR length(v_variant)>90 THEN RAISE EXCEPTION 'CHECKOUT_INVALID_QUANTITY'; END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_lines) AS x WHERE x->>'slug'=v_slug) THEN
      RAISE EXCEPTION 'CHECKOUT_DUPLICATE_ITEM';
   END IF;

   SELECT * INTO v_p FROM public.products WHERE slug=v_slug AND is_active=true AND price>0 FOR UPDATE;
   IF v_p.id IS NULL THEN RAISE EXCEPTION 'CHECKOUT_PRODUCT_UNAVAILABLE'; END IF;
   SELECT * INTO v_i FROM public.inventory WHERE product_id=v_p.id FOR UPDATE;
   IF v_i.product_id IS NULL OR v_i.quantity-v_i.reserved_quantity<v_qty THEN
      RAISE EXCEPTION 'CHECKOUT_OUT_OF_STOCK';
   END IF;

   v_subtotal:=v_subtotal+round(v_p.price,2)*v_qty;
   v_lines:=v_lines || jsonb_build_array(jsonb_build_object('id',v_p.id,'slug',v_p.slug,
     'name',v_p.name,'unit_price',round(v_p.price,2),'qty',v_qty,'variant',v_variant,
     'image',coalesce(v_p.images[1],'')));
 END LOOP;

 IF v_coupon<>'' THEN
   IF v_coupon='NYX10' AND v_subtotal>=499 THEN v_discount:=round(v_subtotal*0.10,2);
   ELSIF v_coupon='DRIP20' AND v_subtotal>=1499 THEN v_discount:=round(v_subtotal*0.20,2);
   ELSIF v_coupon='CYBER15' AND v_subtotal>=999 THEN v_discount:=round(v_subtotal*0.15,2);
   ELSE RAISE EXCEPTION 'CHECKOUT_COUPON_INVALID'; END IF;
 END IF;

 v_shipping:=CASE WHEN v_subtotal>=999 THEN 0 ELSE 99 END;
 IF p_delivery_method='express' THEN v_shipping:=v_shipping+150; END IF;
 v_total:=round(v_subtotal-v_discount+v_shipping,2);
 IF v_total<1 OR v_total>200000 THEN RAISE EXCEPTION 'CHECKOUT_AMOUNT_OUT_OF_RANGE'; END IF;

 INSERT INTO public.orders (customer_email,customer_name,customer_phone,
   subtotal,discount,shipping,tax,total,coupon_code,idempotency_key,shipping_address,delivery_method,
   charged_amount,charged_currency,cart_fingerprint)
 VALUES (lower(trim(p_guest_email)),trim(p_guest_name),p_guest_phone,
   v_subtotal,v_discount,v_shipping,0,v_total,nullif(v_coupon,''),p_idempotency_key,
   p_shipping_address,p_delivery_method,v_total,'INR',md5(v_lines::text))
 RETURNING * INTO v_order;

 FOR v_line IN SELECT value FROM jsonb_array_elements(v_lines) AS t(value)
 LOOP
   INSERT INTO public.order_items(order_id,product_id,product_name_snapshot,product_slug,
     price_snapshot,quantity,selected_variant,product_image)
   VALUES(v_order.id,(v_line->>'id')::uuid,v_line->>'name',v_line->>'slug',
     (v_line->>'unit_price')::numeric,(v_line->>'qty')::integer,v_line->>'variant',v_line->>'image');

   UPDATE public.inventory
     SET reserved_quantity=reserved_quantity+(v_line->>'qty')::integer
   WHERE product_id=(v_line->>'id')::uuid;

   INSERT INTO public.inventory_reservations(order_id,product_id,quantity,status,expires_at)
   VALUES(v_order.id,(v_line->>'id')::uuid,(v_line->>'qty')::integer,'reserved',now()+interval '30 minutes');
 END LOOP;

 RETURN jsonb_build_object('order_id',v_order.id,'order_number',v_order.order_number,
   'guest_access_token',v_order.guest_access_token,'total',v_total,
   'payment_status','pending','is_existing',false);
END $$;

CREATE OR REPLACE FUNCTION public.finalize_paid_order(
  p_order_id uuid,p_provider text,p_provider_payment_id text,p_amount numeric,p_currency text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_order public.orders%ROWTYPE; r record; inv record;
BEGIN
 SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
 IF v_order.id IS NULL OR p_provider<>'razorpay' OR p_currency<>'INR'
   OR p_provider_payment_id IS NULL OR p_provider_payment_id !~ '^pay_[A-Za-z0-9]+$'
   OR round(p_amount,2)<>v_order.total THEN
    RAISE EXCEPTION 'PAYMENT_FINALIZE_MISMATCH';
 END IF;
 IF v_order.payment_status='paid' THEN
   IF v_order.provider_payment_id<>p_provider_payment_id THEN RAISE EXCEPTION 'PAYMENT_ALREADY_PAID_WITH_DIFFERENT_ID'; END IF;
   RETURN jsonb_build_object('success',true,'order_id',v_order.id,'order_number',v_order.order_number,'already_paid',true);
 END IF;
 IF v_order.provider_order_id IS NULL OR v_order.payment_status NOT IN ('pending','cancelled') THEN
    RAISE EXCEPTION 'PAYMENT_FINALIZE_INVALID_ORDER_STATE';
 END IF;

 FOR r IN SELECT * FROM public.inventory_reservations WHERE order_id=v_order.id ORDER BY product_id FOR UPDATE
 LOOP
   SELECT * INTO inv FROM public.inventory WHERE product_id=r.product_id FOR UPDATE;
   IF r.status='reserved' THEN
     IF inv.quantity<r.quantity OR inv.reserved_quantity<r.quantity THEN
       RAISE EXCEPTION 'PAYMENT_RESERVED_STOCK_INCONSISTENT';
     END IF;
     UPDATE public.inventory SET quantity=quantity-r.quantity,reserved_quantity=reserved_quantity-r.quantity
       WHERE product_id=r.product_id;
     UPDATE public.inventory_reservations SET status='committed' WHERE id=r.id;
   ELSIF r.status='released' THEN
     IF inv.quantity-inv.reserved_quantity>=r.quantity THEN
       UPDATE public.inventory SET quantity=quantity-r.quantity WHERE product_id=r.product_id;
       UPDATE public.inventory_reservations SET status='committed' WHERE id=r.id;
     ELSE
       UPDATE public.orders SET needs_attention=true,
         notes='Late verified capture after stock reservation released: manual fulfillment/refund required'
       WHERE id=v_order.id;
     END IF;
   END IF;
 END LOOP;

 UPDATE public.orders SET payment_status='paid',order_status='confirmed',
   provider_payment_id=p_provider_payment_id,paid_at=now(),updated_at=now()
 WHERE id=v_order.id;

 RETURN jsonb_build_object('success',true,'order_id',v_order.id,
   'order_number',v_order.order_number,'already_paid',false);
END $$;

REVOKE ALL ON FUNCTION public.release_expired_reservations() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.create_pending_order(uuid,text,text,text,jsonb,text,text,text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.finalize_paid_order(uuid,text,text,numeric,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.release_expired_reservations() TO service_role;
GRANT EXECUTE ON FUNCTION public.create_pending_order(uuid,text,text,text,jsonb,text,text,text,text,text,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_paid_order(uuid,text,text,numeric,text) TO service_role;
COMMIT;
