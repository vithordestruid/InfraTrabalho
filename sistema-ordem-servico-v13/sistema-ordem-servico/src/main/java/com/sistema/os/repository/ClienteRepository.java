package com.sistema.os.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.sistema.os.entity.Cliente;

// Repository: acesso ao banco para clientes
public interface ClienteRepository extends JpaRepository<Cliente, Long> {
    boolean existsByCpf(String cpf);

    boolean existsByCpfAndIdNot(String cpf, Long id);
}
