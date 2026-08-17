package biz.michael_maldo.merkado.catalog.repository;

import biz.michael_maldo.merkado.catalog.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VariantOptionAssignmentRepository extends JpaRepository<VariantOptionAssignment, VariantOptionAssignmentId> {
    List<VariantOptionAssignment> findAllByVariantId(Long variantId);
    void deleteAllByVariantId(Long variantId);
}
