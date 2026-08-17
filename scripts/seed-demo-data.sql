-- Merkado demo dataset. Safe to run more than once: demo records use DEMO- SKUs
-- and DEMO: order notes, and unrelated application data is left untouched.
BEGIN;

INSERT INTO catalog.categories (name, description)
VALUES
  ('Apparel', 'Demo apparel and wearable merchandise'),
  ('Drinkware', 'Demo bottles and mugs'),
  ('Stationery', 'Demo paper goods and desk accessories'),
  ('Accessories', 'Demo bags, caps and small add-ons')
ON CONFLICT (name) DO NOTHING;

INSERT INTO catalog.products (sku, name, price, description, category_id)
SELECT product.sku, product.name, product.price, product.description, category.id
FROM (VALUES
  ('DEMO-TEE-BLK', 'Classic Tee — Black', 22.00::numeric, 'Soft-weight cotton crew tee', 'Apparel'),
  ('DEMO-TEE-SAND', 'Classic Tee — Sand', 22.00::numeric, 'Soft-weight cotton crew tee', 'Apparel'),
  ('DEMO-HOOD-GRY', 'Fleece Hoodie — Grey', 54.00::numeric, 'Mid-weight pullover hoodie', 'Apparel'),
  ('DEMO-CAP-NVY', 'Canvas Cap — Navy', 18.00::numeric, 'Adjustable embroidered cap', 'Accessories'),
  ('DEMO-TOTE-CRM', 'Market Tote — Cream', 16.00::numeric, 'Heavy canvas shopping tote', 'Accessories'),
  ('DEMO-BOTTLE-STEEL', 'Insulated Bottle — Steel', 32.00::numeric, '750 ml double-wall bottle', 'Drinkware'),
  ('DEMO-MUG-WHT', 'Studio Mug — White', 20.00::numeric, 'Ceramic 350 ml studio mug', 'Drinkware'),
  ('DEMO-NOTE-KRAFT', 'Kraft Notebook', 14.00::numeric, 'A5 dotted notebook, 160 pages', 'Stationery'),
  ('DEMO-STICKER-PACK', 'Sticker Pack', 8.00::numeric, 'Six die-cut vinyl stickers', 'Stationery'),
  ('DEMO-DAY-BAG', 'Everyday Bag', 38.00::numeric, 'Compact cross-body utility bag', 'Accessories'),
  ('DEMO-SOCK-3PK', 'Logo Socks — 3 Pack', 24.00::numeric, 'Combed cotton crew socks', 'Apparel'),
  ('DEMO-PATCH-SET', 'Woven Patch Set', 12.00::numeric, 'Set of three sew-on patches', 'Accessories')
) AS product(sku, name, price, description, category_name)
JOIN catalog.categories category ON category.name = product.category_name
ON CONFLICT (sku) DO NOTHING;

INSERT INTO inventory.stock (product_id, quantity, reserved)
SELECT product.id, level.quantity, level.reserved
FROM (VALUES
  ('DEMO-TEE-BLK', 116, 7), ('DEMO-TEE-SAND', 84, 0),
  ('DEMO-HOOD-GRY', 64, 7), ('DEMO-CAP-NVY', 90, 1),
  ('DEMO-TOTE-CRM', 140, 6), ('DEMO-BOTTLE-STEEL', 72, 0),
  ('DEMO-MUG-WHT', 34, 0), ('DEMO-NOTE-KRAFT', 48, 3),
  ('DEMO-STICKER-PACK', 450, 50), ('DEMO-DAY-BAG', 55, 2),
  ('DEMO-SOCK-3PK', 70, 0), ('DEMO-PATCH-SET', 110, 0)
) AS level(sku, quantity, reserved)
JOIN catalog.products product ON product.sku = level.sku
ON CONFLICT (product_id) DO UPDATE SET quantity = EXCLUDED.quantity, reserved = EXCLUDED.reserved;

INSERT INTO pricing.product_pricing (product_id, price)
SELECT id, price FROM catalog.products WHERE sku LIKE 'DEMO-%'
ON CONFLICT (product_id) DO UPDATE SET price = EXCLUDED.price, updated_at = CURRENT_TIMESTAMP;

INSERT INTO pricing.discount_bands (name, minimum_amount, percentage)
VALUES ('Demo wholesale 10%', 150.00, 10.00), ('Demo bulk 15%', 300.00, 15.00)
ON CONFLICT (name) DO NOTHING;

INSERT INTO clients.clients (name, phone, address, social_handle, email)
SELECT name, phone, address, social_handle, email FROM (VALUES
  ('Harper Lane Studio', '+61 3 9000 1001', '18 Little Collins St, Melbourne VIC 3000', '@harperlanestudio', 'orders@harperlane.example'),
  ('Northside Coffee Roasters', '+61 3 9000 1002', '44 High St, Northcote VIC 3070', '@northsidecoffee', 'hello@northsidecoffee.example'),
  ('Mia Chen', '+61 4 1000 1003', '9 Bellair St, Kensington VIC 3031', '@mia.chen', 'mia.chen@example.test'),
  ('Field & Form', '+61 3 9000 1004', '2 Oxford St, Collingwood VIC 3066', '@fieldandform', 'supply@fieldandform.example'),
  ('The Sunday Market', '+61 3 9000 1005', '77 Sydney Rd, Brunswick VIC 3056', '@thesundaymarket', 'team@sundaymarket.example'),
  ('Olivia Grant', '+61 4 1000 1006', '26 Lygon St, Carlton VIC 3053', '@oliviagrant', 'olivia.grant@example.test'),
  ('Good Goods Co.', '+61 3 9000 1007', '101 Johnston St, Fitzroy VIC 3065', '@goodgoodsco', 'purchasing@goodgoods.example'),
  ('Noah Williams', '+61 4 1000 1008', '5 Station St, Richmond VIC 3121', '@noah.williams', 'noah.williams@example.test')
) AS client(name, phone, address, social_handle, email)
WHERE NOT EXISTS (SELECT 1 FROM clients.clients existing WHERE existing.email = client.email);

INSERT INTO clients.addresses (client_id, label, line1, city, state, postal_code, country, is_default)
SELECT id, 'Shipping', split_part(address, ',', 1), 'Melbourne', 'VIC', '3000', 'AU', TRUE
FROM clients.clients client
WHERE (email LIKE '%@%.example%' OR email LIKE '%@example.test')
  AND NOT EXISTS (SELECT 1 FROM clients.addresses address WHERE address.client_id = client.id AND address.label = 'Shipping');

INSERT INTO identity.users (username, password, enabled)
SELECT username, (SELECT password FROM identity.users WHERE username = 'admin'), TRUE
FROM (VALUES ('warehouse.demo'), ('sales.demo')) AS demo(username)
WHERE NOT EXISTS (SELECT 1 FROM identity.users existing WHERE existing.username = demo.username);

INSERT INTO identity.user_roles (user_id, role_id)
SELECT user_account.id, role.id
FROM identity.users user_account
JOIN identity.roles role ON (user_account.username = 'warehouse.demo' AND role.name = 'WAREHOUSE') OR (user_account.username = 'sales.demo' AND role.name = 'SALES_AGENT')
ON CONFLICT DO NOTHING;

INSERT INTO orders.sales_orders (client_id, created_by, status, total, notes, created_at, updated_at)
SELECT client.id, 'admin', definition.status, 0, definition.note, CURRENT_TIMESTAMP - definition.age, CURRENT_TIMESTAMP - definition.age
FROM (VALUES
  ('mia.chen@example.test', 'PAYMENT_PENDING', 'DEMO: M-1001 pending web order', interval '2 hours'),
  ('orders@harperlane.example', 'PAYMENT_VERIFIED', 'DEMO: M-1002 awaiting warehouse pack', interval '1 day'),
  ('hello@northsidecoffee.example', 'PACKED', 'DEMO: M-1003 packed and ready for carrier', interval '2 days'),
  ('supply@fieldandform.example', 'DISPATCHED', 'DEMO: M-1004 dispatched with courier', interval '3 days'),
  ('team@sundaymarket.example', 'COMPLETED', 'DEMO: M-1005 delivered wholesale order', interval '6 days'),
  ('olivia.grant@example.test', 'CANCELLED', 'DEMO: M-1006 customer cancellation', interval '8 days'),
  ('purchasing@goodgoods.example', 'PAYMENT_VERIFIED', 'DEMO: M-1007 verified wholesale order', interval '4 hours'),
  ('noah.williams@example.test', 'PACKED', 'DEMO: M-1008 packed gift order', interval '5 hours'),
  ('orders@harperlane.example', 'DISPATCHED', 'DEMO: M-1009 dispatched replenishment', interval '1 hour')
) AS definition(email, status, note, age)
JOIN clients.clients client ON client.email = definition.email
WHERE NOT EXISTS (SELECT 1 FROM orders.sales_orders existing WHERE existing.notes = definition.note);

INSERT INTO orders.order_items (order_id, product_id, sku, product_name, quantity, unit_price, line_total)
SELECT sales_order.id, product.id, product.sku, product.name, definition.quantity, product.price, product.price * definition.quantity
FROM (VALUES
  ('DEMO: M-1001 pending web order', 'DEMO-TEE-BLK', 2), ('DEMO: M-1001 pending web order', 'DEMO-CAP-NVY', 1),
  ('DEMO: M-1002 awaiting warehouse pack', 'DEMO-TEE-BLK', 5), ('DEMO: M-1002 awaiting warehouse pack', 'DEMO-TOTE-CRM', 6),
  ('DEMO: M-1003 packed and ready for carrier', 'DEMO-HOOD-GRY', 4), ('DEMO: M-1003 packed and ready for carrier', 'DEMO-NOTE-KRAFT', 3),
  ('DEMO: M-1004 dispatched with courier', 'DEMO-BOTTLE-STEEL', 3), ('DEMO: M-1004 dispatched with courier', 'DEMO-MUG-WHT', 2),
  ('DEMO: M-1005 delivered wholesale order', 'DEMO-TOTE-CRM', 10), ('DEMO: M-1005 delivered wholesale order', 'DEMO-SOCK-3PK', 5),
  ('DEMO: M-1006 customer cancellation', 'DEMO-CAP-NVY', 3), ('DEMO: M-1007 verified wholesale order', 'DEMO-DAY-BAG', 2),
  ('DEMO: M-1008 packed gift order', 'DEMO-STICKER-PACK', 50), ('DEMO: M-1008 packed gift order', 'DEMO-HOOD-GRY', 3),
  ('DEMO: M-1009 dispatched replenishment', 'DEMO-TEE-BLK', 4), ('DEMO: M-1009 dispatched replenishment', 'DEMO-MUG-WHT', 2)
) AS definition(note, sku, quantity)
JOIN orders.sales_orders sales_order ON sales_order.notes = definition.note
JOIN catalog.products product ON product.sku = definition.sku
WHERE NOT EXISTS (SELECT 1 FROM orders.order_items existing WHERE existing.order_id = sales_order.id AND existing.product_id = product.id);

UPDATE orders.sales_orders sales_order
SET total = COALESCE((SELECT SUM(line_total) FROM orders.order_items WHERE order_id = sales_order.id), 0),
    updated_at = CURRENT_TIMESTAMP
WHERE notes LIKE 'DEMO:%';

INSERT INTO warehouse.shipments (order_id, status, tracking_number, carrier, packed_at, dispatched_at, delivered_at)
SELECT sales_order.id, definition.status, definition.tracking, definition.carrier,
  CASE WHEN definition.status IN ('PACKED', 'DISPATCHED', 'DELIVERED') THEN CURRENT_TIMESTAMP - interval '1 day' END,
  CASE WHEN definition.status IN ('DISPATCHED', 'DELIVERED') THEN CURRENT_TIMESTAMP - interval '12 hours' END,
  CASE WHEN definition.status = 'DELIVERED' THEN CURRENT_TIMESTAMP - interval '5 days' END
FROM (VALUES
  ('DEMO: M-1002 awaiting warehouse pack', 'PENDING', NULL::text, 'Australia Post'),
  ('DEMO: M-1003 packed and ready for carrier', 'PACKED', 'M-DEMO1003', 'Sendle'),
  ('DEMO: M-1004 dispatched with courier', 'DISPATCHED', 'M-DEMO1004', 'DHL Express'),
  ('DEMO: M-1005 delivered wholesale order', 'DELIVERED', 'M-DEMO1005', 'Australia Post'),
  ('DEMO: M-1007 verified wholesale order', 'PENDING', NULL::text, 'Sendle'),
  ('DEMO: M-1008 packed gift order', 'PACKED', 'M-DEMO1008', 'Australia Post'),
  ('DEMO: M-1009 dispatched replenishment', 'DISPATCHED', 'M-DEMO1009', 'DHL Express')
) AS definition(note, status, tracking, carrier)
JOIN orders.sales_orders sales_order ON sales_order.notes = definition.note
ON CONFLICT (order_id) DO NOTHING;

INSERT INTO warehouse.fulfillment_events (shipment_id, event_type, note, created_by, created_at)
SELECT shipment.id, event.event_type, event.note, 'warehouse.demo', CURRENT_TIMESTAMP - event.age
FROM (VALUES
  ('DEMO: M-1003 packed and ready for carrier', 'PACK', 'Packed and quality checked', interval '1 day'),
  ('DEMO: M-1004 dispatched with courier', 'PACK', 'Packed for express collection', interval '2 days'),
  ('DEMO: M-1004 dispatched with courier', 'DISPATCH', 'Collected by DHL Express', interval '12 hours'),
  ('DEMO: M-1005 delivered wholesale order', 'DELIVER', 'Delivery confirmed', interval '5 days'),
  ('DEMO: M-1008 packed gift order', 'PACK', 'Gift note included', interval '4 hours'),
  ('DEMO: M-1009 dispatched replenishment', 'DISPATCH', 'DHL pickup confirmed', interval '30 minutes')
) AS event(note_key, event_type, note, age)
JOIN orders.sales_orders sales_order ON sales_order.notes = event.note_key
JOIN warehouse.shipments shipment ON shipment.order_id = sales_order.id
WHERE NOT EXISTS (SELECT 1 FROM warehouse.fulfillment_events existing WHERE existing.shipment_id = shipment.id AND existing.event_type = event.event_type AND existing.note = event.note);

INSERT INTO inventory.stock_movements (product_id, movement_type, quantity, reference_type, reference_id, note, created_by, created_at)
SELECT product.id, movement.movement_type, movement.quantity, 'DEMO_SEED', NULL, movement.note, 'warehouse.demo', CURRENT_TIMESTAMP - movement.age
FROM (VALUES
  ('DEMO-TEE-BLK', 'RECEIPT', 120, 'Initial demo stock receipt', interval '12 days'),
  ('DEMO-HOOD-GRY', 'RECEIPT', 70, 'Initial demo stock receipt', interval '12 days'),
  ('DEMO-BOTTLE-STEEL', 'RECEIPT', 75, 'Initial demo stock receipt', interval '11 days'),
  ('DEMO-TEE-BLK', 'DISPATCH', -4, 'Dispatched replenishment order', interval '1 hour'),
  ('DEMO-BOTTLE-STEEL', 'DISPATCH', -3, 'Dispatched courier order', interval '3 days'),
  ('DEMO-STICKER-PACK', 'RESERVE', 50, 'Reserved for packed gift order', interval '5 hours'),
  ('DEMO-NOTE-KRAFT', 'ADJUSTMENT', -2, 'Damaged stock count adjustment', interval '2 days')
) AS movement(sku, movement_type, quantity, note, age)
JOIN catalog.products product ON product.sku = movement.sku
WHERE NOT EXISTS (SELECT 1 FROM inventory.stock_movements existing WHERE existing.product_id = product.id AND existing.note = movement.note);

INSERT INTO commission.commission_rules (name, percentage)
VALUES ('Demo standard sales commission', 7.50), ('Demo wholesale commission', 5.00)
ON CONFLICT (name) DO NOTHING;

INSERT INTO commission.commissions (order_id, agent_id, rule_id, amount, status)
SELECT sales_order.id, sales_agent.id, rule.id, ROUND(sales_order.total * rule.percentage / 100, 2), 'PENDING'
FROM orders.sales_orders sales_order
JOIN identity.users sales_agent ON sales_agent.username = 'sales.demo'
JOIN commission.commission_rules rule ON rule.name = 'Demo standard sales commission'
WHERE sales_order.notes IN ('DEMO: M-1002 awaiting warehouse pack', 'DEMO: M-1007 verified wholesale order')
ON CONFLICT (order_id, agent_id) DO NOTHING;

COMMIT;
