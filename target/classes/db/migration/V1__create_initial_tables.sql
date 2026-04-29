CREATE TABLE perfis (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE usuarios (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    perfil_id BIGINT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuario_perfil FOREIGN KEY (perfil_id) REFERENCES perfis(id)
);

CREATE TABLE salas (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    local VARCHAR(150),
    ativa BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE sessoes_bingo (
    id BIGSERIAL PRIMARY KEY,
    sala_id BIGINT NOT NULL,
    descricao VARCHAR(150),
    status VARCHAR(30) NOT NULL,
    data_inicio TIMESTAMP,
    data_fim TIMESTAMP,
    criada_por BIGINT NOT NULL,
    CONSTRAINT fk_sessao_sala FOREIGN KEY (sala_id) REFERENCES salas(id),
    CONSTRAINT fk_sessao_usuario FOREIGN KEY (criada_por) REFERENCES usuarios(id)
);

CREATE TABLE rodadas (
    id BIGSERIAL PRIMARY KEY,
    sessao_id BIGINT NOT NULL,
    numero_rodada INT NOT NULL,
    status VARCHAR(30) NOT NULL,
    iniciou_em TIMESTAMP,
    encerrou_em TIMESTAMP,
    vencedor_id BIGINT,
    CONSTRAINT uk_rodada UNIQUE (sessao_id, numero_rodada),
    CONSTRAINT fk_rodada_sessao FOREIGN KEY (sessao_id) REFERENCES sessoes_bingo(id),
    CONSTRAINT fk_rodada_vencedor FOREIGN KEY (vencedor_id) REFERENCES usuarios(id)
);

CREATE TABLE numeros_sorteados (
    id BIGSERIAL PRIMARY KEY,
    rodada_id BIGINT NOT NULL,
    numero INT NOT NULL,
    ordem INT NOT NULL,
    sorteado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sorteado_por BIGINT NOT NULL,
    CONSTRAINT uk_numero_rodada UNIQUE (rodada_id, numero),
    CONSTRAINT uk_ordem_rodada UNIQUE (rodada_id, ordem),
    CONSTRAINT fk_numero_rodada FOREIGN KEY (rodada_id) REFERENCES rodadas(id),
    CONSTRAINT fk_numero_usuario FOREIGN KEY (sorteado_por) REFERENCES usuarios(id)
);

CREATE TABLE bingo_solicitacoes (
    id BIGSERIAL PRIMARY KEY,
    rodada_id BIGINT NOT NULL,
    jogador_id BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL,
    solicitado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    validado_em TIMESTAMP,
    validado_por BIGINT,
    observacao TEXT,
    CONSTRAINT fk_bingo_rodada FOREIGN KEY (rodada_id) REFERENCES rodadas(id),
    CONSTRAINT fk_bingo_jogador FOREIGN KEY (jogador_id) REFERENCES usuarios(id),
    CONSTRAINT fk_bingo_validador FOREIGN KEY (validado_por) REFERENCES usuarios(id)
);

CREATE TABLE auditoria_logs (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT,
    acao VARCHAR(100) NOT NULL,
    entidade VARCHAR(100) NOT NULL,
    entidade_id BIGINT,
    detalhes TEXT,
    ip_origem VARCHAR(50),
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE configuracoes_sistema (
    id BIGSERIAL PRIMARY KEY,
    tempo_entre_sorteios_segundos INT NOT NULL,
    quantidade_rodadas INT NOT NULL DEFAULT 20,
    ativo BOOLEAN NOT NULL DEFAULT TRUE
);