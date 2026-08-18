package biz.michael_maldo.merkado.catalog.entity;

import jakarta.persistence.Embeddable;
import java.io.Serializable;
import lombok.*;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class VariantOptionAssignmentId implements Serializable {

  private Long variantId;
  private Long optionValueId;
}
