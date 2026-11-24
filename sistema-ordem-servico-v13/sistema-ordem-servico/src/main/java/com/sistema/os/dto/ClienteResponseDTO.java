package com.sistema.os.dto;
import com.sistema.os.entity.Cliente;
// DTO de saída: dados do cliente devolvidos ao front
public record ClienteResponseDTO(Long id, String nome, String telefone, String email) {
    public static ClienteResponseDTO from(Cliente cliente) {
        return new ClienteResponseDTO(cliente.getId(), cliente.getNome(), cliente.getTelefone(), cliente.getEmail());
    }
}
