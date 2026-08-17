package biz.michael_maldo.merkado.orders.dto;

import biz.michael_maldo.merkado.orders.entity.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public final class OrderDtos {
    private OrderDtos() {}
    public record Create(@NotNull Long clientId, @NotEmpty List<@Valid ItemRequest> items) {}
    public record ItemRequest(Long productId, Long variantId, @Min(1) int quantity) {
        public ItemRequest(Long productId, int quantity) { this(productId, null, quantity); }
    }
    public record Item(Long productId, Long variantId, String spu, String sku, String barcode, String productName, String variantName, Map<String, String> variantOptions, int quantity, BigDecimal unitPrice, BigDecimal lineTotal) {}
    public record View(Long id, Long clientId, String clientName, String createdBy, OrderStatus status, BigDecimal total, LocalDateTime createdAt, List<Item> items) {
        public static View from(SalesOrder order) {
            return new View(order.getId(), order.getClient().getId(), order.getClient().getName(), order.getCreatedBy(), order.getStatus(), order.getTotal(), order.getCreatedAt(), order.getItems().stream().map(i -> new Item(i.getProduct().getId(), i.getVariant().getId(), i.getSpu(), i.getSku(), i.getBarcode(), i.getProductName(), i.getVariantName(), i.getVariantOptions(), i.getQuantity(), i.getUnitPrice(), i.getLineTotal())).toList());
        }
    }
}
