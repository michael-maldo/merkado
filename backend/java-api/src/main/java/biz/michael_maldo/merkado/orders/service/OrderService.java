package biz.michael_maldo.merkado.orders.service;

import biz.michael_maldo.merkado.catalog.repository.ProductRepository;
import biz.michael_maldo.merkado.catalog.repository.ProductVariantRepository;
import biz.michael_maldo.merkado.clients.repository.ClientRepository;
import biz.michael_maldo.merkado.inventory.repository.StockRepository;
import biz.michael_maldo.merkado.orders.dto.OrderDtos;
import biz.michael_maldo.merkado.orders.entity.*;
import biz.michael_maldo.merkado.orders.repository.SalesOrderRepository;
import biz.michael_maldo.merkado.shared.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.simple.JdbcClient;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service @RequiredArgsConstructor
public class OrderService {
    private final SalesOrderRepository orders;
    private final ClientRepository clients;
    private final ProductRepository products;
    private final ProductVariantRepository variants;
    private final StockRepository stocks;
    private final JdbcClient db;
    private final ObjectMapper objectMapper;

    @Transactional
    public OrderDtos.View create(OrderDtos.Create request, String username) {
        var order = new SalesOrder();
        order.setClient(clients.findById(request.clientId()).orElseThrow(() -> new BusinessException("Client not found")));
        order.setCreatedBy(username); order.setStatus(OrderStatus.PAYMENT_PENDING);
        BigDecimal total = BigDecimal.ZERO;
        Set<Long> seen = new HashSet<>();
        for (var requested : request.items()) {
            var variant = requested.variantId() != null
                ? variants.findById(requested.variantId()).filter(v -> v.isActive() && v.getProduct().isActive()).orElseThrow(() -> new BusinessException("Variant not found or inactive"))
                : variants.findByProductIdAndDefaultVariantTrue(Objects.requireNonNull(requested.productId(), "productId or variantId is required")).filter(v -> v.isActive() && v.getProduct().isActive()).orElseThrow(() -> new BusinessException("Default variant not found or inactive"));
            if (!seen.add(variant.getId())) throw new BusinessException("Duplicate variants are not allowed");
            var product = variant.getProduct();
            var stock = stocks.findByVariantIdForUpdate(variant.getId()).orElseThrow(() -> new BusinessException("No stock record for " + variant.getSku()));
            if (stock.getAvailable() < requested.quantity()) throw new BusinessException("Insufficient stock for " + variant.getSku());
            stock.setReserved(stock.getReserved() + requested.quantity());
            var item = new OrderItem(); item.setProduct(product); item.setVariant(variant); item.setSpu(product.getSpu()); item.setSku(variant.getSku()); item.setBarcode(variant.getBarcode()); item.setProductName(product.getMasterName()); item.setVariantName(variant.getVariantName());
            item.setVariantOptions(db.sql("select coalesce(jsonb_object_agg(t.name,v.value) filter (where t.id is not null),'{}'::jsonb)::text from catalog.variant_option_assignments a join catalog.variant_option_types t on t.id=a.option_type_id join catalog.variant_option_values v on v.id=a.option_value_id where a.variant_id=:id").param("id", variant.getId()).query(String.class).optional().map(this::optionSnapshot).orElseGet(LinkedHashMap::new));
            item.setQuantity(requested.quantity()); item.setUnitPrice(variant.getSellingPrice()); item.setLineTotal(variant.getSellingPrice().multiply(BigDecimal.valueOf(requested.quantity())));
            total = total.add(item.getLineTotal()); order.addItem(item);
        }
        order.setTotal(total); return OrderDtos.View.from(orders.save(order));
    }
    @SuppressWarnings("unchecked")
    private Map<String,String> optionSnapshot(String json) {
        try { return objectMapper.readValue(json, LinkedHashMap.class); }
        catch (com.fasterxml.jackson.core.JsonProcessingException error) { throw new BusinessException("Could not snapshot variant options"); }
    }

    @Transactional(readOnly = true) public List<OrderDtos.View> list() { return orders.findAllByOrderByCreatedAtDesc().stream().map(OrderDtos.View::from).toList(); }
    @Transactional(readOnly = true) public List<OrderDtos.View> list(OrderStatus status) { return orders.findByStatusOrderByCreatedAtDesc(status).stream().map(OrderDtos.View::from).toList(); }
    @Transactional(readOnly = true) public OrderDtos.View get(Long id) { return OrderDtos.View.from(order(id)); }

    @Transactional
    public OrderDtos.View transition(Long id, OrderStatus target) {
        return transition(id, target, "system", null);
    }

    @Transactional
    public OrderDtos.View transition(Long id, OrderStatus target, String changedBy, String note) {
        var order = orders.findById(id).orElseThrow(() -> new BusinessException("Order not found"));
        var current = order.getStatus();
        boolean allowed = (current == OrderStatus.PAYMENT_PENDING && (target == OrderStatus.PAYMENT_VERIFIED || target == OrderStatus.CANCELLED))
                || (current == OrderStatus.PAYMENT_VERIFIED && target == OrderStatus.PACKED)
                || (current == OrderStatus.PACKED && target == OrderStatus.DISPATCHED)
                || (current == OrderStatus.DISPATCHED && target == OrderStatus.COMPLETED)
                || ((current == OrderStatus.PAYMENT_PENDING || current == OrderStatus.PAYMENT_VERIFIED || current == OrderStatus.PACKED) && target == OrderStatus.FAILED);
        if (!allowed) throw new BusinessException("Cannot change order from " + current + " to " + target);
        if (target == OrderStatus.CANCELLED || target == OrderStatus.DISPATCHED || target == OrderStatus.FAILED) {
            for (var item : order.getItems()) {
                var stock = stocks.findByVariantIdForUpdate(item.getVariant().getId()).orElseThrow();
                stock.setReserved(stock.getReserved() - item.getQuantity());
                if (target == OrderStatus.DISPATCHED) stock.setQuantity(stock.getQuantity() - item.getQuantity());
            }
        }
        order.setStatus(target); order.setUpdatedAt(LocalDateTime.now());
        db.sql("insert into orders.order_history(order_id,from_status,to_status,changed_by,note) values(:o,:f,:t,:u,:n)").param("o",id).param("f",current.name()).param("t",target.name()).param("u",changedBy).param("n",note).update();
        if(target==OrderStatus.PAYMENT_VERIFIED) db.sql("insert into warehouse.shipments(order_id) values(:o) on conflict(order_id) do nothing").param("o",id).update();
        return OrderDtos.View.from(order);
    }
    private SalesOrder order(Long id){return orders.findById(id).orElseThrow(()->new BusinessException("Order not found"));}
}
