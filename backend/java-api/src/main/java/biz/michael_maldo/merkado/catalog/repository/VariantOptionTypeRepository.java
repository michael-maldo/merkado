package biz.michael_maldo.merkado.catalog.repository;

import biz.michael_maldo.merkado.catalog.entity.VariantOptionType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VariantOptionTypeRepository
  extends JpaRepository<VariantOptionType, Long>
{
  List<VariantOptionType> findAllByProductIdOrderBySortOrderAscIdAsc(
    Long productId
  );
}
