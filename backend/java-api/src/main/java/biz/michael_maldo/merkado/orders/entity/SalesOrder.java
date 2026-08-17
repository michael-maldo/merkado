package biz.michael_maldo.merkado.orders.entity;

import biz.michael_maldo.merkado.clients.entity.Client;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Entity @Table(schema = "orders", name = "sales_orders")
@Getter @Setter @NoArgsConstructor
public class SalesOrder {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "client_id") private Client client;
    @Column(name = "created_by", nullable = false) private String createdBy;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private OrderStatus status;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal total;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt = LocalDateTime.now();
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt = LocalDateTime.now();
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<OrderItem> items = new ArrayList<>();
    public void addItem(OrderItem item) { item.setOrder(this); items.add(item); }
}
