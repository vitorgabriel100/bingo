CREATE TABLE IF NOT EXISTS cartelas_sessao (
    id BIGSERIAL PRIMARY KEY,
    sessao_id BIGINT NOT NULL,
    participante_id BIGINT NOT NULL,
    cartela_id BIGINT NOT NULL,
    vinculada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_cartela_sessao UNIQUE (sessao_id, cartela_id),
    CONSTRAINT fk_cartela_sessao_sessao
        FOREIGN KEY (sessao_id) REFERENCES sessoes_bingo(id) ON DELETE CASCADE,
    CONSTRAINT fk_cartela_sessao_participante
        FOREIGN KEY (participante_id) REFERENCES participantes(id),
    CONSTRAINT fk_cartela_sessao_cartela
        FOREIGN KEY (cartela_id) REFERENCES cartelas(id)
);

CREATE TABLE IF NOT EXISTS vencedores_rodada (
    id BIGSERIAL PRIMARY KEY,
    rodada_id BIGINT NOT NULL,
    participante_id BIGINT NOT NULL,
    cartela_id BIGINT NOT NULL,
    tipo_premio VARCHAR(30) NOT NULL,
    quantidade_acertos SMALLINT NOT NULL,
    registrado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    validado_por BIGINT NOT NULL,
    CONSTRAINT uk_vencedor_rodada_cartela_premio
        UNIQUE (rodada_id, cartela_id, tipo_premio),
    CONSTRAINT ck_vencedor_tipo_premio
        CHECK (tipo_premio IN ('LINHA', 'DUPLA_LINHA', 'BINGO')),
    CONSTRAINT ck_vencedor_acertos
        CHECK (quantidade_acertos BETWEEN 0 AND 24),
    CONSTRAINT fk_vencedor_rodada
        FOREIGN KEY (rodada_id) REFERENCES rodadas(id) ON DELETE CASCADE,
    CONSTRAINT fk_vencedor_participante
        FOREIGN KEY (participante_id) REFERENCES participantes(id),
    CONSTRAINT fk_vencedor_cartela
        FOREIGN KEY (cartela_id) REFERENCES cartelas(id),
    CONSTRAINT fk_vencedor_validador
        FOREIGN KEY (validado_por) REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS cartelas_sessao_sessao_id_idx
    ON cartelas_sessao (sessao_id);
CREATE INDEX IF NOT EXISTS cartelas_sessao_participante_id_idx
    ON cartelas_sessao (participante_id);
CREATE INDEX IF NOT EXISTS vencedores_rodada_rodada_id_idx
    ON vencedores_rodada (rodada_id);
CREATE INDEX IF NOT EXISTS vencedores_rodada_participante_id_idx
    ON vencedores_rodada (participante_id);
