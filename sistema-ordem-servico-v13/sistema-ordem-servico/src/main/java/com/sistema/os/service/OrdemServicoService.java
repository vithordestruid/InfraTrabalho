package com.sistema.os.service;
import com.sistema.os.dto.*;
import com.sistema.os.entity.*;
import com.sistema.os.enums.*;
import com.sistema.os.repository.OrdemServicoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.math.BigDecimal;
import java.time.LocalDateTime;
// Service: regras de negócio das ordens de serviço
@Service
public class OrdemServicoService {
    private final OrdemServicoRepository ordemServicoRepository;
    private final ClienteService clienteService;
    private final TecnicoService tecnicoService;
    private final VeiculoService veiculoService;
    public OrdemServicoService(OrdemServicoRepository ordemServicoRepository, ClienteService clienteService,
                               TecnicoService tecnicoService, VeiculoService veiculoService) {
        this.ordemServicoRepository = ordemServicoRepository;
        this.clienteService = clienteService;
        this.tecnicoService = tecnicoService;
        this.veiculoService = veiculoService;
    }
    public List<OrdemServicoResponseDTO> listarTodas() { return converterLista(ordemServicoRepository.findAll()); }
    public List<OrdemServicoResponseDTO> listarPorStatus(StatusOS status) { return converterLista(ordemServicoRepository.findByStatus(status)); }
    public List<OrdemServicoResponseDTO> listarPorCliente(Long clienteId) { return converterLista(ordemServicoRepository.findByClienteId(clienteId)); }
    public List<OrdemServicoResponseDTO> listarPorPrioridade(Prioridade prioridade) { return converterLista(ordemServicoRepository.findByPrioridade(prioridade)); }
    private List<OrdemServicoResponseDTO> converterLista(List<OrdemServico> ordens) {
        return ordens.stream().map(OrdemServicoResponseDTO::from).toList();
    }
    private OrdemServico buscarEntidadePorId(Long id) {
        return ordemServicoRepository.findById(id).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Ordem de serviço não encontrada: " + id));
    }
    public OrdemServicoResponseDTO buscarPorId(Long id) { return OrdemServicoResponseDTO.from(buscarEntidadePorId(id)); }
    // REGRA 2: a OS só pode ser aberta para um cliente cadastrado
    private Cliente validarClienteCadastrado(OrdemServicoRequestDTO dados) {
        Long clienteId = dados.clienteIdEfetivo();
        if (clienteId == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe o cliente (clienteId ou cliente.id)");
        return clienteService.buscarEntidadePorId(clienteId);
    }
    // REGRA 3: ao abrir, a OS recebe a data de abertura e o status ABERTA
    public OrdemServicoResponseDTO abrir(OrdemServicoRequestDTO dados) {
        Cliente cliente = validarClienteCadastrado(dados);
        OrdemServico os = new OrdemServico();
        os.setDescricao(dados.descricao());
        os.setPrioridade(dados.prioridade());
        os.setCliente(cliente);
        os.setTipo(dados.tipo() != null ? dados.tipo() : TipoNegociacao.VENDA);
        exigirVeiculo(dados);
        aplicarVeiculo(os, buscarVeiculoLivre(dados.veiculoId(), null));
        os.setDataAbertura(LocalDateTime.now());
        os.setStatus(StatusOS.ABERTA);
        return OrdemServicoResponseDTO.from(ordemServicoRepository.save(os));
    }
    // REGRA 18: uma venda ou revenda só pode ser cadastrada para um veículo que exista no estoque
    // (quando o tipo da negociação é informado, o veiculoId é obrigatório)
    private void exigirVeiculo(OrdemServicoRequestDTO dados) {
        if (dados.tipo() != null && dados.veiculoId() == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe o veículo do estoque (veiculoId)");
    }
    // guarda o veículo e uma cópia da descrição dele (nome|ano|cor|km), para o histórico
    // continuar legível depois que o veículo for vendido e excluído do estoque
    private void aplicarVeiculo(OrdemServico os, Veiculo veiculo) {
        os.setVeiculo(veiculo);
        if (veiculo == null) { os.setVeiculoDescricao(null); return; }
        os.setVeiculoDescricao(veiculo.getMarca() + " " + veiculo.getModelo() + "|" + veiculo.getAno() + "|"
            + (veiculo.getCor() == null ? "" : veiculo.getCor()) + "|"
            + (veiculo.getQuilometragem() == null ? "" : veiculo.getQuilometragem()));
    }
    // REGRA 13: só abre negociação se houver unidade livre: quantidade em estoque menos as unidades
    // já reservadas em OS ativas (ABERTA ou EM_ANDAMENTO)
    private Veiculo buscarVeiculoLivre(Long veiculoId, Long osAtualId) {
        if (veiculoId == null) return null;
        Veiculo veiculo = veiculoService.buscarEntidadePorId(veiculoId);
        List<StatusOS> ativas = List.of(StatusOS.ABERTA, StatusOS.EM_ANDAMENTO);
        long reservadas = osAtualId == null
            ? ordemServicoRepository.countByVeiculoIdAndStatusIn(veiculoId, ativas)
            : ordemServicoRepository.countByVeiculoIdAndStatusInAndIdNot(veiculoId, ativas, osAtualId);
        if (veiculo.getQuantidade() - reservadas <= 0)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Não há unidade disponível deste veículo no estoque");
        return veiculo;
    }
    // REGRA 4: uma OS CONCLUIDA ou CANCELADA não pode mais ser alterada
    private void validarOsNaoFinalizada(OrdemServico os) {
        if (os.getStatus() == StatusOS.CONCLUIDA || os.getStatus() == StatusOS.CANCELADA)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A OS " + os.getId() + " já está " + os.getStatus());
    }
    // REGRA 5: ao atribuir técnico, a OS passa para EM_ANDAMENTO
    public OrdemServicoResponseDTO atribuirTecnico(Long osId, Long tecnicoId) {
        OrdemServico os = buscarEntidadePorId(osId);
        validarOsNaoFinalizada(os);
        Tecnico tecnico = tecnicoService.buscarEntidadePorId(tecnicoId);
        os.setTecnico(tecnico);
        os.setStatus(StatusOS.EM_ANDAMENTO);
        return OrdemServicoResponseDTO.from(ordemServicoRepository.save(os));
    }
    // REGRA 6: só é possível concluir uma OS que tenha técnico
    private void validarTecnicoAtribuido(OrdemServico os) {
        if (os.getTecnico() == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Atribua um técnico antes de concluir");
    }
    // REGRA 10: o valor ao concluir uma OS deve ser maior que zero
    private void validarValorPositivo(BigDecimal valor) {
        if (valor == null || valor.compareTo(BigDecimal.ZERO) <= 0)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O valor deve ser maior que zero");
    }
    // REGRA 7: ao concluir, recebe valor, data de fechamento e status CONCLUIDA
    @Transactional
    public OrdemServicoResponseDTO concluir(Long osId, BigDecimal valor) {
        OrdemServico os = buscarEntidadePorId(osId);
        validarOsNaoFinalizada(os);
        validarTecnicoAtribuido(os);
        validarValorPositivo(valor);
        os.setValor(valor);
        os.setDataFechamento(LocalDateTime.now());
        os.setStatus(StatusOS.CONCLUIDA);
        if (os.getVeiculo() != null) veiculoService.baixarUnidade(os.getVeiculo()); // REGRA 16
        return OrdemServicoResponseDTO.from(ordemServicoRepository.save(os));
    }
    // REGRA 8: ao cancelar, recebe data de fechamento e status CANCELADA
    public OrdemServicoResponseDTO cancelar(Long osId) {
        OrdemServico os = buscarEntidadePorId(osId);
        validarOsNaoFinalizada(os);
        os.setDataFechamento(LocalDateTime.now());
        os.setStatus(StatusOS.CANCELADA);
        return OrdemServicoResponseDTO.from(ordemServicoRepository.save(os));
    }
    // PUT /ordens/{id}: atualiza os dados da OS (a REGRA 4 também vale aqui)
    public OrdemServicoResponseDTO atualizar(Long id, OrdemServicoRequestDTO dados) {
        OrdemServico os = buscarEntidadePorId(id);
        validarOsNaoFinalizada(os);
        os.setDescricao(dados.descricao());
        os.setPrioridade(dados.prioridade());
        os.setCliente(validarClienteCadastrado(dados));
        if (dados.tipo() != null) os.setTipo(dados.tipo());
        exigirVeiculo(dados);
        aplicarVeiculo(os, buscarVeiculoLivre(dados.veiculoId(), id));
        return OrdemServicoResponseDTO.from(ordemServicoRepository.save(os));
    }
    // REGRA 14: uma OS CONCLUIDA não pode ser excluída (é o registro do negócio fechado)
    public void excluir(Long id) {
        OrdemServico os = buscarEntidadePorId(id);
        if (os.getStatus() == StatusOS.CONCLUIDA)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Uma OS concluída não pode ser excluída");
        ordemServicoRepository.delete(os);
    }
}
