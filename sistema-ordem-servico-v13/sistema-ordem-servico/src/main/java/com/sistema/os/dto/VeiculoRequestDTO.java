package com.sistema.os.dto;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
// DTO de entrada: dados recebidos para cadastrar/atualizar veículo (com validação)
public record VeiculoRequestDTO(
    @NotBlank @Size(max=60) String marca,
    @NotBlank @Size(max=60) String modelo,
    @NotNull @Min(1950) @Max(2100) Integer ano,
    @Size(max=30) String cor,
    @PositiveOrZero Integer quilometragem,
    @NotNull @Min(1) @Max(9999) Integer quantidade,
    @DecimalMin(value = "0.0", inclusive = false) @Digits(integer = 10, fraction = 2) BigDecimal preco
) {}
