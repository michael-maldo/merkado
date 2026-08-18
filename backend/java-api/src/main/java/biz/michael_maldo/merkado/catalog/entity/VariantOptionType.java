package biz.michael_maldo.merkado.catalog.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.*;

@Entity
@Table(schema = "catalog", name = "variant_option_types")
@Getter
@Setter
@NoArgsConstructor
public class VariantOptionType {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "product_id")
  private Product product;

  @Column(nullable = false, length = 80)
  private String name;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  @Column(nullable = false)
  private boolean active = true;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt = LocalDateTime.now();

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt = LocalDateTime.now();

  @OneToMany(
    mappedBy = "optionType",
    cascade = CascadeType.ALL,
    orphanRemoval = true
  )
  @OrderBy("sortOrder, id")
  private List<VariantOptionValue> values = new ArrayList<>();
}
