package biz.michael_maldo.merkado.carts.controller;

import biz.michael_maldo.merkado.orders.dto.OrderDtos;
import biz.michael_maldo.merkado.orders.service.OrderService;
import biz.michael_maldo.merkado.shared.exception.BusinessException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.sql.Types;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/carts")
@RequiredArgsConstructor
public class CartController {

  private final JdbcClient db;
  private final OrderService orders;

  public record Create(Long clientId, LocalDateTime expiresAt) {}

  public record Item(Long productId, Long variantId, @Min(1) int quantity) {}

  public record Quantity(@Min(1) int quantity) {}

  public record Discount(
    String code,
    @NotNull @DecimalMin("0") BigDecimal amount
  ) {}

  @GetMapping
  public List<Map<String, Object>> list() {
    return db
      .sql("select * from carts.carts order by created_at desc")
      .query()
      .listOfRows();
  }

  @GetMapping("/{id}")
  public Map<String, Object> get(@PathVariable long id) {
    return cart(id);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @Transactional
  public Map<String, Object> create(@RequestBody Create r, Authentication a) {
    long id = db
      .sql(
        "insert into carts.carts(client_id,created_by,expires_at) values(:c,:u,:e) returning id"
      )
      .param("c", r.clientId(), Types.BIGINT)
      .param("u", a.getName())
      .param(
        "e",
        r.expiresAt() == null ? LocalDateTime.now().plusDays(1) : r.expiresAt()
      )
      .query(Long.class)
      .single();
    return cart(id);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @Transactional
  public void delete(@PathVariable long id) {
    changed(
      db.sql("delete from carts.carts where id=:id").param("id", id).update()
    );
  }

  @PatchMapping("/{id}/expire")
  @Transactional
  public Map<String, Object> expire(@PathVariable long id) {
    state(id, "EXPIRED");
    return cart(id);
  }

  @GetMapping("/{id}/items")
  public List<Map<String, Object>> items(@PathVariable long id) {
    cart(id);
    return db
      .sql(
        "select i.*,v.sku,v.barcode,v.variant_name,p.master_name product_name from carts.cart_items i join catalog.product_variants v on v.id=i.variant_id join catalog.products p on p.id=i.product_id where cart_id=:id order by i.id"
      )
      .param("id", id)
      .query()
      .listOfRows();
  }

  @PostMapping("/{id}/items")
  @ResponseStatus(HttpStatus.CREATED)
  @Transactional
  public Map<String, Object> add(
    @PathVariable long id,
    @Valid @RequestBody Item r
  ) {
    active(id);
    long iid = db
      .sql(
        "insert into carts.cart_items(cart_id,product_id,variant_id,quantity,unit_price) select :c,p.id,v.id,:q,v.selling_price from catalog.product_variants v join catalog.products p on p.id=v.product_id where v.id=coalesce(:v,(select id from catalog.product_variants where product_id=:p and is_default)) and p.active=true and v.active=true on conflict(cart_id,variant_id) do update set quantity=carts.cart_items.quantity+excluded.quantity returning id"
      )
      .param("c", id)
      .param("p", r.productId(), Types.BIGINT)
      .param("v", r.variantId(), Types.BIGINT)
      .param("q", r.quantity())
      .query(Long.class)
      .optional()
      .orElseThrow(() -> new BusinessException("Product variant not found"));
    return item(id, iid);
  }

  @PatchMapping("/{id}/items/{itemId}")
  @Transactional
  public Map<String, Object> updateItem(
    @PathVariable long id,
    @PathVariable long itemId,
    @Valid @RequestBody Quantity r
  ) {
    active(id);
    changed(
      db
        .sql(
          "update carts.cart_items set quantity=:q where id=:i and cart_id=:c"
        )
        .param("q", r.quantity())
        .param("i", itemId)
        .param("c", id)
        .update()
    );
    return item(id, itemId);
  }

  @DeleteMapping("/{id}/items/{itemId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @Transactional
  public void removeItem(@PathVariable long id, @PathVariable long itemId) {
    active(id);
    changed(
      db
        .sql("delete from carts.cart_items where id=:i and cart_id=:c")
        .param("i", itemId)
        .param("c", id)
        .update()
    );
  }

  @GetMapping("/{id}/summary")
  public Map<String, Object> summary(@PathVariable long id) {
    cart(id);
    return db
      .sql(
        "select :id cart_id,coalesce(sum(i.quantity*i.unit_price),0) subtotal,coalesce((select sum(amount) from carts.cart_discounts where cart_id=:id),0) discount_total,greatest(coalesce(sum(i.quantity*i.unit_price),0)-coalesce((select sum(amount) from carts.cart_discounts where cart_id=:id),0),0) total from carts.cart_items i where cart_id=:id"
      )
      .param("id", id)
      .query()
      .singleRow();
  }

  @PostMapping("/{id}/validate")
  public Map<String, Object> validate(@PathVariable long id) {
    active(id);
    var invalid = db
      .sql(
        "select i.product_id,i.variant_id,i.quantity,(s.quantity-s.reserved) available from carts.cart_items i left join inventory.stock s on s.variant_id=i.variant_id where i.cart_id=:id and (s.id is null or s.quantity-s.reserved<i.quantity)"
      )
      .param("id", id)
      .query()
      .listOfRows();
    return Map.of("valid", invalid.isEmpty(), "errors", invalid);
  }

  @PostMapping("/{id}/checkout")
  @Transactional
  public OrderDtos.View checkout(@PathVariable long id, Authentication a) {
    var c = active(id);
    var check = validate(id);
    if (!Boolean.TRUE.equals(check.get("valid"))) throw new BusinessException(
      "Cart contains unavailable items"
    );
    List<OrderDtos.ItemRequest> req = items(id)
      .stream()
      .map(x ->
        new OrderDtos.ItemRequest(
          ((Number) x.get("product_id")).longValue(),
          ((Number) x.get("variant_id")).longValue(),
          ((Number) x.get("quantity")).intValue()
        )
      )
      .toList();
    Object client = c.get("client_id");
    if (client == null) throw new BusinessException(
      "Cart requires a client before checkout"
    );
    var order = orders.create(
      new OrderDtos.Create(((Number) client).longValue(), req),
      a.getName()
    );
    state(id, "CHECKED_OUT");
    return order;
  }

  @PostMapping("/{id}/discounts")
  @ResponseStatus(HttpStatus.CREATED)
  @Transactional
  public Map<String, Object> discount(
    @PathVariable long id,
    @Valid @RequestBody Discount r
  ) {
    active(id);
    long did = db
      .sql(
        "insert into carts.cart_discounts(cart_id,code,amount) values(:c,:x,:a) returning id"
      )
      .param("c", id)
      .param("x", r.code() == null ? "" : r.code())
      .param("a", r.amount())
      .query(Long.class)
      .single();
    return discount(id, did);
  }

  @DeleteMapping("/{id}/discounts/{discountId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @Transactional
  public void removeDiscount(
    @PathVariable long id,
    @PathVariable long discountId
  ) {
    changed(
      db
        .sql("delete from carts.cart_discounts where cart_id=:c and id=:i")
        .param("c", id)
        .param("i", discountId)
        .update()
    );
  }

  private Map<String, Object> cart(long id) {
    var r = db
      .sql("select * from carts.carts where id=:id")
      .param("id", id)
      .query()
      .listOfRows();
    if (r.isEmpty()) throw new BusinessException("Cart not found");
    return r.getFirst();
  }

  private Map<String, Object> active(long id) {
    var c = cart(id);
    if (!"ACTIVE".equals(c.get("status"))) throw new BusinessException(
      "Cart is not active"
    );
    return c;
  }

  private void state(long id, String s) {
    changed(
      db
        .sql("update carts.carts set status=:s,updated_at=now() where id=:id")
        .param("s", s)
        .param("id", id)
        .update()
    );
  }

  private void changed(int n) {
    if (n == 0) throw new BusinessException("Resource not found");
  }

  private Map<String, Object> item(long c, long i) {
    var r = db
      .sql("select * from carts.cart_items where cart_id=:c and id=:i")
      .param("c", c)
      .param("i", i)
      .query()
      .listOfRows();
    if (r.isEmpty()) throw new BusinessException("Cart item not found");
    return r.getFirst();
  }

  private Map<String, Object> discount(long c, long i) {
    var r = db
      .sql("select * from carts.cart_discounts where cart_id=:c and id=:i")
      .param("c", c)
      .param("i", i)
      .query()
      .listOfRows();
    if (r.isEmpty()) throw new BusinessException("Discount not found");
    return r.getFirst();
  }
}
