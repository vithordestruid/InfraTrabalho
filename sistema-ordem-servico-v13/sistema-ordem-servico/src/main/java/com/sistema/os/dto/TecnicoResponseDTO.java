package com.sistema.os.dto;
import com.sistema.os.entity.Tecnico;
// DTO de saída: dados do técnico devolvidos ao front
public record TecnicoResponseDTO(Long id, String nome, String especialidade, String telefone) {
    public static TecnicoResponseDTO from(Tecnico tecnico) {
        if (tecnico == null) return null;
        return new TecnicoResponseDTO(tecnico.getId(), tecnico.getNome(), tecnico.getEspecialidade(), tecnico.getTelefone());
    }
}
