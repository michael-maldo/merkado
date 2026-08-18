package biz.michael_maldo.merkado.catalog.repository;

import biz.michael_maldo.merkado.catalog.entity.ProductCustomsInfo;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductCustomsInfoRepository
  extends JpaRepository<ProductCustomsInfo, Long> {}
