package com.sistema.os.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.sistema.os.entity.Tecnico;

// Repository: acesso ao banco para técnicos
public interface TecnicoRepository extends JpaRepository<Tecnico, Long> {

}
