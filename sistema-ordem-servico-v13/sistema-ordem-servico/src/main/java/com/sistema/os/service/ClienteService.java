package com.sistema.os.service;
import com.sistema.os.dto.*;
import com.sistema.os.entity.Cliente;
import com.sistema.os.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
// Service: regras de negócio de clientes
@Service
public class ClienteService {
    private final ClienteRepository clienteRepository;
    private final OrdemServicoRepository ordemServicoRepository;
    public ClienteService(ClienteRepository clienteRepository, OrdemServicoRepository ordemServicoRepository) {
        this.clienteRepository = clienteRepository;
        this.ordemServicoRepository = ordemServicoRepository;
    }
    public List<ClienteResponseDTO> listarTodos() {
        return clienteRepository.findAll().stream().map(ClienteResponseDTO::from).toList();
    }
    public Cliente buscarEntidadePorId(Long id) {
        return clienteRepository.findById(id).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Cliente não encontrado: " + id));
    }
    public ClienteResponseDTO buscarPorId(Long id) { return ClienteResponseDTO.from(buscarEntidadePorId(id)); }
    // REGRA 1: não pode existir dois clientes com o mesmo CPF
    public ClienteResponseDTO salvar(ClienteRequestDTO dados) {
        if (clienteRepository.existsByCpf(dados.cpf()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Já existe cliente com este CPF");
        Cliente cliente = new Cliente();
        cliente.setNome(dados.nome());
        cliente.setCpf(dados.cpf());
        cliente.setTelefone(dados.telefone());
        cliente.setEmail(dados.email());
        return ClienteResponseDTO.from(clienteRepository.save(cliente));
    }
    public ClienteResponseDTO atualizar(Long id, ClienteAtualizacaoDTO dados) {
        Cliente cliente = buscarEntidadePorId(id);
        cliente.setNome(dados.nome());
        cliente.setTelefone(dados.telefone());
        cliente.setEmail(dados.email());
        return ClienteResponseDTO.from(clienteRepository.save(cliente));
    }
    // REGRA 9: cliente com OS cadastrada não pode ser excluído
    public void excluir(Long id) {
        Cliente cliente = buscarEntidadePorId(id);
        if (ordemServicoRepository.existsByClienteId(id))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cliente possui ordens de serviço cadastradas");
        clienteRepository.delete(cliente);
    }
}
