package com.sistema.os.dto;
import com.sistema.os.enums.Prioridade;
import com.sistema.os.enums.TipoNegociacao;
import jakarta.validation.constraints.*;
// DTO de entrada: dados recebidos para abrir/atualizar OS (com validação)
public record OrdemServicoRequestDTO(
    @NotBlank @Size(max=500) String descricao,
    Prioridade prioridade,
    // O cliente pode vir como "clienteId": 1 (DTO) ou como "cliente": {"id": 1} (formato dos slides)
    Long clienteId,
    ClienteRef cliente,
    Long veiculoId,
    TipoNegociacao tipo
) {
    public record ClienteRef(Long id) {}

    public Long clienteIdEfetivo() {
        if (clienteId != null) return clienteId;
        return cliente != null ? cliente.id() : null;
    }
}
