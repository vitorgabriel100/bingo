ALTER TABLE rodadas ADD COLUMN IF NOT EXISTS titulo VARCHAR(150);
ALTER TABLE rodadas ADD COLUMN IF NOT EXISTS agendada_para TIMESTAMP;
ALTER TABLE rodadas ADD COLUMN IF NOT EXISTS especial BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE rodadas ADD COLUMN IF NOT EXISTS preco_antecipado NUMERIC(10, 2);
ALTER TABLE rodadas ADD COLUMN IF NOT EXISTS preco_no_dia NUMERIC(10, 2);
ALTER TABLE rodadas ADD COLUMN IF NOT EXISTS fim_preco_antecipado TIMESTAMP;
ALTER TABLE rodadas ADD COLUMN IF NOT EXISTS limite_cartelas INTEGER;
ALTER TABLE rodadas ADD COLUMN IF NOT EXISTS venda_aberta BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE participantes ADD COLUMN IF NOT EXISTS usuario_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_participante_usuario'
          AND conrelid = 'participantes'::regclass
    ) THEN
        ALTER TABLE participantes
            ADD CONSTRAINT fk_participante_usuario
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS participantes_usuario_id_uk
    ON participantes (usuario_id) WHERE usuario_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS pedidos_compra (
    id BIGSERIAL PRIMARY KEY,
    codigo_referencia VARCHAR(36) NOT NULL UNIQUE,
    rodada_id BIGINT NOT NULL,
    participante_id BIGINT NOT NULL,
    quantidade INTEGER NOT NULL,
    valor_unitario NUMERIC(10, 2) NOT NULL,
    valor_total NUMERIC(10, 2) NOT NULL,
    status VARCHAR(30) NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expira_em TIMESTAMP NOT NULL,
    confirmado_em TIMESTAMP,
    confirmado_por BIGINT,
    CONSTRAINT ck_pedido_quantidade CHECK (quantidade BETWEEN 1 AND 100),
    CONSTRAINT ck_pedido_valores CHECK (valor_unitario >= 0 AND valor_total >= 0),
    CONSTRAINT ck_pedido_status CHECK (status IN ('AGUARDANDO_PAGAMENTO', 'PAGO', 'CANCELADO', 'EXPIRADO')),
    CONSTRAINT fk_pedido_rodada FOREIGN KEY (rodada_id) REFERENCES rodadas(id),
    CONSTRAINT fk_pedido_participante FOREIGN KEY (participante_id) REFERENCES participantes(id),
    CONSTRAINT fk_pedido_confirmador FOREIGN KEY (confirmado_por) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS cartelas_rodada (
    id BIGSERIAL PRIMARY KEY,
    rodada_id BIGINT NOT NULL,
    participante_id BIGINT NOT NULL,
    cartela_id BIGINT NOT NULL,
    pedido_id BIGINT NOT NULL,
    ativa BOOLEAN NOT NULL DEFAULT FALSE,
    reservada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_cartela_rodada UNIQUE (rodada_id, cartela_id),
    CONSTRAINT fk_cartela_rodada_rodada FOREIGN KEY (rodada_id) REFERENCES rodadas(id) ON DELETE CASCADE,
    CONSTRAINT fk_cartela_rodada_participante FOREIGN KEY (participante_id) REFERENCES participantes(id),
    CONSTRAINT fk_cartela_rodada_cartela FOREIGN KEY (cartela_id) REFERENCES cartelas(id),
    CONSTRAINT fk_cartela_rodada_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos_compra(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS rodadas_programacao_idx
    ON rodadas (agendada_para, venda_aberta);
CREATE INDEX IF NOT EXISTS pedidos_compra_rodada_status_idx
    ON pedidos_compra (rodada_id, status);
CREATE INDEX IF NOT EXISTS pedidos_compra_participante_idx
    ON pedidos_compra (participante_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS cartelas_rodada_rodada_ativa_idx
    ON cartelas_rodada (rodada_id, ativa);
