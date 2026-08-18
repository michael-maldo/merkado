package biz.michael_maldo.merkado.warehouse.controller;

import biz.michael_maldo.merkado.orders.entity.OrderStatus;
import biz.michael_maldo.merkado.orders.service.OrderService;
import biz.michael_maldo.merkado.shared.exception.BusinessException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class WarehouseController {

  private final JdbcClient db;
  private final OrderService orders;

  @GetMapping("/shipments")
  public List<Map<String, Object>> shipments() {
    return db
      .sql(
        "select s.*,o.client_id,o.total from warehouse.shipments s join orders.sales_orders o on o.id=s.order_id order by s.created_at desc"
      )
      .query()
      .listOfRows();
  }

  @GetMapping("/shipments/{id}")
  public Map<String, Object> shipment(@PathVariable long id) {
    var r = db
      .sql(
        "select s.*,o.client_id,o.total from warehouse.shipments s join orders.sales_orders o on o.id=s.order_id where s.id=:id"
      )
      .param("id", id)
      .query()
      .listOfRows();
    if (r.isEmpty()) throw new BusinessException("Shipment not found");
    return r.getFirst();
  }

  @PatchMapping("/shipments/{id}/pack")
  @PreAuthorize("hasAnyRole('MANAGEMENT','WAREHOUSE')")
  @Transactional
  public Map<String, Object> pack(@PathVariable long id, Authentication a) {
    return transition(id, "PENDING", "PACKED", "PACK", a);
  }

  @PatchMapping("/shipments/{id}/dispatch")
  @PreAuthorize("hasAnyRole('MANAGEMENT','WAREHOUSE')")
  @Transactional
  public Map<String, Object> dispatch(@PathVariable long id, Authentication a) {
    return transition(id, "PACKED", "DISPATCHED", "DISPATCH", a);
  }

  @PatchMapping("/shipments/{id}/deliver")
  @PreAuthorize("hasAnyRole('MANAGEMENT','WAREHOUSE')")
  @Transactional
  public Map<String, Object> deliver(@PathVariable long id, Authentication a) {
    var delivered = transition(id, "DISPATCHED", "DELIVERED", "DELIVER", a);
    orders.transition(
      ((Number) delivered.get("order_id")).longValue(),
      OrderStatus.COMPLETED,
      a.getName(),
      "Delivery confirmed from shipment #" + id
    );
    return delivered;
  }

  /**
   * A waybill is created lazily the first time it is viewed.  Repeated requests
   * return the same tracking number, making this safe for the fulfilment UI to
   * refresh or reopen.
   */
  @GetMapping("/waybills/{shipmentId}")
  @Transactional
  public Map<String, Object> waybill(@PathVariable long shipmentId) {
    var s = shipment(shipmentId);
    if (s.get("tracking_number") == null) {
      db.sql(
        "update warehouse.shipments set tracking_number=:t,updated_at=now() where id=:id"
      )
        .param("t", trackingNumber())
        .param("id", shipmentId)
        .update();
      event(shipmentId, "WAYBILL_GENERATED", "Waybill generated", "system");
      s = shipment(shipmentId);
    }
    return Map.of(
      "shipmentId",
      shipmentId,
      "orderId",
      s.get("order_id"),
      "trackingNumber",
      s.get("tracking_number"),
      "carrier",
      s.get("carrier") == null ? "UNASSIGNED" : s.get("carrier"),
      "status",
      s.get("status")
    );
  }

  @PostMapping("/waybills/{shipmentId}/print")
  @PreAuthorize("hasAnyRole('MANAGEMENT','WAREHOUSE')")
  @Transactional
  public Map<String, Object> print(
    @PathVariable long shipmentId,
    Authentication a
  ) {
    var waybill = waybill(shipmentId);
    event(shipmentId, "WAYBILL_PRINTED", "Waybill printed", a.getName());
    return waybill;
  }

  @GetMapping("/fulfillment-events")
  public List<Map<String, Object>> events() {
    return db
      .sql(
        "select * from warehouse.fulfillment_events order by created_at desc"
      )
      .query()
      .listOfRows();
  }

  private String trackingNumber() {
    return "M-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase();
  }

  private Map<String, Object> transition(
    long id,
    String expected,
    String target,
    String event,
    Authentication a
  ) {
    var s = shipment(id);
    if (!expected.equals(s.get("status"))) throw new BusinessException(
      "Shipment must be " + expected
    );
    String column = switch (target) {
      case "PACKED" -> "packed_at";
      case "DISPATCHED" -> "dispatched_at";
      case "DELIVERED" -> "delivered_at";
      default -> throw new IllegalArgumentException();
    };
    db.sql(
      "update warehouse.shipments set status=:s," +
        column +
        "=now(),updated_at=now() where id=:id"
    )
      .param("s", target)
      .param("id", id)
      .update();
    event(id, event, null, a.getName());
    return shipment(id);
  }

  private void event(long id, String type, String note, String user) {
    db.sql(
      "insert into warehouse.fulfillment_events(shipment_id,event_type,note,created_by) values(:s,:t,:n,:u)"
    )
      .param("s", id)
      .param("t", type)
      .param("n", note == null ? "" : note)
      .param("u", user)
      .update();
  }
}
