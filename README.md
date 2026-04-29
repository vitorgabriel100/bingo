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

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.