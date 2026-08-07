package com.empresa.bingo.config;

import com.empresa.bingo.dto.cartela.GerarCartelasRequest;
import com.empresa.bingo.entity.Sala;
import com.empresa.bingo.repository.SalaRepository;
import com.empresa.bingo.service.CartelaService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(100)
@RequiredArgsConstructor
public class CartelaInitializer implements ApplicationRunner {

    private final SalaRepository salaRepository;
    private final CartelaService cartelaService;

    @Override
    public void run(ApplicationArguments args) {
        salaRepository.findAll().stream()
                .filter(sala -> Boolean.TRUE.equals(sala.getAtiva()))
                .forEach(this::garantirCartelas);
    }

    private void garantirCartelas(Sala sala) {
        GerarCartelasRequest request = new GerarCartelasRequest();
        request.setSerie(sala.getSerieCartela());
        request.setNumeroInicial(sala.getCartelaInicial());
        request.setNumeroFinal(sala.getCartelaFinal());
        cartelaService.gerarParaSala(sala.getId(), request);
    }
}
