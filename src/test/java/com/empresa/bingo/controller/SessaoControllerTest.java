package com.empresa.bingo.controller;

import com.empresa.bingo.dto.sessao.SessaoResponse;
import com.empresa.bingo.entity.Usuario;
import com.empresa.bingo.repository.UsuarioRepository;
import com.empresa.bingo.service.SessaoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SessaoControllerTest {

    @Mock
    private SessaoService sessaoService;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private SessaoController controller;

    @Test
    void deveCarregarPerfilDoUsuarioAntesDeBuscarOuCriarSessao() {
        Usuario usuario = Usuario.builder().id(7L).email("operador@bingo.com").build();
        SessaoResponse esperada = SessaoResponse.builder().id(15L).salaId(2L).build();

        when(authentication.getName()).thenReturn("operador@bingo.com");
        when(usuarioRepository.findWithPerfilByEmail("operador@bingo.com"))
                .thenReturn(Optional.of(usuario));
        when(sessaoService.buscarOuCriarSessaoAtiva(2L, usuario)).thenReturn(esperada);

        SessaoResponse resposta = controller.buscarSessaoAtiva(2L, authentication);

        assertSame(esperada, resposta);
        verify(usuarioRepository).findWithPerfilByEmail("operador@bingo.com");
        verify(sessaoService).buscarOuCriarSessaoAtiva(2L, usuario);
    }
}
