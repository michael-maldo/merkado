package biz.michael_maldo.merkado.catalog.repository;

import biz.michael_maldo.merkado.catalog.entity.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {
    List<ProductVariant> findAllByProductIdOrderById(Long productId);
    Optional<ProductVariant> findByProductIdAndDefaultVariantTrue(Long productId);
    boolean existsBySkuIgnoreCase(String sku);
    boolean existsByBarcodeIgnoreCase(String barcode);
}
