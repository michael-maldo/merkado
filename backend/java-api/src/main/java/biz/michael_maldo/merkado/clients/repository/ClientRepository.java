package biz.michael_maldo.merkado.clients.repository;

import biz.michael_maldo.merkado.clients.entity.Client;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClientRepository extends JpaRepository<Client, Long> {}
