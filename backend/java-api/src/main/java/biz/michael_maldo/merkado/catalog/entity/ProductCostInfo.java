package biz.michael_maldo.merkado.catalog.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(schema = "catalog", name = "product_cost_information")
@Getter
@Setter
@NoArgsConstructor
public class ProductCostInfo {

  @Id
  @Column(name = "product_id")
  private Long productId;

  @OneToOne(fetch = FetchType.LAZY, optional = false)
  @MapsId
  @JoinColumn(name = "product_id")
  private Product product;

  @Column(name = "source_url", columnDefinition = "TEXT")
  private String sourceUrl;

  @Column(name = "purchase_duration_days")
  private Integer purchaseDurationDays;

  @Column(name = "sales_tax_amount", precision = 12, scale = 2)
  private BigDecimal salesTaxAmount;

  @Column(name = "tax_currency", length = 3)
  private String taxCurrency;

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt = LocalDateTime.now();
}
