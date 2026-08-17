package biz.michael_maldo.merkado.catalog.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Entity @Table(schema = "catalog", name = "product_variants")
@Getter @Setter @NoArgsConstructor
public class ProductVariant {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "product_id") private Product product;
    @Column(nullable = false, unique = true, length = 80) private String sku;
    @Column(nullable = false, unique = true, length = 64) private String barcode;
    // Legacy fields retained while older endpoints are being retired.
    @Column(nullable = false, length = 200) private String name;
    @Column(name = "price_adjustment", nullable = false, precision = 12, scale = 2) private BigDecimal priceAdjustment = BigDecimal.ZERO;
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> attributes = new LinkedHashMap<>();
    @Column(name = "variant_name", nullable = false, length = 250) private String variantName;
    @Column(name = "selling_price", nullable = false, precision = 12, scale = 2) private BigDecimal sellingPrice;
    @Column(name = "is_default", nullable = false) private boolean defaultVariant;
    @Column(nullable = false) private boolean active = true;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt = LocalDateTime.now();
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt = LocalDateTime.now();
}
