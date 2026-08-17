ALTER TABLE orders.order_items
    ADD COLUMN variant_options JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE orders.order_items item
SET variant_options = options.snapshot
FROM (
    SELECT oi.id,
           COALESCE(jsonb_object_agg(option_type.name, option_value.value)
               FILTER (WHERE option_type.id IS NOT NULL), '{}'::jsonb) AS snapshot
    FROM orders.order_items oi
    LEFT JOIN catalog.variant_option_assignments assignment ON assignment.variant_id = oi.variant_id
    LEFT JOIN catalog.variant_option_types option_type ON option_type.id = assignment.option_type_id
    LEFT JOIN catalog.variant_option_values option_value ON option_value.id = assignment.option_value_id
    GROUP BY oi.id
) options
WHERE options.id = item.id;
