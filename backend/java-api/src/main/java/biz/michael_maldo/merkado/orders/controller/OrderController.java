package biz.michael_maldo.merkado.orders.controller;

import biz.michael_maldo.merkado.catalog.repository.ProductRepository;
import biz.michael_maldo.merkado.catalog.repository.ProductVariantRepository;
import biz.michael_maldo.merkado.inventory.repository.StockRepository;
import biz.michael_maldo.merkado.orders.dto.OrderDtos;
import biz.michael_maldo.merkado.orders.entity.OrderStatus;
import biz.michael_maldo.merkado.orders.service.OrderService;
import biz.michael_maldo.merkado.shared.exception.BusinessException;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

  private final OrderService service;
  private final JdbcClient db;
  private final StockRepository stocks;
  private final ProductRepository products;
  private final ProductVariantRepository variants;

  public record Status(OrderStatus status) {}

  public record Failure(String reason) {}

  public record Update(Long clientId, String notes) {}

  public record Discount(String code, String description, BigDecimal amount) {}

  public record ItemRequest(Long productId, Long variantId, int quantity) {}

  public record Quantity(int quantity) {}

  @GetMapping
  public List<OrderDtos.View> list(
    @RequestParam(required = false) OrderStatus status
  ) {
    return status == null ? service.list() : service.list(status);
  }

  @GetMapping("/status-counts")
  public List<Map<String, Object>> statusCounts() {
    return db
      .sql(
        "select status, count(*) order_count, coalesce(sum(total),0) order_total from orders.sales_orders group by status"
      )
      .query()
      .listOfRows();
  }

  @GetMapping("/{id}")
  public OrderDtos.View get(@PathVariable Long id) {
    return service.get(id);
  }

  @PostMapping
  public OrderDtos.View create(
    @Valid @RequestBody OrderDtos.Create request,
    Authentication auth
  ) {
    return service.create(request, auth.getName());
  }

  @PostMapping("/{id}/verify-payment")
  @PreAuthorize("hasRole('MANAGEMENT')")
  public OrderDtos.View verify(@PathVariable Long id) {
    return service.transition(id, OrderStatus.PAYMENT_VERIFIED);
  }

  @PostMapping("/{id}/pack")
  @PreAuthorize("hasAnyRole('MANAGEMENT','WAREHOUSE')")
  public OrderDtos.View pack(@PathVariable Long id) {
    return service.transition(id, OrderStatus.PACKED);
  }

  @PostMapping("/{id}/dispatch")
  @PreAuthorize("hasAnyRole('MANAGEMENT','WAREHOUSE')")
  public OrderDtos.View dispatch(@PathVariable Long id) {
    return service.transition(id, OrderStatus.DISPATCHED);
  }

  @PostMapping("/{id}/cancel")
  @PreAuthorize("hasAnyRole('MANAGEMENT','SALES_AGENT')")
  public OrderDtos.View cancel(@PathVariable Long id) {
    return service.transition(id, OrderStatus.CANCELLED);
  }

  @PatchMapping("/{id}")
  @Transactional
  public OrderDtos.View update(@PathVariable Long id, @RequestBody Update r) {
    if (r.clientId() != null) changed(
      db
        .sql(
          "update orders.sales_orders set client_id=:c,updated_at=now() where id=:id and status='PAYMENT_PENDING'"
        )
        .param("c", r.clientId())
        .param("id", id)
        .update()
    );
    if (r.notes() != null) changed(
      db
        .sql(
          "update orders.sales_orders set notes=:n,updated_at=now() where id=:id and status='PAYMENT_PENDING'"
        )
        .param("n", r.notes())
        .param("id", id)
        .update()
    );
    return service.get(id);
  }

  @DeleteMapping("/{id}")
  public OrderDtos.View delete(@PathVariable Long id) {
    return service.transition(id, OrderStatus.CANCELLED);
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasRole('MANAGEMENT')")
  public OrderDtos.View status(@PathVariable Long id, @RequestBody Status r) {
    return service.transition(id, r.status());
  }

  @PatchMapping("/{id}/cancel")
  public OrderDtos.View patchCancel(@PathVariable Long id) {
    return service.transition(id, OrderStatus.CANCELLED);
  }

  @PatchMapping("/{id}/complete")
  public OrderDtos.View complete(@PathVariable Long id) {
    return service.transition(id, OrderStatus.COMPLETED);
  }

  @PostMapping("/{id}/fail")
  @PreAuthorize("hasRole('MANAGEMENT')")
  public OrderDtos.View fail(
    @PathVariable Long id,
    @RequestBody Failure request,
    Authentication auth
  ) {
    if (
      request.reason() == null || request.reason().isBlank()
    ) throw new BusinessException("A failure reason is required");
    return service.transition(
      id,
      OrderStatus.FAILED,
      auth.getName(),
      request.reason().trim()
    );
  }

  @GetMapping("/{id}/items")
  public List<Map<String, Object>> items(@PathVariable long id) {
    service.get(id);
    return db
      .sql("select * from orders.order_items where order_id=:id order by id")
      .param("id", id)
      .query()
      .listOfRows();
  }

  @PostMapping("/{id}/items")
  @ResponseStatus(HttpStatus.CREATED)
  @Transactional
  public OrderDtos.View addItem(
    @PathVariable long id,
    @RequestBody ItemRequest r
  ) {
    pending(id);
    if (r.quantity() < 1) throw new BusinessException(
      "Quantity must be positive"
    );
    var v =
      r.variantId() != null
        ? variants
            .findById(r.variantId())
            .orElseThrow(() -> new BusinessException("Variant not found"))
        : variants
            .findByProductIdAndDefaultVariantTrue(r.productId())
            .orElseThrow(() ->
              new BusinessException("Default variant not found")
            );
    var p = v.getProduct();
    if (!p.isActive() || !v.isActive()) throw new BusinessException(
      "Product or variant is inactive"
    );
    var s = stocks
      .findByVariantIdForUpdate(v.getId())
      .orElseThrow(() -> new BusinessException("Stock not found"));
    if (s.getAvailable() < r.quantity()) throw new BusinessException(
      "Insufficient stock"
    );
    s.setReserved(s.getReserved() + r.quantity());
    changed(
      db
        .sql(
          "insert into orders.order_items(order_id,product_id,variant_id,spu,sku,barcode,product_name,variant_name,variant_options,quantity,unit_price,line_total) values(:o,:p,:v,:spu,:s,:b,:n,:vn,(select coalesce(jsonb_object_agg(t.name,ov.value) filter (where t.id is not null),'{}'::jsonb) from catalog.variant_option_assignments a join catalog.variant_option_types t on t.id=a.option_type_id join catalog.variant_option_values ov on ov.id=a.option_value_id where a.variant_id=:v),:q,:u,:t)"
        )
        .param("o", id)
        .param("p", p.getId())
        .param("v", v.getId())
        .param("spu", p.getSpu())
        .param("s", v.getSku())
        .param("b", v.getBarcode())
        .param("n", p.getMasterName())
        .param("vn", v.getVariantName())
        .param("q", r.quantity())
        .param("u", v.getSellingPrice())
        .param(
          "t",
          v.getSellingPrice().multiply(BigDecimal.valueOf(r.quantity()))
        )
        .update()
    );
    recalculate(id);
    return service.get(id);
  }

  @PatchMapping("/{id}/items/{itemId}")
  @Transactional
  public OrderDtos.View updateItem(
    @PathVariable long id,
    @PathVariable long itemId,
    @RequestBody Quantity r
  ) {
    pending(id);
    if (r.quantity() < 1) throw new BusinessException(
      "Quantity must be positive"
    );
    var item = item(id, itemId);
    long variantId = ((Number) item.get("variant_id")).longValue();
    int previous = ((Number) item.get("quantity")).intValue();
    int delta = r.quantity() - previous;
    var s = stocks
      .findByVariantIdForUpdate(variantId)
      .orElseThrow(() -> new BusinessException("Stock not found"));
    if (delta > 0 && s.getAvailable() < delta) throw new BusinessException(
      "Insufficient stock"
    );
    s.setReserved(s.getReserved() + delta);
    changed(
      db
        .sql(
          "update orders.order_items set quantity=:q,line_total=unit_price*:q where id=:i and order_id=:o"
        )
        .param("q", r.quantity())
        .param("i", itemId)
        .param("o", id)
        .update()
    );
    recalculate(id);
    return service.get(id);
  }

  @DeleteMapping("/{id}/items/{itemId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @Transactional
  public void removeItem(@PathVariable long id, @PathVariable long itemId) {
    pending(id);
    var item = item(id, itemId);
    var s = stocks
      .findByVariantIdForUpdate(((Number) item.get("variant_id")).longValue())
      .orElseThrow(() -> new BusinessException("Stock not found"));
    s.setReserved(s.getReserved() - ((Number) item.get("quantity")).intValue());
    changed(
      db
        .sql("delete from orders.order_items where id=:i and order_id=:o")
        .param("i", itemId)
        .param("o", id)
        .update()
    );
    recalculate(id);
  }

  @PostMapping("/{id}/discounts")
  @ResponseStatus(HttpStatus.CREATED)
  @Transactional
  public Map<String, Object> discount(
    @PathVariable long id,
    @RequestBody Discount r
  ) {
    pending(id);
    long did = db
      .sql(
        "insert into orders.order_discounts(order_id,code,description,amount) values(:o,:c,:d,:a) returning id"
      )
      .param("o", id)
      .param("c", r.code() == null ? "" : r.code())
      .param("d", r.description() == null ? "" : r.description())
      .param("a", r.amount())
      .query(Long.class)
      .single();
    recalculate(id);
    return db
      .sql("select * from orders.order_discounts where id=:id")
      .param("id", did)
      .query()
      .singleRow();
  }

  @DeleteMapping("/{id}/discounts/{discountId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @Transactional
  public void removeDiscount(
    @PathVariable long id,
    @PathVariable long discountId
  ) {
    pending(id);
    changed(
      db
        .sql("delete from orders.order_discounts where order_id=:o and id=:i")
        .param("o", id)
        .param("i", discountId)
        .update()
    );
    recalculate(id);
  }

  @GetMapping("/{id}/history")
  public List<Map<String, Object>> history(@PathVariable long id) {
    service.get(id);
    return db
      .sql(
        "select * from orders.order_history where order_id=:id order by created_at"
      )
      .param("id", id)
      .query()
      .listOfRows();
  }

  private void pending(long id) {
    var o = service.get(id);
    if (o.status() != OrderStatus.PAYMENT_PENDING) throw new BusinessException(
      "Only pending orders can be edited"
    );
  }

  private void recalculate(long id) {
    db.sql(
      "update orders.sales_orders set total=greatest(coalesce((select sum(line_total) from orders.order_items where order_id=:id),0)-coalesce((select sum(amount) from orders.order_discounts where order_id=:id),0),0),discount_total=coalesce((select sum(amount) from orders.order_discounts where order_id=:id),0),updated_at=now() where id=:id"
    )
      .param("id", id)
      .update();
  }

  private void changed(int n) {
    if (n == 0) throw new BusinessException(
      "Resource not found or order cannot be changed"
    );
  }

  private Map<String, Object> item(long order, long item) {
    var rows = db
      .sql("select * from orders.order_items where order_id=:o and id=:i")
      .param("o", order)
      .param("i", item)
      .query()
      .listOfRows();
    if (rows.isEmpty()) throw new BusinessException("Order item not found");
    return rows.getFirst();
  }
}
