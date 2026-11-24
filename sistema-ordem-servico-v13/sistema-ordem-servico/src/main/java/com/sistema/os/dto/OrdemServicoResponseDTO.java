package com.sistema.os.dto;
import com.sistema.os.entity.OrdemServico;
import com.sistema.os.enums.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
// DTO de saída: dados da OS devolvidos ao front
public record OrdemServicoResponseDTO(
    Long id, String descricao, LocalDateTime dataAbertura,
    LocalDateTime dataFechamento, BigDecimal valor, StatusOS status,
    Prioridade prioridade, TipoNegociacao tipo, ClienteResponseDTO cliente,
    TecnicoResponseDTO tecnico, VeiculoResponseDTO veiculo, String veiculoDescricao
) {
    public static OrdemServicoResponseDTO from(OrdemServico os) {
        return new OrdemServicoResponseDTO(os.getId(), os.getDescricao(), os.getDataAbertura(),
            os.getDataFechamento(), os.getValor(), os.getStatus(), os.getPrioridade(), os.getTipo(),
            ClienteResponseDTO.from(os.getCliente()), TecnicoResponseDTO.from(os.getTecnico()),
            VeiculoResponseDTO.from(os.getVeiculo()), os.getVeiculoDescricao());
    }
}
