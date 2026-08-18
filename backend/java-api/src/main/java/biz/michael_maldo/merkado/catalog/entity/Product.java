package biz.michael_maldo.merkado.catalog.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.*;

@Entity
@Table(schema = "catalog", name = "products")
@Getter
@Setter
@NoArgsConstructor
public class Product {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  // Legacy compatibility columns. New catalogue APIs mirror these from the
  // default variant until a later migration removes them.
  @Column(nullable = false, unique = true)
  private String sku;

  @Column(nullable = false)
  private String name;

  @Column(nullable = false, precision = 12, scale = 2)
  private BigDecimal price;

  @Column(name = "master_name", nullable = false, length = 250)
  private String masterName;

  @Column(length = 32)
  private String upc;

  @Column(nullable = false, length = 80)
  private String spu;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "category_id")
  private Category category;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "brand_id")
  private Brand brand;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 30)
  private ProductCondition condition = ProductCondition.NEW;

  @Column(name = "shelf_life_days")
  private Integer shelfLifeDays;

  @Column(name = "minimum_purchase_quantity", nullable = false)
  private int minimumPurchaseQuantity = 1;

  @Column(name = "short_description", nullable = false, length = 500)
  private String shortDescription;

  @Column(
    name = "long_description",
    nullable = false,
    columnDefinition = "TEXT"
  )
  private String longDescription;

  @Column(name = "has_variations", nullable = false)
  private boolean hasVariations;

  @Column(nullable = false)
  private boolean preorder;

  @Column(name = "remarks_1", columnDefinition = "TEXT")
  private String remarks1;

  @Column(name = "remarks_2", columnDefinition = "TEXT")
  private String remarks2;

  @Column(name = "remarks_3", columnDefinition = "TEXT")
  private String remarks3;

  @Column(nullable = false)
  private boolean active = true;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt = LocalDateTime.now();

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt = LocalDateTime.now();

  @OneToMany(mappedBy = "product", fetch = FetchType.LAZY)
  @OrderBy("id")
  private List<ProductVariant> variants = new ArrayList<>();
}
