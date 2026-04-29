package com.empresa.bingo.service;

import com.empresa.bingo.entity.AuditoriaLog;
import com.empresa.bingo.entity.Usuario;
import com.empresa.bingo.repository.AuditoriaLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuditoriaService {

    private final AuditoriaLogRepository auditoriaLogRepository;

    public void registrar(Usuario usuario, String acao, String entidade, Long entidadeId, String detalhes) {
        AuditoriaLog log = AuditoriaLog.builder()
                .usuario(usuario)
                .acao(acao)
                .entidade(entidade)
                .entidadeId(entidadeId)
                .detalhes(detalhes)
                .build();

        auditoriaLogRepository.save(log);
    }
}