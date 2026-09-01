# Bingo Application

## Overview
The Bingo Application is a Spring Boot-based project that allows users to participate in a bingo game. It includes features for user authentication, session management, and lottery drawing operations.

## Project Structure
The project is organized as follows:

```
bingo-app
├── src
│   └── main
│       ├── java
│       │   └── com
│       │       └── empresa
│       │           └── bingo
│       │               ├── BingoApplication.java
│       │               ├── config
│       │               │   └── CorsConfig.java
│       │               ├── controller
│       │               │   ├── AuthController.java
│       │               │   ├── SessaoController.java
│       │               │   ├── RodadaController.java
│       │               │   └── SorteioController.java
│       │               ├── dto
│       │               │   ├── auth
│       │               │   │   ├── LoginRequest.java
│       │               │   │   └── LoginResponse.java
│       │               │   ├── rodada
│       │               │   │   └── NumeroSorteadoResponse.java
│       │               │   └── sessao
│       │               │       └── CriarSessaoRequest.java
│       │               ├── entity
│       │               │   ├── Perfil.java
│       │               │   ├── Usuario.java
│       │               │   ├── Sala.java
│       │               │   ├── SessaoBingo.java
│       │               │   ├── Rodada.java
│       │               │   ├── NumeroSorteado.java
│       │               │   ├── BingoSolicitacao.java
│       │               │   ├── AuditoriaLog.java
│       │               │   └── ConfiguracaoSistema.java
│       │               ├── enums
│       │               │   ├── NomePerfil.java
│       │               │   ├── StatusSessao.java
│       │               │   ├── StatusRodada.java
│       │               │   └── StatusSolicitacaoBingo.java
│       │               ├── repository
│       │               │   ├── PerfilRepository.java
│       │               │   ├── UsuarioRepository.java
│       │               │   ├── SalaRepository.java
│       │               │   ├── SessaoBingoRepository.java
│       │               │   ├── RodadaRepository.java
│       │               │   ├── NumeroSorteadoRepository.java
│       │               │   ├── BingoSolicitacaoRepository.java
│       │               │   └── AuditoriaLogRepository.java
│       │               ├── security
│       │               │   ├── JwtService.java
│       │               │   ├── SecurityConfig.java
│       │               │   └── UserDetailsServiceImpl.java
│       │               ├── service
│       │               │   ├── AuthService.java
│       │               │   ├── AuditoriaService.java
│       │               │   ├── SessaoService.java
│       │               │   ├── RodadaService.java
│       │               │   └── SorteioService.java
│       │               ├── websocket
│       │               │   ├── WebSocketConfig.java
│       │               │   └── BingoEventPublisher.java
│       │               └── exception
│       │                   ├── RegraNegocioException.java
│       │                   └── GlobalExceptionHandler.java
│       └── resources
│           ├── application.properties
│           └── application.yml
├── pom.xml
└── README.md
```

## Features
- **User Authentication**: Users can log in and register through the AuthController.
- **Multiple Rooms**: Each bingo point has its own room, logins, participants and sessions.
- **Public Registration**: Each room has a public link at `/sala/{slug}/cadastro`.
- **75-ball Cards**: Rooms start with series 8 and cards 701–800 by default. Each card has 24 numbers and a free center.
- **Session Management**: Manage bingo sessions with the SessaoController.
- **Round Management**: Handle rounds of the game using the RodadaController.
- **Lottery Drawing**: Conduct lottery drawings with the SorteioController.
- **Configurable schedule**: Operators define the title, date/time, prizes, special-event highlight, card limit and sale window for every round.
- **Online card orders**: Players register, reserve cards on the website and receive the configured Pix instructions.
- **Payment confirmation**: Operators confirm or cancel pending Pix orders in `/programacao`.
- **Live TV ranking**: The TV shows the three cards closest to the current prize and refreshes after every drawn ball.
- **TV audio**: Five complete announcer voices can rotate automatically or be selected individually, with eight general announcements in the operator panel.

## Getting Started
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd bingo-app
   ```
3. Build the project using Maven:
   ```
   mvn clean install
   ```
4. Run the application:
   ```
   mvn spring-boot:run
   ```

## Configuration
Configuration properties can be found in `src/main/resources/application.properties` and `src/main/resources/application.yml`.

Flyway applies the database migrations automatically. On an existing database without Flyway history, version 1 is baselined and `V2__multissalas_participantes_cartelas.sql` is applied.

### Programação e compras

1. Entre como operador, gerente ou administrador e abra `/programacao`.
2. Escolha a sala e configure a partida. Datas, horários, premiações e preços são livres.
3. A partida fica com status `AGENDADA`; use **Iniciar na TV** somente quando ela realmente começar.
4. O jogador cria uma conta em `/cadastro-jogador`, entra no sistema e acessa `/jogador` para reservar cartelas.
5. O pedido fica aguardando pagamento. Depois de conferir o Pix, o operador usa **Confirmar Pix** e as cartelas passam a valer na rodada e no ranking.

Configure no ambiente do backend:

```properties
BINGO_PIX_KEY=sua-chave-pix
BINGO_PIX_RECEIVER=Nome do recebedor
BINGO_PAYMENT_INSTRUCTIONS=Texto exibido ao jogador depois da reserva
```

O fluxo entregue usa confirmação manual do Pix. Para confirmação automática, conecte um gateway que ofereça API e webhook e mantenha o mesmo ciclo de estados `AGUARDANDO_PAGAMENTO`, `PAGO` e `CANCELADO`.

After logging in as `ADMIN`, open `/salas` to:

- create a room and generate its configured card interval;
- create or link an operator/manager login;
- copy the room's public registration link;
- view participants registered in that room.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.
