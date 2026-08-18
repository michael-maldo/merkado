package biz.michael_maldo.merkado.catalog.controller;

import biz.michael_maldo.merkado.shared.exception.BusinessException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class CatalogAdminController {

  private final JdbcClient db;

  public record CategoryRequest(
    @NotBlank String name,
    String code,
    String description,
    Long parentId
  ) {}

  public record BrandRequest(@NotBlank String name, String description) {}

  public record ChannelRequest(@NotBlank String code, @NotBlank String name) {}

  @GetMapping("/categories")
  public List<Map<String, Object>> categories() {
    return db
      .sql(
        "select c.*,p.name parent_name from catalog.categories c left join catalog.categories p on p.id=c.parent_id order by c.name"
      )
      .query()
      .listOfRows();
  }

  @GetMapping("/categories/{id}")
  public Map<String, Object> category(@PathVariable long id) {
    return one("catalog.categories", id);
  }

  @PostMapping("/categories")
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasRole('MANAGEMENT')")
  @Transactional
  public Map<String, Object> createCategory(
    @Valid @RequestBody CategoryRequest r
  ) {
    String code = categoryCode(r.name(), r.code(), r.parentId());
    long id = db
      .sql(
        "insert into catalog.categories(name,code,description,parent_id) values(:n,:c,:d,:p) returning id"
      )
      .param("n", r.name().trim())
      .param("c", code)
      .param("d", r.description())
      .param("p", r.parentId(), java.sql.Types.BIGINT)
      .query(Long.class)
      .single();
    return category(id);
  }

  @PatchMapping("/categories/{id}")
  @PreAuthorize("hasRole('MANAGEMENT')")
  @Transactional
  public Map<String, Object> updateCategory(
    @PathVariable long id,
    @Valid @RequestBody CategoryRequest r
  ) {
    String code = categoryCode(r.name(), r.code(), r.parentId());
    changed(
      db
        .sql(
          "update catalog.categories set name=:n,code=:c,description=:d,parent_id=:p,updated_at=now() where id=:id"
        )
        .param("n", r.name().trim())
        .param("c", code)
        .param("d", r.description())
        .param("p", r.parentId(), java.sql.Types.BIGINT)
        .param("id", id)
        .update()
    );
    return category(id);
  }

  @DeleteMapping("/categories/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @PreAuthorize("hasRole('MANAGEMENT')")
  @Transactional
  public void archiveCategory(@PathVariable long id) {
    changed(
      db
        .sql(
          "update catalog.categories set active=false,updated_at=now() where id=:id"
        )
        .param("id", id)
        .update()
    );
  }

  @PatchMapping("/categories/{id}/restore")
  @PreAuthorize("hasRole('MANAGEMENT')")
  @Transactional
  public Map<String, Object> restoreCategory(@PathVariable long id) {
    changed(
      db
        .sql(
          "update catalog.categories set active=true,updated_at=now() where id=:id"
        )
        .param("id", id)
        .update()
    );
    return category(id);
  }

  @GetMapping("/brands")
  public List<Map<String, Object>> brands() {
    return list("catalog.brands", "name");
  }

  @PostMapping("/brands")
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasRole('MANAGEMENT')")
  @Transactional
  public Map<String, Object> createBrand(@Valid @RequestBody BrandRequest r) {
    long id = db
      .sql(
        "insert into catalog.brands(name,description) values(:n,:d) returning id"
      )
      .param("n", r.name().trim())
      .param("d", r.description())
      .query(Long.class)
      .single();
    return one("catalog.brands", id);
  }

  @PatchMapping("/brands/{id}")
  @PreAuthorize("hasRole('MANAGEMENT')")
  @Transactional
  public Map<String, Object> updateBrand(
    @PathVariable long id,
    @Valid @RequestBody BrandRequest r
  ) {
    changed(
      db
        .sql(
          "update catalog.brands set name=:n,description=:d,updated_at=now() where id=:id"
        )
        .param("n", r.name().trim())
        .param("d", r.description())
        .param("id", id)
        .update()
    );
    return one("catalog.brands", id);
  }

  @DeleteMapping("/brands/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @PreAuthorize("hasRole('MANAGEMENT')")
  @Transactional
  public void archiveBrand(@PathVariable long id) {
    changed(
      db
        .sql(
          "update catalog.brands set active=false,updated_at=now() where id=:id"
        )
        .param("id", id)
        .update()
    );
  }

  @GetMapping("/channels")
  public List<Map<String, Object>> channels() {
    return list("catalog.channels", "name");
  }

  @PostMapping("/channels")
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasRole('MANAGEMENT')")
  @Transactional
  public Map<String, Object> createChannel(
    @Valid @RequestBody ChannelRequest r
  ) {
    long id = db
      .sql("insert into catalog.channels(code,name) values(:c,:n) returning id")
      .param("c", normalizeCode(r.code()))
      .param("n", r.name().trim())
      .query(Long.class)
      .single();
    return one("catalog.channels", id);
  }

  @GetMapping("/product-variants")
  public List<Map<String, Object>> variants(
    @RequestParam(required = false) Long productId
  ) {
    if (productId == null) return db
      .sql("select * from catalog.product_variants order by product_id,id")
      .query()
      .listOfRows();
    return db
      .sql(
        "select * from catalog.product_variants where product_id=:p order by id"
      )
      .param("p", productId)
      .query()
      .listOfRows();
  }

  private List<Map<String, Object>> list(String table, String order) {
    return db
      .sql("select * from " + table + " order by " + order)
      .query()
      .listOfRows();
  }

  private Map<String, Object> one(String table, long id) {
    var rows = db
      .sql("select * from " + table + " where id=:id")
      .param("id", id)
      .query()
      .listOfRows();
    if (rows.isEmpty()) throw new BusinessException("Resource not found");
    return rows.getFirst();
  }

  private void changed(int n) {
    if (n == 0) throw new BusinessException("Resource not found");
  }

  private String categoryCode(
    String name,
    String requestedCode,
    Long parentId
  ) {
    if (requestedCode != null && !requestedCode.isBlank()) return normalizeCode(
      requestedCode
    );
    String ownCode = normalizeCode(name);
    if (parentId == null) return ownCode;
    String parentCode = db
      .sql("select code from catalog.categories where id=:id")
      .param("id", parentId)
      .query(String.class)
      .optional()
      .orElseThrow(() -> new BusinessException("Parent category not found"));
    return normalizeCode(parentCode + "-" + ownCode);
  }

  private String normalizeCode(String value) {
    return value
      .trim()
      .toUpperCase(Locale.ROOT)
      .replaceAll("[^A-Z0-9]+", "-")
      .replaceAll("(^-|-$)", "");
  }
}
