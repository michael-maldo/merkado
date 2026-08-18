package biz.michael_maldo.merkado.inventory.controller;

import biz.michael_maldo.merkado.catalog.repository.ProductRepository;
import biz.michael_maldo.merkado.inventory.entity.Stock;
import biz.michael_maldo.merkado.inventory.repository.StockRepository;
import biz.michael_maldo.merkado.shared.exception.BusinessException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class InventoryController {

  private final StockRepository stocks;
  private final ProductRepository products;
  private final JdbcClient db;

  public record Quantity(@Min(1) int quantity, String note) {}

  public record Adjustment(@NotNull Integer quantity, String note) {}

  public record Reservation(
    Long productId,
    Long variantId,
    Long orderId,
    @Min(1) int quantity,
    LocalDateTime expiresAt
  ) {}

  public record StockView(
    Long productId,
    Long variantId,
    String sku,
    String productName,
    String variantName,
    int quantity,
    int reserved,
    int available
  ) {
    static StockView from(Stock s) {
      return new StockView(
        s.getProduct().getId(),
        s.getVariant().getId(),
        s.getVariant().getSku(),
        s.getProduct().getMasterName(),
        s.getVariant().getVariantName(),
        s.getQuantity(),
        s.getReserved(),
        s.getAvailable()
      );
    }
  }

  @GetMapping("/inventory")
  @Transactional(readOnly = true)
  public List<StockView> inventory() {
    return stocks.findAll().stream().map(StockView::from).toList();
  }

  @GetMapping("/inventory/{productId}")
  @Transactional(readOnly = true)
  public StockView stock(@PathVariable Long productId) {
    return StockView.from(find(productId));
  }

  @GetMapping("/inventory/variants/{variantId}")
  @Transactional(readOnly = true)
  public StockView variantStock(@PathVariable Long variantId) {
    return StockView.from(findVariant(variantId));
  }

  @PatchMapping("/inventory/{productId}/adjust")
  @Transactional
  public StockView adjust(
    @PathVariable Long productId,
    @Valid @RequestBody Adjustment r,
    Authentication a
  ) {
    Stock s = lock(productId);
    int next = s.getQuantity() + r.quantity();
    if (next < s.getReserved() || next < 0) throw new BusinessException(
      "Adjustment would make stock lower than reserved or zero"
    );
    s.setQuantity(next);
    movement(s, "ADJUST", r.quantity(), r.note(), a.getName());
    return StockView.from(s);
  }

  @PostMapping("/inventory/{productId}/reserve")
  @Transactional
  public StockView reserve(
    @PathVariable Long productId,
    @Valid @RequestBody Quantity r,
    Authentication a
  ) {
    Stock s = lock(productId);
    if (s.getAvailable() < r.quantity()) throw new BusinessException(
      "Insufficient available stock"
    );
    s.setReserved(s.getReserved() + r.quantity());
    movement(s, "RESERVE", r.quantity(), r.note(), a.getName());
    return StockView.from(s);
  }

  @PostMapping("/inventory/{productId}/release")
  @Transactional
  public StockView release(
    @PathVariable Long productId,
    @Valid @RequestBody Quantity r,
    Authentication a
  ) {
    Stock s = lock(productId);
    if (s.getReserved() < r.quantity()) throw new BusinessException(
      "Cannot release more than reserved"
    );
    s.setReserved(s.getReserved() - r.quantity());
    movement(s, "RELEASE", r.quantity(), r.note(), a.getName());
    return StockView.from(s);
  }

  @PostMapping("/inventory/{productId}/deduct")
  @Transactional
  public StockView deduct(
    @PathVariable Long productId,
    @Valid @RequestBody Quantity r,
    Authentication a
  ) {
    Stock s = lock(productId);
    if (s.getQuantity() < r.quantity()) throw new BusinessException(
      "Insufficient physical stock"
    );
    int fromReserved = Math.min(s.getReserved(), r.quantity());
    s.setReserved(s.getReserved() - fromReserved);
    s.setQuantity(s.getQuantity() - r.quantity());
    movement(s, "DEDUCT", r.quantity(), r.note(), a.getName());
    return StockView.from(s);
  }

  @PatchMapping("/inventory/variants/{variantId}/adjust")
  @Transactional
  public StockView adjustVariant(
    @PathVariable Long variantId,
    @Valid @RequestBody Adjustment r,
    Authentication a
  ) {
    Stock s = lockVariant(variantId);
    int next = s.getQuantity() + r.quantity();
    if (next < s.getReserved() || next < 0) throw new BusinessException(
      "Adjustment would make stock lower than reserved or zero"
    );
    s.setQuantity(next);
    movement(s, "ADJUST", r.quantity(), r.note(), a.getName());
    return StockView.from(s);
  }

  @PostMapping("/inventory/variants/{variantId}/reserve")
  @Transactional
  public StockView reserveVariant(
    @PathVariable Long variantId,
    @Valid @RequestBody Quantity r,
    Authentication a
  ) {
    Stock s = lockVariant(variantId);
    if (s.getAvailable() < r.quantity()) throw new BusinessException(
      "Insufficient available stock"
    );
    s.setReserved(s.getReserved() + r.quantity());
    movement(s, "RESERVE", r.quantity(), r.note(), a.getName());
    return StockView.from(s);
  }

  @PostMapping("/inventory/variants/{variantId}/release")
  @Transactional
  public StockView releaseVariant(
    @PathVariable Long variantId,
    @Valid @RequestBody Quantity r,
    Authentication a
  ) {
    Stock s = lockVariant(variantId);
    if (s.getReserved() < r.quantity()) throw new BusinessException(
      "Cannot release more than reserved"
    );
    s.setReserved(s.getReserved() - r.quantity());
    movement(s, "RELEASE", r.quantity(), r.note(), a.getName());
    return StockView.from(s);
  }

  @PostMapping("/inventory/variants/{variantId}/deduct")
  @Transactional
  public StockView deductVariant(
    @PathVariable Long variantId,
    @Valid @RequestBody Quantity r,
    Authentication a
  ) {
    Stock s = lockVariant(variantId);
    if (s.getQuantity() < r.quantity()) throw new BusinessException(
      "Insufficient physical stock"
    );
    int fromReserved = Math.min(s.getReserved(), r.quantity());
    s.setReserved(s.getReserved() - fromReserved);
    s.setQuantity(s.getQuantity() - r.quantity());
    movement(s, "DEDUCT", r.quantity(), r.note(), a.getName());
    return StockView.from(s);
  }

  @GetMapping("/stock-movements")
  public List<Map<String, Object>> movements() {
    return db
      .sql(
        "select m.*,v.sku,p.master_name product_name,v.variant_name from inventory.stock_movements m join catalog.product_variants v on v.id=m.variant_id join catalog.products p on p.id=m.product_id order by m.created_at desc"
      )
      .query()
      .listOfRows();
  }

  @GetMapping("/stock-movements/{id}")
  public Map<String, Object> movement(@PathVariable long id) {
    return row("select * from inventory.stock_movements where id=:id", id);
  }

  @GetMapping("/reservations")
  public List<Map<String, Object>> reservations() {
    return db
      .sql("select * from inventory.reservations order by created_at desc")
      .query()
      .listOfRows();
  }

  @GetMapping("/reservations/{id}")
  public Map<String, Object> reservation(@PathVariable long id) {
    return row("select * from inventory.reservations where id=:id", id);
  }

  @GetMapping("/reservations/{id}/status")
  public Map<String, Object> reservationStatus(@PathVariable long id) {
    var r = reservation(id);
    return Map.of("id", id, "status", r.get("status"));
  }

  @PostMapping("/reservations")
  @ResponseStatus(HttpStatus.CREATED)
  @Transactional
  public Map<String, Object> createReservation(
    @Valid @RequestBody Reservation r,
    Authentication a
  ) {
    Stock s =
      r.variantId() != null
        ? lockVariant(r.variantId())
        : lock(
            Objects.requireNonNull(
              r.productId(),
              "productId or variantId is required"
            )
          );
    if (s.getAvailable() < r.quantity()) throw new BusinessException(
      "Insufficient available stock"
    );
    s.setReserved(s.getReserved() + r.quantity());
    movement(s, "RESERVE", r.quantity(), "Reservation", a.getName());
    long id = db
      .sql(
        "insert into inventory.reservations(product_id,variant_id,order_id,quantity,status,expires_at,created_by) values(:p,:v,:o,:q,'ACTIVE',:e,:u) returning id"
      )
      .param("p", s.getProduct().getId())
      .param("v", s.getVariant().getId())
      .param("o", r.orderId(), java.sql.Types.BIGINT)
      .param("q", r.quantity())
      .param("e", r.expiresAt())
      .param("u", a.getName())
      .query(Long.class)
      .single();
    return reservation(id);
  }

  @PatchMapping("/reservations/{id}/confirm")
  @Transactional
  public Map<String, Object> confirm(@PathVariable long id, Authentication a) {
    return transitionReservation(id, "CONFIRMED", true, a);
  }

  @PatchMapping("/reservations/{id}/release")
  @Transactional
  public Map<String, Object> releaseReservation(
    @PathVariable long id,
    Authentication a
  ) {
    return transitionReservation(id, "RELEASED", false, a);
  }

  @PatchMapping("/reservations/{id}/expire")
  @Transactional
  public Map<String, Object> expireReservation(
    @PathVariable long id,
    Authentication a
  ) {
    return transitionReservation(id, "EXPIRED", false, a);
  }

  private Map<String, Object> transitionReservation(
    long id,
    String target,
    boolean deduct,
    Authentication a
  ) {
    var r = reservation(id);
    if (!"ACTIVE".equals(r.get("status"))) throw new BusinessException(
      "Reservation is not active"
    );
    long v = ((Number) r.get("variant_id")).longValue();
    int q = ((Number) r.get("quantity")).intValue();
    if (deduct) deductVariant(v, new Quantity(q, "Reservation " + id), a);
    else releaseVariant(v, new Quantity(q, "Reservation " + id), a);
    db.sql(
      "update inventory.reservations set status=:s,updated_at=now() where id=:id"
    )
      .param("s", target)
      .param("id", id)
      .update();
    return reservation(id);
  }

  private Stock find(Long id) {
    return stocks
      .findAllByProductId(id)
      .stream()
      .filter(s -> s.getVariant().isDefaultVariant())
      .findFirst()
      .orElseThrow(() -> new BusinessException("Stock not found"));
  }

  private Stock lock(Long id) {
    return stocks
      .findAllByProductId(id)
      .stream()
      .filter(s -> s.getVariant().isDefaultVariant())
      .findFirst()
      .map(s -> lockVariant(s.getVariant().getId()))
      .orElseThrow(() -> new BusinessException("Stock not found"));
  }

  private Stock findVariant(Long id) {
    return stocks
      .findByVariantId(id)
      .orElseThrow(() -> new BusinessException("Stock not found"));
  }

  private Stock lockVariant(Long id) {
    return stocks
      .findByVariantIdForUpdate(id)
      .orElseThrow(() -> new BusinessException("Stock not found"));
  }

  private void movement(Stock s, String type, int q, String note, String user) {
    db.sql(
      "insert into inventory.stock_movements(product_id,variant_id,movement_type,quantity,note,created_by) values(:p,:v,:t,:q,:n,:u)"
    )
      .param("p", s.getProduct().getId())
      .param("v", s.getVariant().getId())
      .param("t", type)
      .param("q", q)
      .param("n", note)
      .param("u", user)
      .update();
  }

  private Map<String, Object> row(String sql, long id) {
    var rows = db.sql(sql).param("id", id).query().listOfRows();
    if (rows.isEmpty()) throw new BusinessException("Resource not found");
    return rows.getFirst();
  }
}
