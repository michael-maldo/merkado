package biz.michael_maldo.merkado.catalog.repository;

import biz.michael_maldo.merkado.catalog.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {
    boolean existsBySkuIgnoreCase(String sku);
    boolean existsBySpuIgnoreCase(String spu);
    boolean existsByUpcIgnoreCase(String upc);
    List<Product> findByMasterNameContainingIgnoreCaseOrSpuContainingIgnoreCase(String name, String spu);
    @Query(value = """
        WITH RECURSIVE category_tree AS (
            SELECT id FROM catalog.categories WHERE id = :categoryId
            UNION ALL
            SELECT c.id FROM catalog.categories c JOIN category_tree parent ON c.parent_id = parent.id
        )
        SELECT p.* FROM catalog.products p
        WHERE p.category_id IN (SELECT id FROM category_tree)
        ORDER BY p.master_name, p.id
        """, nativeQuery = true)
    List<Product> findAllInCategoryTree(@Param("categoryId") Long categoryId);
}
