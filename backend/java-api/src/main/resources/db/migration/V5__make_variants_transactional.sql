-- Complete the transition started in V4: a product is the SPU-level master,
-- while a product variant is the sellable, stock-controlled unit.

ALTER TABLE inventory.stock
    DROP CONSTRAINT stock_product_id_key,
    ALTER COLUMN variant_id SET NOT NULL,
    ADD CONSTRAINT fk_stock_variant_product
        FOREIGN KEY (variant_id, product_id)
        REFERENCES catalog.product_variants(id, product_id);

ALTER TABLE inventory.stock_movements
    ALTER COLUMN variant_id SET NOT NULL,
    ADD CONSTRAINT fk_stock_movements_variant_product
        FOREIGN KEY (variant_id, product_id)
        REFERENCES catalog.product_variants(id, product_id);

ALTER TABLE inventory.reservations
    ALTER COLUMN variant_id SET NOT NULL,
    ADD CONSTRAINT fk_reservations_variant_product
        FOREIGN KEY (variant_id, product_id)
        REFERENCES catalog.product_variants(id, product_id);

ALTER TABLE carts.cart_items
    DROP CONSTRAINT cart_items_cart_id_product_id_key,
    ALTER COLUMN variant_id SET NOT NULL,
    ADD CONSTRAINT fk_cart_items_variant_product
        FOREIGN KEY (variant_id, product_id)
        REFERENCES catalog.product_variants(id, product_id);

ALTER TABLE orders.order_items
    ALTER COLUMN variant_id SET NOT NULL,
    ALTER COLUMN spu SET NOT NULL,
    ALTER COLUMN barcode SET NOT NULL,
    ALTER COLUMN variant_name SET NOT NULL,
    ADD CONSTRAINT fk_order_items_variant_product
        FOREIGN KEY (variant_id, product_id)
        REFERENCES catalog.product_variants(id, product_id);

ALTER TABLE pricing.product_pricing
    DROP CONSTRAINT product_pricing_pkey,
    ALTER COLUMN variant_id SET NOT NULL,
    ADD CONSTRAINT fk_product_pricing_variant_product
        FOREIGN KEY (variant_id, product_id)
        REFERENCES catalog.product_variants(id, product_id),
    ADD CONSTRAINT product_pricing_pkey
        PRIMARY KEY USING INDEX uk_product_pricing_variant;

COMMENT ON COLUMN inventory.stock.product_id IS
    'Denormalized master product reference; inventory identity and uniqueness use variant_id';
COMMENT ON COLUMN pricing.product_pricing.product_id IS
    'Denormalized master product reference; pricing identity uses variant_id';
COMMENT ON COLUMN carts.cart_items.product_id IS
    'Denormalized master product reference; cart uniqueness uses variant_id';
