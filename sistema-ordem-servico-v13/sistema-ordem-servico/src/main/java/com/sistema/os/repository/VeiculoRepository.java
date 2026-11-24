package com.sistema.os.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.sistema.os.entity.Veiculo;

// Repository: acesso ao banco para veículos
public interface VeiculoRepository extends JpaRepository<Veiculo, Long> {
}
