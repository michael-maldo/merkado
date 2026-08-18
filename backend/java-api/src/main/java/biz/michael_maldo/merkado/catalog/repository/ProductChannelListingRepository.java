package biz.michael_maldo.merkado.catalog.repository;

import biz.michael_maldo.merkado.catalog.entity.ProductChannelListing;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductChannelListingRepository
  extends JpaRepository<ProductChannelListing, Long>
{
  List<ProductChannelListing> findAllByProductIdOrderById(Long productId);
}
