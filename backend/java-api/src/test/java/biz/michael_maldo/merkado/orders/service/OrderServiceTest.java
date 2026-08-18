package biz.michael_maldo.merkado.orders.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

import biz.michael_maldo.merkado.catalog.entity.Product;
import biz.michael_maldo.merkado.catalog.entity.ProductVariant;
import biz.michael_maldo.merkado.catalog.repository.ProductRepository;
import biz.michael_maldo.merkado.catalog.repository.ProductVariantRepository;
import biz.michael_maldo.merkado.clients.entity.Client;
import biz.michael_maldo.merkado.clients.repository.ClientRepository;
import biz.michael_maldo.merkado.inventory.entity.Stock;
import biz.michael_maldo.merkado.inventory.repository.StockRepository;
import biz.michael_maldo.merkado.orders.dto.OrderDtos;
import biz.michael_maldo.merkado.orders.repository.SalesOrderRepository;
import biz.michael_maldo.merkado.shared.exception.BusinessException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.simple.JdbcClient;

class OrderServiceTest {

  @Test
  void refusesToOversell() {
    var orders = mock(SalesOrderRepository.class);
    var clients = mock(ClientRepository.class);
    var products = mock(ProductRepository.class);
    var variants = mock(ProductVariantRepository.class);
    var stocks = mock(StockRepository.class);
    var client = new Client();
    client.setId(1L);
    var product = new Product();
    product.setId(2L);
    product.setSku("SKU-1");
    product.setName("Item");
    product.setPrice(BigDecimal.TEN);
    product.setActive(true);
    var variant = new ProductVariant();
    variant.setId(3L);
    variant.setProduct(product);
    variant.setSku("SKU-1");
    variant.setBarcode("BAR-1");
    variant.setVariantName("Default");
    variant.setSellingPrice(BigDecimal.TEN);
    variant.setActive(true);
    var stock = new Stock();
    stock.setProduct(product);
    stock.setVariant(variant);
    stock.setQuantity(2);
    stock.setReserved(1);
    when(clients.findById(1L)).thenReturn(Optional.of(client));
    when(variants.findByProductIdAndDefaultVariantTrue(2L)).thenReturn(
      Optional.of(variant)
    );
    when(stocks.findByVariantIdForUpdate(3L)).thenReturn(Optional.of(stock));
    var service = new OrderService(
      orders,
      clients,
      products,
      variants,
      stocks,
      mock(JdbcClient.class),
      new ObjectMapper()
    );
    assertThrows(BusinessException.class, () ->
      service.create(
        new OrderDtos.Create(1L, List.of(new OrderDtos.ItemRequest(2L, 2))),
        "sales"
      )
    );
    verify(orders, never()).save(any());
  }
}
