package biz.michael_maldo.merkado.catalog.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(schema = "catalog", name = "product_channel_listings")
@Getter
@Setter
@NoArgsConstructor
public class ProductChannelListing {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "product_id")
  private Product product;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "channel_id")
  private Channel channel;

  @Enumerated(EnumType.STRING)
  @Column(name = "selling_status", nullable = false, length = 30)
  private ChannelSellingStatus sellingStatus = ChannelSellingStatus.DRAFT;

  @Column(name = "external_product_id", length = 150)
  private String externalProductId;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt = LocalDateTime.now();

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt = LocalDateTime.now();
}
