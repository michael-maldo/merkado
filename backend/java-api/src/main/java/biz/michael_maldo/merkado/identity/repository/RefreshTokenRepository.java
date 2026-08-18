package biz.michael_maldo.merkado.identity.repository;

import biz.michael_maldo.merkado.identity.entity.RefreshToken;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefreshTokenRepository
  extends JpaRepository<RefreshToken, Long>
{
  Optional<RefreshToken> findByToken(String token);
}
