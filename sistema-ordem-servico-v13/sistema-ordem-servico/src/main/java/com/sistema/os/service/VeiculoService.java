package com.sistema.os.service;
import com.sistema.os.dto.*;
import com.sistema.os.entity.OrdemServico;
import com.sistema.os.entity.Veiculo;
import com.sistema.os.enums.StatusOS;
import com.sistema.os.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
// Service: regras de negócio do estoque de veículos
@Service
public class VeiculoService {
    private final VeiculoRepository veiculoRepository;
    private final OrdemServicoRepository ordemServicoRepository;
    public VeiculoService(VeiculoRepository veiculoRepository, OrdemServicoRepository ordemServicoRepository) {
        this.veiculoRepository = veiculoRepository;
        this.ordemServicoRepository = ordemServicoRepository;
    }
    public List<VeiculoResponseDTO> listarTodos() {
        return veiculoRepository.findAll().stream().map(VeiculoResponseDTO::from).toList();
    }
    public Veiculo buscarEntidadePorId(Long id) {
        return veiculoRepository.findById(id).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Veículo não encontrado: " + id));
    }
    public VeiculoResponseDTO buscarPorId(Long id) { return VeiculoResponseDTO.from(buscarEntidadePorId(id)); }
    private String limpar(String texto) {
        if (texto == null || texto.isBlank()) return null;
        return texto.trim();
    }
    private boolean igual(String a, String b) {
        return a == null ? b == null : a.equalsIgnoreCase(b);
    }
    // REGRA 11: cadastrar de novo o mesmo veículo (marca, modelo, ano, cor e km) não cria outro registro:
    // a quantidade é somada ao que já existe no estoque
    public VeiculoResponseDTO salvar(VeiculoRequestDTO dados) {
        String cor = limpar(dados.cor());
        Veiculo existente = veiculoRepository.findAll().stream()
            .filter(v -> igual(v.getMarca(), dados.marca().trim()) && igual(v.getModelo(), dados.modelo().trim())
                && v.getAno().equals(dados.ano()) && igual(v.getCor(), cor)
                && java.util.Objects.equals(v.getQuilometragem(), dados.quilometragem()))
            .findFirst().orElse(null);
        if (existente != null) {
            existente.setQuantidade(existente.getQuantidade() + dados.quantidade());
            if (dados.preco() != null) existente.setPreco(dados.preco());
            return VeiculoResponseDTO.from(veiculoRepository.save(existente));
        }
        Veiculo veiculo = new Veiculo();
        copiar(dados, veiculo);
        return VeiculoResponseDTO.from(veiculoRepository.save(veiculo));
    }
    // REGRA 17: a quantidade em estoque não pode ficar menor que as unidades reservadas (OS ativas)
    public VeiculoResponseDTO atualizar(Long id, VeiculoRequestDTO dados) {
        Veiculo veiculo = buscarEntidadePorId(id);
        long reservadas = ordemServicoRepository.countByVeiculoIdAndStatusIn(id,
            List.of(StatusOS.ABERTA, StatusOS.EM_ANDAMENTO));
        if (dados.quantidade() < reservadas)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Existem " + reservadas + " unidade(s) reservada(s) em negociação; a quantidade não pode ser menor");
        copiar(dados, veiculo);
        return VeiculoResponseDTO.from(veiculoRepository.save(veiculo));
    }
    private void copiar(VeiculoRequestDTO dados, Veiculo veiculo) {
        veiculo.setMarca(dados.marca().trim());
        veiculo.setModelo(dados.modelo().trim());
        veiculo.setAno(dados.ano());
        veiculo.setCor(limpar(dados.cor()));
        veiculo.setQuilometragem(dados.quilometragem());
        veiculo.setQuantidade(dados.quantidade());
        veiculo.setPreco(dados.preco());
    }
    // REGRA 16: quando uma venda é fechada, o estoque do veículo diminui em uma unidade.
    // Ao vender a última unidade, o veículo é excluído da tabela de veículos.
    @Transactional
    public void baixarUnidade(Veiculo veiculo) {
        int atual = veiculo.getQuantidade() == null ? 0 : veiculo.getQuantidade();
        if (atual <= 1) {
            removerDoEstoque(veiculo);
        } else {
            veiculo.setQuantidade(atual - 1);
            veiculoRepository.save(veiculo);
        }
    }
    // As negociações antigas não perdem o histórico: elas guardam a descrição do veículo (veiculoDescricao)
    // e apenas deixam de apontar para a linha que foi excluída
    private void removerDoEstoque(Veiculo veiculo) {
        List<OrdemServico> ordens = ordemServicoRepository.findByVeiculoId(veiculo.getId());
        for (OrdemServico o : ordens) o.setVeiculo(null);
        ordemServicoRepository.saveAll(ordens);
        veiculoRepository.delete(veiculo);
    }
    // REGRA 12: veículo com unidade reservada em negociação ativa não pode ser excluído
    @Transactional
    public void excluir(Long id) {
        Veiculo veiculo = buscarEntidadePorId(id);
        long reservadas = ordemServicoRepository.countByVeiculoIdAndStatusIn(id,
            List.of(StatusOS.ABERTA, StatusOS.EM_ANDAMENTO));
        if (reservadas > 0)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Veículo possui negociações ativas");
        removerDoEstoque(veiculo);
    }
}
