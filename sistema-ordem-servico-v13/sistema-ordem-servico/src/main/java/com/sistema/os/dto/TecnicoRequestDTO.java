package com.sistema.os.dto;
import jakarta.validation.constraints.*;
// DTO de entrada: dados recebidos para cadastrar/atualizar técnico
public record TecnicoRequestDTO(
    @NotBlank @Size(max=100) String nome,
    @Size(max=60) String especialidade,
    @Size(max=20) String telefone
) {}
