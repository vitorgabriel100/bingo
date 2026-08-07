CREATE TABLE IF NOT EXISTS clientes (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    responsavel VARCHAR(120),
    email VARCHAR(120) UNIQUE,
    telefone VARCHAR(20),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assinaturas (
    id BIGSERIAL PRIMARY KEY,
    data_inicio DATE NOT NULL,
    data_vencimento DATE,
    valor_mensal NUMERIC(10, 2),
    status VARCHAR(30) NOT NULL,
    cliente_id BIGINT NOT NULL UNIQUE,
    CONSTRAINT fk_assinatura_cliente
        FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cliente_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_usuario_cliente'
          AND conrelid = 'usuarios'::regclass
    ) THEN
        ALTER TABLE usuarios
            ADD CONSTRAINT fk_usuario_cliente
            FOREIGN KEY (cliente_id) REFERENCES clientes(id);
    END IF;
END $$;

ALTER TABLE salas ADD COLUMN IF NOT EXISTS slug VARCHAR(100);
ALTER TABLE salas ADD COLUMN IF NOT EXISTS serie_cartela INTEGER NOT NULL DEFAULT 8;
ALTER TABLE salas ADD COLUMN IF NOT EXISTS cartela_inicial INTEGER NOT NULL DEFAULT 701;
ALTER TABLE salas ADD COLUMN IF NOT EXISTS cartela_final INTEGER NOT NULL DEFAULT 800;

UPDATE salas
SET slug = 'sala-' || id
WHERE slug IS NULL OR BTRIM(slug) = '';

ALTER TABLE salas ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS salas_slug_lower_uk
    ON salas (LOWER(slug));

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_sala_configuracao_cartelas'
          AND conrelid = 'salas'::regclass
    ) THEN
        ALTER TABLE salas
            ADD CONSTRAINT ck_sala_configuracao_cartelas
            CHECK (
                serie_cartela > 0
                AND cartela_inicial > 0
                AND cartela_final >= cartela_inicial
            );
    END IF;
END $$;

ALTER TABLE rodadas ADD COLUMN IF NOT EXISTS premio_linha NUMERIC(10, 2);
ALTER TABLE rodadas ADD COLUMN IF NOT EXISTS premio_bingo NUMERIC(10, 2);
ALTER TABLE rodadas ADD COLUMN IF NOT EXISTS premio_duplo_bingo NUMERIC(10, 2);
ALTER TABLE rodadas ADD COLUMN IF NOT EXISTS bola_max INTEGER;
ALTER TABLE rodadas ADD COLUMN IF NOT EXISTS valor_doacao NUMERIC(10, 2);
ALTER TABLE rodadas ADD COLUMN IF NOT EXISTS premio_atual VARCHAR(40);
ALTER TABLE rodadas ADD COLUMN IF NOT EXISTS premios_pagos VARCHAR(255);

CREATE TABLE IF NOT EXISTS usuario_salas (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    sala_id BIGINT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_usuario_sala UNIQUE (usuario_id, sala_id),
    CONSTRAINT fk_usuario_sala_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    CONSTRAINT fk_usuario_sala_sala
        FOREIGN KEY (sala_id) REFERENCES salas(id)
);

INSERT INTO usuario_salas (usuario_id, sala_id, ativo)
SELECT usuario.id, sala.id, TRUE
FROM usuarios usuario
CROSS JOIN salas sala
ON CONFLICT (usuario_id, sala_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS participantes (
    id BIGSERIAL PRIMARY KEY,
    sala_id BIGINT NOT NULL,
    nome_completo VARCHAR(120) NOT NULL,
    apelido VARCHAR(60) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_participante_sala_telefone UNIQUE (sala_id, telefone),
    CONSTRAINT fk_participante_sala
        FOREIGN KEY (sala_id) REFERENCES salas(id)
);

CREATE TABLE IF NOT EXISTS cartelas (
    id BIGSERIAL PRIMARY KEY,
    sala_id BIGINT NOT NULL,
    serie INTEGER NOT NULL,
    numero INTEGER NOT NULL,
    ativa BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_cartela_sala_serie_numero UNIQUE (sala_id, serie, numero),
    CONSTRAINT ck_cartela_identificacao CHECK (serie > 0 AND numero > 0),
    CONSTRAINT fk_cartela_sala
        FOREIGN KEY (sala_id) REFERENCES salas(id)
);

CREATE TABLE IF NOT EXISTS cartela_numeros (
    id BIGSERIAL PRIMARY KEY,
    cartela_id BIGINT NOT NULL,
    posicao SMALLINT NOT NULL,
    numero SMALLINT NOT NULL,
    CONSTRAINT uk_cartela_numero_posicao UNIQUE (cartela_id, posicao),
    CONSTRAINT uk_cartela_numero_valor UNIQUE (cartela_id, numero),
    CONSTRAINT ck_cartela_numero_posicao CHECK (posicao BETWEEN 0 AND 24 AND posicao <> 12),
    CONSTRAINT ck_cartela_numero_faixa CHECK (
        (MOD(posicao, 5) = 0 AND numero BETWEEN 1 AND 15)
        OR (MOD(posicao, 5) = 1 AND numero BETWEEN 16 AND 30)
        OR (MOD(posicao, 5) = 2 AND numero BETWEEN 31 AND 45)
        OR (MOD(posicao, 5) = 3 AND numero BETWEEN 46 AND 60)
        OR (MOD(posicao, 5) = 4 AND numero BETWEEN 61 AND 75)
    ),
    CONSTRAINT fk_cartela_numero_cartela
        FOREIGN KEY (cartela_id) REFERENCES cartelas(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS usuarios_cliente_id_idx ON usuarios (cliente_id);
CREATE INDEX IF NOT EXISTS sessoes_bingo_sala_id_idx ON sessoes_bingo (sala_id);
CREATE INDEX IF NOT EXISTS rodadas_sessao_id_idx ON rodadas (sessao_id);
CREATE INDEX IF NOT EXISTS numeros_sorteados_rodada_id_idx ON numeros_sorteados (rodada_id);
CREATE INDEX IF NOT EXISTS usuario_salas_sala_id_idx ON usuario_salas (sala_id);
CREATE INDEX IF NOT EXISTS participantes_sala_ativo_idx ON participantes (sala_id, ativo);
CREATE INDEX IF NOT EXISTS cartelas_sala_serie_idx ON cartelas (sala_id, serie);
CREATE INDEX IF NOT EXISTS cartela_numeros_cartela_id_idx ON cartela_numeros (cartela_id);
