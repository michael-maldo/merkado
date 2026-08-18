package biz.michael_maldo.merkado.catalog.repository;

import biz.michael_maldo.merkado.catalog.entity.ProductCostInfo;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductCostInfoRepository
  extends JpaRepository<ProductCostInfo, Long> {}
