-- Standard shipping is the only available delivery method.
-- Historical express orders remain stored as-is.
CREATE OR REPLACE FUNCTION public.create_pending_order(p_user_id uuid DEFAULT NULL::uuid, p_provider text DEFAULT 'razorpay'::text, p_idempotency_key text DEFAULT NULL::text, p_coupon_code text DEFAULT NULL::text, p_shipping_address jsonb DEFAULT '{}'::jsonb, p_delivery_method text DEFAULT 'standard'::text, p_charged_currency text DEFAULT 'INR'::text, p_guest_email text DEFAULT NULL::text, p_guest_name text DEFAULT NULL::text, p_guest_phone text DEFAULT NULL::text, p_items jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
  v_line jsonb; v_p public.products%ROWTYPE; v_i public.inventory%ROWTYPE;
  v_slug text; v_qty integer; v_variant text;
  v_subtotal numeric(12,2):=0; v_discount numeric(12,2):=0;
  v_shipping numeric(12,2); v_total numeric(12,2);
  v_lines jsonb:='[]'::jsonb;
  v_coupon text:=upper(trim(coalesce(p_coupon_code,'')));
BEGIN
 IF p_provider <> 'razorpay' OR p_charged_currency <> 'INR' OR p_delivery_method <> 'standard'
    OR p_user_id IS NOT NULL THEN RAISE EXCEPTION 'CHECKOUT_UNSUPPORTED'; END IF;
 IF p_guest_email IS NULL OR length(p_guest_email)>254 OR p_guest_email !~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
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

 v_shipping:=CASE WHEN clock_timestamp() < TIMESTAMPTZ '2026-11-03 02:00:00+05:30' THEN 0 WHEN v_subtotal>=999 THEN 0 ELSE 99 END;
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
END $function$

