package biz.michael_maldo.merkado.catalog.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(schema = "catalog", name = "product_customs_information")
@Getter
@Setter
@NoArgsConstructor
public class ProductCustomsInfo {

  @Id
  @Column(name = "product_id")
  private Long productId;

  @OneToOne(fetch = FetchType.LAZY, optional = false)
  @MapsId
  @JoinColumn(name = "product_id")
  private Product product;

  @Column(name = "chinese_name", length = 250)
  private String chineseName;

  @Column(name = "english_name", length = 250)
  private String englishName;

  @Column(name = "hs_code", length = 20)
  private String hsCode;

  @Column(name = "invoice_amount", precision = 12, scale = 2)
  private BigDecimal invoiceAmount;

  @Column(name = "invoice_currency", length = 3)
  private String invoiceCurrency;

  @Column(name = "gross_weight_kg", precision = 10, scale = 3)
  private BigDecimal grossWeightKg;

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt = LocalDateTime.now();
}
