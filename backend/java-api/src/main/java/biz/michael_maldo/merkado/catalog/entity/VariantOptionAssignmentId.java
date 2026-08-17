package biz.michael_maldo.merkado.catalog.entity;

import jakarta.persistence.Embeddable;
import lombok.*;
import java.io.Serializable;

@Embeddable @Getter @Setter @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode
public class VariantOptionAssignmentId implements Serializable {
    private Long variantId;
    private Long optionValueId;
}
