package biz.michael_maldo.merkado.catalog.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity @Table(schema = "catalog", name = "variant_packaging")
@Getter @Setter @NoArgsConstructor
public class VariantPackaging {
    @Id @Column(name = "variant_id") private Long variantId;
    @OneToOne(fetch = FetchType.LAZY, optional = false) @MapsId @JoinColumn(name = "variant_id") private ProductVariant variant;
    @Column(name = "length_cm", nullable = false, precision = 10, scale = 2) private BigDecimal lengthCm;
    @Column(name = "width_cm", nullable = false, precision = 10, scale = 2) private BigDecimal widthCm;
    @Column(name = "height_cm", nullable = false, precision = 10, scale = 2) private BigDecimal heightCm;
    @Column(name = "weight_kg", nullable = false, precision = 10, scale = 3) private BigDecimal weightKg;
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt = LocalDateTime.now();
}
