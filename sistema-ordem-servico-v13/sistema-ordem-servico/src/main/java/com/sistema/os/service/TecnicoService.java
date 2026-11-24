package com.sistema.os.service;
import com.sistema.os.dto.*;
import com.sistema.os.entity.Tecnico;
import com.sistema.os.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
// Service: regras de negócio de técnicos
@Service
public class TecnicoService {
    private final TecnicoRepository tecnicoRepository;
    private final OrdemServicoRepository ordemServicoRepository;
    public TecnicoService(TecnicoRepository tecnicoRepository, OrdemServicoRepository ordemServicoRepository) {
        this.tecnicoRepository = tecnicoRepository;
        this.ordemServicoRepository = ordemServicoRepository;
    }
    public List<TecnicoResponseDTO> listarTodos() {
        return tecnicoRepository.findAll().stream().map(TecnicoResponseDTO::from).toList();
    }
    public Tecnico buscarEntidadePorId(Long id) {
        return tecnicoRepository.findById(id).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Técnico não encontrado: " + id));
    }
    public TecnicoResponseDTO buscarPorId(Long id) { return TecnicoResponseDTO.from(buscarEntidadePorId(id)); }
    public TecnicoResponseDTO salvar(TecnicoRequestDTO dados) {
        Tecnico tecnico = new Tecnico();
        tecnico.setNome(dados.nome());
        tecnico.setEspecialidade(dados.especialidade());
        tecnico.setTelefone(dados.telefone());
        return TecnicoResponseDTO.from(tecnicoRepository.save(tecnico));
    }
    public TecnicoResponseDTO atualizar(Long id, TecnicoRequestDTO dados) {
        Tecnico tecnico = buscarEntidadePorId(id);
        tecnico.setNome(dados.nome());
        tecnico.setEspecialidade(dados.especialidade());
        tecnico.setTelefone(dados.telefone());
        return TecnicoResponseDTO.from(tecnicoRepository.save(tecnico));
    }
    // REGRA 15: técnico com OS atribuída não pode ser excluído
    public void excluir(Long id) {
        Tecnico tecnico = buscarEntidadePorId(id);
        if (ordemServicoRepository.existsByTecnicoId(id))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Técnico possui ordens de serviço atribuídas");
        tecnicoRepository.delete(tecnico);
    }
}
