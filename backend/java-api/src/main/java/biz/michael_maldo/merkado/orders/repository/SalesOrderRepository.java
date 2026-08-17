package biz.michael_maldo.merkado.orders.repository;
import biz.michael_maldo.merkado.orders.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface SalesOrderRepository extends JpaRepository<SalesOrder, Long> {
    List<SalesOrder> findAllByOrderByCreatedAtDesc();
    List<SalesOrder> findByStatusOrderByCreatedAtDesc(OrderStatus status);
}
