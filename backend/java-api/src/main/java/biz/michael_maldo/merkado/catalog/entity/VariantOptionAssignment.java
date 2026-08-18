package biz.michael_maldo.merkado.catalog.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(schema = "catalog", name = "variant_option_assignments")
@Getter
@Setter
@NoArgsConstructor
public class VariantOptionAssignment {

  @EmbeddedId
  private VariantOptionAssignmentId id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @MapsId("variantId")
  @JoinColumn(name = "variant_id")
  private ProductVariant variant;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @MapsId("optionValueId")
  @JoinColumn(name = "option_value_id")
  private VariantOptionValue optionValue;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "option_type_id")
  private VariantOptionType optionType;
}
