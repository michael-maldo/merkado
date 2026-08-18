package biz.michael_maldo.merkado.catalog.repository;

import biz.michael_maldo.merkado.catalog.entity.ProductImage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductImageRepository
  extends JpaRepository<ProductImage, Long>
{
  List<ProductImage> findAllByProductIdOrderBySortOrderAscIdAsc(Long productId);
}
