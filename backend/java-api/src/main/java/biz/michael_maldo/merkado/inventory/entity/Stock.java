package biz.michael_maldo.merkado.inventory.entity;

import biz.michael_maldo.merkado.catalog.entity.Product;
import biz.michael_maldo.merkado.catalog.entity.ProductVariant;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(schema = "inventory", name = "stock")
@Getter
@Setter
@NoArgsConstructor
public class Stock {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional = false, fetch = FetchType.EAGER)
  @JoinColumn(name = "product_id")
  private Product product;

  @OneToOne(optional = false, fetch = FetchType.EAGER)
  @JoinColumn(name = "variant_id", unique = true)
  private ProductVariant variant;

  @Column(nullable = false)
  private int quantity;

  @Column(nullable = false)
  private int reserved;

  @Version
  private long version;

  public int getAvailable() {
    return quantity - reserved;
  }
}
