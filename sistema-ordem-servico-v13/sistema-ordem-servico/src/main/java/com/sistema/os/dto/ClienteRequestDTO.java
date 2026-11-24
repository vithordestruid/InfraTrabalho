package com.sistema.os.dto;
import jakarta.validation.constraints.*;
// DTO de entrada: dados recebidos para cadastrar cliente (com validação)
public record ClienteRequestDTO(
    @NotBlank @Size(max=100) String nome,
    @NotBlank @Size(max=14) String cpf,
    @Size(max=20) String telefone,
    @Email @Size(max=100) String email
) {}
