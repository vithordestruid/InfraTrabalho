package com.sistema.os.dto;
import com.sistema.os.entity.Veiculo;
import java.math.BigDecimal;
// DTO de saída: dados do veículo devolvidos ao front
public record VeiculoResponseDTO(Long id, String marca, String modelo, Integer ano, String cor,
                                 Integer quilometragem, Integer quantidade, BigDecimal preco) {
    public static VeiculoResponseDTO from(Veiculo v) {
        if (v == null) return null;
        return new VeiculoResponseDTO(v.getId(), v.getMarca(), v.getModelo(), v.getAno(), v.getCor(),
            v.getQuilometragem(), v.getQuantidade(), v.getPreco());
    }
}
