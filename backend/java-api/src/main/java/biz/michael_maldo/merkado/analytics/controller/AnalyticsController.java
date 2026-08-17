package biz.michael_maldo.merkado.analytics.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/api/v1/analytics") @RequiredArgsConstructor
public class AnalyticsController {
 private final JdbcClient db;
 @GetMapping("/sales") public List<Map<String,Object>> sales(){return db.sql("select date_trunc('day',created_at) period,count(*) orders,sum(total) gross_sales from orders.sales_orders where status not in ('CANCELLED','FAILED') group by 1 order by 1 desc").query().listOfRows();}
 @GetMapping("/inventory") public List<Map<String,Object>> inventory(){return db.sql("select p.id product_id,v.id variant_id,v.sku,p.master_name name,v.variant_name,s.quantity,s.reserved,s.quantity-s.reserved available,s.quantity*v.selling_price stock_value from inventory.stock s join catalog.product_variants v on v.id=s.variant_id join catalog.products p on p.id=s.product_id order by stock_value desc").query().listOfRows();}
 @GetMapping("/orders") public List<Map<String,Object>> orders(){return db.sql("select status,count(*) count,sum(total) total from orders.sales_orders group by status order by status").query().listOfRows();}
 @GetMapping("/agents") public List<Map<String,Object>> agents(){return db.sql("select created_by agent,count(*) orders,sum(total) sales from orders.sales_orders where status not in ('CANCELLED','FAILED') group by created_by order by sales desc").query().listOfRows();}
 @GetMapping("/revenue") public Map<String,Object> revenue(){return db.sql("select coalesce(sum(total-discount_total),0) revenue,coalesce(sum(discount_total),0) discounts,count(*) orders from orders.sales_orders where status in ('DISPATCHED','COMPLETED')").query().singleRow();}
 @GetMapping("/top-products") public List<Map<String,Object>> products(){return db.sql("select i.product_id,i.sku,i.product_name,sum(i.quantity) units,sum(i.line_total) revenue from orders.order_items i join orders.sales_orders o on o.id=i.order_id where o.status not in ('CANCELLED','FAILED') group by i.product_id,i.sku,i.product_name order by units desc limit 20").query().listOfRows();}
}
