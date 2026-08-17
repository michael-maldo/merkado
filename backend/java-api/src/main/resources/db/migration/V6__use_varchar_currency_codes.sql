-- Hibernate maps Java String currency codes as VARCHAR. Fixed-width CHAR adds
-- padding without providing value here, so normalize both ISO code columns.
ALTER TABLE catalog.product_customs_information
    ALTER COLUMN invoice_currency TYPE VARCHAR(3);

ALTER TABLE catalog.product_cost_information
    ALTER COLUMN tax_currency TYPE VARCHAR(3);
