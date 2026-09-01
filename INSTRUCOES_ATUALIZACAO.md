# Atualização: programação, compras e ranking na TV

Este pacote contém somente os arquivos novos e alterados. Extraia o ZIP na raiz do projeto `bingo` e confirme a substituição dos arquivos existentes.

## Antes de atualizar

1. Faça um backup do projeto e do banco PostgreSQL.
2. Confirme que a aplicação está usando Java 17, Node.js e PostgreSQL.
3. Não execute manualmente o arquivo `V4__programacao_compras_ranking_ao_vivo.sql`: o Flyway o aplicará na inicialização do backend.

## Configuração obrigatória do Pix

Defina estas variáveis no ambiente do backend (local, Docker ou Render):

```properties
BINGO_PIX_KEY=sua-chave-pix
BINGO_PIX_RECEIVER=Nome do recebedor
BINGO_PAYMENT_INSTRUCTIONS=Envie o Pix e aguarde a confirmação do operador.
```

O pagamento incluído neste pacote usa confirmação manual: o jogador reserva as cartelas, recebe os dados do Pix e o operador confirma o recebimento em **Programação e vendas**. Um gateway com API e webhook será necessário para baixa automática.

## Rodar e conferir

Backend:

```bash
mvn clean test
mvn spring-boot:run
```

Frontend, em outro terminal:

```bash
cd bingo-frontend
npm install
npm run build
npm run dev
```

Com Docker Compose, preencha também `POSTGRES_PASSWORD`, `JWT_SECRET`, `DOMAIN` e as três variáveis do Pix antes de subir os serviços.

## Novos fluxos

- Operador: entre em `/programacao`, escolha a sala e defina livremente data, hora, prêmios, preços, prazo antecipado, limite de cartelas e se a rodada é especial.
- Jogador: crie a conta em `/cadastro-jogador`, entre e compre em `/jogador`.
- Pagamento: o pedido reserva as cartelas por 30 minutos; o operador confirma ou cancela o Pix na tela de programação.
- TV: abra `/tv` ou `/tv/sala/{salaId}`. O ranking mostra as três cartelas mais próximas do prêmio atual e atualiza a cada bola.
