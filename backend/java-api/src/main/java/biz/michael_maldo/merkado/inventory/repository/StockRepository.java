package biz.michael_maldo.merkado.inventory.repository;

import biz.michael_maldo.merkado.inventory.entity.Stock;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import java.util.List;

public interface StockRepository extends JpaRepository<Stock, Long> {
    Optional<Stock> findByProductId(Long productId);
    List<Stock> findAllByProductId(Long productId);
    Optional<Stock> findByVariantId(Long variantId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Stock s where s.product.id = :productId")
    Optional<Stock> findByProductIdForUpdate(@Param("productId") Long productId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Stock s where s.variant.id = :variantId")
    Optional<Stock> findByVariantIdForUpdate(@Param("variantId") Long variantId);
}
