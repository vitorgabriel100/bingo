package com.empresa.bingo.controller;

import com.empresa.bingo.dto.auth.LoginRequest;
import com.empresa.bingo.dto.auth.LoginResponse;
import com.empresa.bingo.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody @Valid LoginRequest request) {
        try {
            LoginResponse response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (BadCredentialsException error) {
            return ResponseEntity.status(401).body(
                    Map.of(
                            "erro", "Login inválido.",
                            "mensagem", error.getMessage()
                    )
            );
        } catch (LockedException error) {
            return ResponseEntity.status(403).body(
                    Map.of(
                            "erro", "Acesso bloqueado.",
                            "mensagem", error.getMessage()
                    )
            );
        }
    }
}