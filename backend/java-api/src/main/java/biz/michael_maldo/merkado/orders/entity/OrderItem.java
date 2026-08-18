package biz.michael_maldo.merkado.orders.entity;

import biz.michael_maldo.merkado.catalog.entity.Product;
import biz.michael_maldo.merkado.catalog.entity.ProductVariant;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(schema = "orders", name = "order_items")
@Getter
@Setter
@NoArgsConstructor
public class OrderItem {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "order_id")
  private SalesOrder order;

  @ManyToOne(optional = false)
  @JoinColumn(name = "product_id")
  private Product product;

  @ManyToOne(optional = false)
  @JoinColumn(name = "variant_id")
  private ProductVariant variant;

  @Column(nullable = false)
  private String spu;

  @Column(nullable = false)
  private String sku;

  @Column(nullable = false)
  private String barcode;

  @Column(name = "product_name", nullable = false)
  private String productName;

  @Column(name = "variant_name", nullable = false)
  private String variantName;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(
    name = "variant_options",
    nullable = false,
    columnDefinition = "jsonb"
  )
  private Map<String, String> variantOptions = new LinkedHashMap<>();

  @Column(nullable = false)
  private int quantity;

  @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
  private BigDecimal unitPrice;

  @Column(name = "line_total", nullable = false, precision = 12, scale = 2)
  private BigDecimal lineTotal;
}
