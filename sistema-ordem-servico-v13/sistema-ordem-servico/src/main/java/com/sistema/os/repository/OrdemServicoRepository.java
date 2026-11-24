package com.sistema.os.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.sistema.os.entity.OrdemServico;
import com.sistema.os.enums.Prioridade;
import com.sistema.os.enums.StatusOS;

// Repository: acesso ao banco para ordens de serviço
public interface OrdemServicoRepository extends JpaRepository<OrdemServico, Long> {
    List<OrdemServico> findByStatus(StatusOS status);

    List<OrdemServico> findByClienteId(Long clienteId);

    List<OrdemServico> findByVeiculoId(Long veiculoId);

    List<OrdemServico> findByPrioridade(Prioridade prioridade);

    boolean existsByClienteId(Long clienteId);

    boolean existsByTecnicoId(Long tecnicoId);

    boolean existsByVeiculoId(Long veiculoId);

    long countByVeiculoIdAndStatusIn(Long veiculoId, Collection<StatusOS> status);

    long countByVeiculoIdAndStatusInAndIdNot(Long veiculoId, Collection<StatusOS> status, Long id);

    boolean existsByVeiculoIdAndStatusIn(Long veiculoId, Collection<StatusOS> status);

    boolean existsByVeiculoIdAndStatusInAndIdNot(Long veiculoId, Collection<StatusOS> status, Long id);
}
