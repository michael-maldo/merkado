package biz.michael_maldo.merkado.pricing.controller;

import biz.michael_maldo.merkado.shared.exception.BusinessException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
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
public class PricingController {

  private final JdbcClient db;

  public record Price(
    @NotNull @DecimalMin("0") BigDecimal price,
    LocalDateTime effectiveFrom
  ) {}

  public record Band(
    @NotBlank String name,
    @NotNull @DecimalMin("0") BigDecimal minimumAmount,
    @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal percentage,
    Boolean active
  ) {}

  public record Promotion(
    @NotBlank String code,
    String description,
    @NotBlank String discountType,
    @NotNull @DecimalMin("0") BigDecimal discountValue,
    @NotNull LocalDateTime startsAt,
    @NotNull LocalDateTime endsAt,
    Boolean active
  ) {}

  @GetMapping("/pricing")
  public List<Map<String, Object>> pricing() {
    return db
      .sql(
        "select p.id product_id,v.id variant_id,v.sku,p.master_name name,v.variant_name,coalesce(pp.price,v.selling_price) price,pp.effective_from,pp.updated_at from catalog.products p join catalog.product_variants v on v.product_id=p.id left join pricing.product_pricing pp on pp.variant_id=v.id where p.active=true and v.active=true order by p.id,v.id"
      )
      .query()
      .listOfRows();
  }

  @GetMapping("/pricing/{productId}")
  public Map<String, Object> price(@PathVariable long productId) {
    var r = db
      .sql(
        "select p.id product_id,v.id variant_id,v.sku,p.master_name name,v.variant_name,coalesce(pp.price,v.selling_price) price,pp.effective_from,pp.updated_at from catalog.products p join catalog.product_variants v on v.product_id=p.id and v.is_default left join pricing.product_pricing pp on pp.variant_id=v.id where p.id=:id"
      )
      .param("id", productId)
      .query()
      .listOfRows();
    if (r.isEmpty()) throw new BusinessException("Product not found");
    return r.getFirst();
  }

  @GetMapping("/pricing/variants/{variantId}")
  public Map<String, Object> variantPrice(@PathVariable long variantId) {
    var r = db
      .sql(
        "select p.id product_id,v.id variant_id,v.sku,p.master_name name,v.variant_name,coalesce(pp.price,v.selling_price) price,pp.effective_from,pp.updated_at from catalog.product_variants v join catalog.products p on p.id=v.product_id left join pricing.product_pricing pp on pp.variant_id=v.id where v.id=:id"
      )
      .param("id", variantId)
      .query()
      .listOfRows();
    if (r.isEmpty()) throw new BusinessException("Variant not found");
    return r.getFirst();
  }

  @PatchMapping("/pricing/{productId}")
  @PreAuthorize("hasRole('MANAGEMENT')")
  @Transactional
  public Map<String, Object> updatePrice(
    @PathVariable long productId,
    @Valid @RequestBody Price r
  ) {
    Long variantId = db
      .sql(
        "select id from catalog.product_variants where product_id=:p and is_default"
      )
      .param("p", productId)
      .query(Long.class)
      .optional()
      .orElseThrow(() -> new BusinessException("Default variant not found"));
    persistVariantPrice(variantId, r);
    return price(productId);
  }

  @PatchMapping("/pricing/variants/{variantId}")
  @PreAuthorize("hasRole('MANAGEMENT')")
  @Transactional
  public Map<String, Object> updateVariantPrice(
    @PathVariable long variantId,
    @Valid @RequestBody Price r
  ) {
    persistVariantPrice(variantId, r);
    return variantPrice(variantId);
  }

  @GetMapping("/discount-bands")
  public List<Map<String, Object>> bands() {
    return list("pricing.discount_bands");
  }

  @GetMapping("/discount-bands/{id}")
  public Map<String, Object> band(@PathVariable long id) {
    return one("pricing.discount_bands", id);
  }

  @PostMapping("/discount-bands")
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasRole('MANAGEMENT')")
  @Transactional
  public Map<String, Object> createBand(@Valid @RequestBody Band r) {
    long id = db
      .sql(
        "insert into pricing.discount_bands(name,minimum_amount,percentage,active) values(:n,:m,:p,:a) returning id"
      )
      .param("n", r.name())
      .param("m", r.minimumAmount())
      .param("p", r.percentage())
      .param("a", r.active() == null || r.active())
      .query(Long.class)
      .single();
    return band(id);
  }

  @PatchMapping("/discount-bands/{id}")
  @PreAuthorize("hasRole('MANAGEMENT')")
  @Transactional
  public Map<String, Object> updateBand(
    @PathVariable long id,
    @Valid @RequestBody Band r
  ) {
    changed(
      db
        .sql(
          "update pricing.discount_bands set name=:n,minimum_amount=:m,percentage=:p,active=:a,updated_at=now() where id=:id"
        )
        .param("n", r.name())
        .param("m", r.minimumAmount())
        .param("p", r.percentage())
        .param("a", r.active() == null || r.active())
        .param("id", id)
        .update()
    );
    return band(id);
  }

  @DeleteMapping("/discount-bands/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @PreAuthorize("hasRole('MANAGEMENT')")
  @Transactional
  public void deleteBand(@PathVariable long id) {
    changed(
      db
        .sql(
          "update pricing.discount_bands set active=false,updated_at=now() where id=:id"
        )
        .param("id", id)
        .update()
    );
  }

  @GetMapping("/promotions")
  public List<Map<String, Object>> promotions() {
    return list("pricing.promotions");
  }

  @PostMapping("/promotions")
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasRole('MANAGEMENT')")
  @Transactional
  public Map<String, Object> createPromotion(@Valid @RequestBody Promotion r) {
    dates(r);
    long id = db
      .sql(
        "insert into pricing.promotions(code,description,discount_type,discount_value,starts_at,ends_at,active) values(:c,:d,:t,:v,:s,:e,:a) returning id"
      )
      .param("c", r.code())
      .param("d", r.description() == null ? "" : r.description())
      .param("t", r.discountType())
      .param("v", r.discountValue())
      .param("s", r.startsAt())
      .param("e", r.endsAt())
      .param("a", r.active() == null || r.active())
      .query(Long.class)
      .single();
    return one("pricing.promotions", id);
  }

  @PatchMapping("/promotions/{id}")
  @PreAuthorize("hasRole('MANAGEMENT')")
  @Transactional
  public Map<String, Object> updatePromotion(
    @PathVariable long id,
    @Valid @RequestBody Promotion r
  ) {
    dates(r);
    changed(
      db
        .sql(
          "update pricing.promotions set code=:c,description=:d,discount_type=:t,discount_value=:v,starts_at=:s,ends_at=:e,active=:a,updated_at=now() where id=:id"
        )
        .param("c", r.code())
        .param("d", r.description() == null ? "" : r.description())
        .param("t", r.discountType())
        .param("v", r.discountValue())
        .param("s", r.startsAt())
        .param("e", r.endsAt())
        .param("a", r.active() == null || r.active())
        .param("id", id)
        .update()
    );
    return one("pricing.promotions", id);
  }

  @DeleteMapping("/promotions/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @PreAuthorize("hasRole('MANAGEMENT')")
  @Transactional
  public void deletePromotion(@PathVariable long id) {
    changed(
      db
        .sql(
          "update pricing.promotions set active=false,updated_at=now() where id=:id"
        )
        .param("id", id)
        .update()
    );
  }

  private void persistVariantPrice(long variantId, Price r) {
    int n = db
      .sql(
        "insert into pricing.product_pricing(product_id,variant_id,price,effective_from) select product_id,id,:p,:e from catalog.product_variants where id=:id on conflict(variant_id) do update set price=excluded.price,effective_from=excluded.effective_from,updated_at=now()"
      )
      .param("id", variantId)
      .param("p", r.price())
      .param(
        "e",
        r.effectiveFrom() == null ? LocalDateTime.now() : r.effectiveFrom()
      )
      .update();
    if (n == 0) throw new BusinessException("Variant not found");
    db.sql(
      "update catalog.product_variants set selling_price=:p,updated_at=now() where id=:id"
    )
      .param("p", r.price())
      .param("id", variantId)
      .update();
    db.sql(
      "update catalog.products p set price=:x,updated_at=now() from catalog.product_variants v where v.id=:v and v.product_id=p.id and v.is_default"
    )
      .param("x", r.price())
      .param("v", variantId)
      .update();
  }

  private void dates(Promotion r) {
    if (!r.endsAt().isAfter(r.startsAt())) throw new BusinessException(
      "endsAt must be after startsAt"
    );
  }

  private List<Map<String, Object>> list(String t) {
    return db
      .sql("select * from " + t + " order by id")
      .query()
      .listOfRows();
  }

  private Map<String, Object> one(String t, long id) {
    var r = db
      .sql("select * from " + t + " where id=:id")
      .param("id", id)
      .query()
      .listOfRows();
    if (r.isEmpty()) throw new BusinessException("Resource not found");
    return r.getFirst();
  }

  private void changed(int n) {
    if (n == 0) throw new BusinessException("Resource not found");
  }
}
