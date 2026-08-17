package biz.michael_maldo.merkado.catalog.repository;

import biz.michael_maldo.merkado.catalog.entity.Channel;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ChannelRepository extends JpaRepository<Channel, Long> {
    Optional<Channel> findByCodeIgnoreCase(String code);
}
