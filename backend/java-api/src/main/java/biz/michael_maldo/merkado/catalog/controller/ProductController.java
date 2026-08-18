package biz.michael_maldo.merkado.catalog.controller;

import biz.michael_maldo.merkado.catalog.dto.ProductDtos;
import biz.michael_maldo.merkado.catalog.service.ProductCatalogService;
import biz.michael_maldo.merkado.inventory.repository.StockRepository;
import biz.michael_maldo.merkado.shared.exception.BusinessException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
public class ProductController {

  private final ProductCatalogService catalog;
  private final StockRepository stocks;
  private final JdbcClient db;

  @GetMapping
  public List<ProductDtos.Summary> list(
    @RequestParam(required = false) Long categoryId
  ) {
    return categoryId == null
      ? catalog.list(null)
      : catalog.listCategoryTree(categoryId);
  }

  @GetMapping("/category-counts")
  public List<Map<String, Object>> categoryCounts() {
    return db
      .sql(
        """
        WITH RECURSIVE category_tree AS (
            SELECT id, id AS root_id FROM catalog.categories WHERE parent_id IS NULL
            UNION ALL
            SELECT c.id, parent.root_id
            FROM catalog.categories c JOIN category_tree parent ON c.parent_id = parent.id
        )
        SELECT roots.id AS category_id, COUNT(p.id) AS product_count
        FROM catalog.categories roots
        LEFT JOIN category_tree tree ON tree.root_id = roots.id
        LEFT JOIN catalog.products p ON p.category_id = tree.id
        WHERE roots.parent_id IS NULL
        GROUP BY roots.id, roots.name
        ORDER BY roots.name
        """
      )
      .query()
      .listOfRows();
  }

  @GetMapping("/search")
  public List<ProductDtos.Summary> search(@RequestParam String q) {
    return catalog.list(q);
  }

  @GetMapping("/{id}")
  public ProductDtos.Detail get(@PathVariable Long id) {
    return catalog.detail(id);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasRole('MANAGEMENT')")
  public ProductDtos.Detail create(
    @Valid @RequestBody ProductDtos.Create request
  ) {
    return catalog.create(request);
  }

  @PatchMapping("/{id}")
  @PreAuthorize("hasRole('MANAGEMENT')")
  public ProductDtos.Detail update(
    @PathVariable Long id,
    @Valid @RequestBody ProductDtos.MasterUpdate request
  ) {
    return catalog.updateMaster(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @PreAuthorize("hasRole('MANAGEMENT')")
  public void archive(@PathVariable Long id) {
    catalog.archive(id);
  }

  @PostMapping("/{id}/option-types")
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasRole('MANAGEMENT')")
  public ProductDtos.OptionTypeView addOptionType(
    @PathVariable Long id,
    @Valid @RequestBody ProductDtos.OptionTypeRequest request
  ) {
    return catalog.addOptionType(id, request);
  }

  @PostMapping("/{id}/variants")
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasRole('MANAGEMENT')")
  public ProductDtos.VariantView addVariant(
    @PathVariable Long id,
    @Valid @RequestBody ProductDtos.VariantRequest request
  ) {
    return catalog.addVariant(id, request);
  }

  @PatchMapping("/{id}/variants/{variantId}")
  @PreAuthorize("hasRole('MANAGEMENT')")
  public ProductDtos.VariantView updateVariant(
    @PathVariable Long id,
    @PathVariable Long variantId,
    @Valid @RequestBody ProductDtos.VariantUpdate request
  ) {
    return catalog.updateVariant(id, variantId, request);
  }

  // Compatibility endpoint: updates the default variant's stock.
  @PatchMapping("/{id}/stock")
  @PreAuthorize("hasRole('MANAGEMENT')")
  @Transactional
  public ProductDtos.Detail setDefaultStock(
    @PathVariable Long id,
    @Valid @RequestBody StockRequest request
  ) {
    var stock = stocks
      .findAllByProductId(id)
      .stream()
      .filter(s -> s.getVariant().isDefaultVariant())
      .findFirst()
      .orElseThrow(() ->
        new BusinessException("Default variant stock not found")
      );
    applyQuantity(stock, request.quantity());
    return catalog.detail(id);
  }

  @PatchMapping("/{id}/variants/{variantId}/stock")
  @PreAuthorize("hasRole('MANAGEMENT')")
  @Transactional
  public ProductDtos.VariantView setVariantStock(
    @PathVariable Long id,
    @PathVariable Long variantId,
    @Valid @RequestBody StockRequest request
  ) {
    var stock = stocks
      .findByVariantIdForUpdate(variantId)
      .orElseThrow(() -> new BusinessException("Variant stock not found"));
    if (!stock.getProduct().getId().equals(id)) throw new BusinessException(
      "Variant does not belong to product"
    );
    applyQuantity(stock, request.quantity());
    return catalog
      .detail(id)
      .variants()
      .stream()
      .filter(v -> v.id().equals(variantId))
      .findFirst()
      .orElseThrow();
  }

  private void applyQuantity(
    biz.michael_maldo.merkado.inventory.entity.Stock stock,
    int quantity
  ) {
    if (quantity < stock.getReserved()) throw new BusinessException(
      "Quantity cannot be below reserved stock"
    );
    stock.setQuantity(quantity);
  }

  public record StockRequest(@Min(0) int quantity) {}
}
