-- Refine the V4 legacy synchronization trigger. Once a master name or SPU has
-- diverged from its legacy name/SKU, changing the legacy value must not replace
-- the independently managed master identity.
CREATE OR REPLACE FUNCTION catalog.sync_legacy_product_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF NEW.name IS DISTINCT FROM OLD.name
           AND OLD.master_name = OLD.name
           AND NEW.master_name = OLD.master_name THEN
            NEW.master_name := NEW.name;
        END IF;

        IF NEW.sku IS DISTINCT FROM OLD.sku
           AND OLD.spu = OLD.sku
           AND NEW.spu = OLD.spu THEN
            NEW.spu := NEW.sku;
        END IF;

        IF NEW.description IS DISTINCT FROM OLD.description THEN
            IF NEW.short_description = OLD.short_description THEN
                NEW.short_description := COALESCE(NEW.description, NEW.name);
            END IF;
            IF NEW.long_description = OLD.long_description THEN
                NEW.long_description := COALESCE(NEW.description, NEW.name);
            END IF;
        END IF;
    END IF;

    NEW.master_name := COALESCE(NEW.master_name, NEW.name);
    NEW.spu := COALESCE(NEW.spu, NEW.sku);
    NEW.brand_id := COALESCE(
        NEW.brand_id,
        (SELECT id FROM catalog.brands WHERE name = 'UNBRANDED')
    );
    NEW.category_id := COALESCE(
        NEW.category_id,
        (SELECT id FROM catalog.categories WHERE code = 'UNCATEGORIZED')
    );
    NEW.short_description := COALESCE(NEW.short_description, NEW.description, NEW.name);
    NEW.long_description := COALESCE(NEW.long_description, NEW.description, NEW.name);
    RETURN NEW;
END;
$$;
