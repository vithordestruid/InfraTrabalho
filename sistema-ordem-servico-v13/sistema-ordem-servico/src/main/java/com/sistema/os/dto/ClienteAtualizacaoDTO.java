package com.sistema.os.dto;
import jakarta.validation.constraints.*;
// DTO de entrada: dados recebidos para atualizar cliente
public record ClienteAtualizacaoDTO(
    @NotBlank @Size(max=100) String nome,
    @Size(max=20) String telefone,
    @Email @Size(max=100) String email
) {}
