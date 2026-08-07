package com.empresa.bingo.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "configuracoes_sistema")
public class ConfiguracaoSistema {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tempo_entre_sorteios_segundos", nullable = false)
    private Integer tempoEntreSorteiosSegundos;

    @Column(name = "quantidade_rodadas", nullable = false)
    private Integer quantidadeRodadas = 20;

    @Column(nullable = false)
    private Boolean ativo = true;

    public ConfiguracaoSistema() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Integer getTempoEntreSorteiosSegundos() {
        return tempoEntreSorteiosSegundos;
    }

    public void setTempoEntreSorteiosSegundos(Integer tempoEntreSorteiosSegundos) {
        this.tempoEntreSorteiosSegundos = tempoEntreSorteiosSegundos;
    }

    public Integer getQuantidadeRodadas() {
        return quantidadeRodadas;
    }

    public void setQuantidadeRodadas(Integer quantidadeRodadas) {
        this.quantidadeRodadas = quantidadeRodadas;
    }

    public Boolean getAtivo() {
        return ativo;
    }

    public void setAtivo(Boolean ativo) {
        this.ativo = ativo;
    }
}
