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

After logging in as `ADMIN`, open `/salas` to:

- create a room and generate its configured card interval;
- create or link an operator/manager login;
- copy the room's public registration link;
- view participants registered in that room.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.
