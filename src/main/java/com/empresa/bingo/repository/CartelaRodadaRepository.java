package com.empresa.bingo.repository;

import com.empresa.bingo.entity.CartelaRodada;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CartelaRodadaRepository extends JpaRepository<CartelaRodada, Long> {

    @Query("""
            SELECT DISTINCT item FROM CartelaRodada item
            JOIN FETCH item.participante participante
            JOIN FETCH item.cartela cartela
            LEFT JOIN FETCH cartela.numeros
            WHERE item.rodada.id = :rodadaId AND item.ativa = true
            """)
    List<CartelaRodada> findAtivasDetalhadasByRodadaId(@Param("rodadaId") Long rodadaId);

    @Query("""
            SELECT DISTINCT item FROM CartelaRodada item
            JOIN FETCH item.participante participante
            JOIN FETCH item.cartela cartela
            LEFT JOIN FETCH cartela.numeros
            WHERE item.rodada.id = :rodadaId
              AND cartela.id = :cartelaId
              AND item.ativa = true
            """)
    Optional<CartelaRodada> findAtivaDetalhadaByRodadaIdAndCartelaId(
            @Param("rodadaId") Long rodadaId,
            @Param("cartelaId") Long cartelaId
    );

    @Query("""
            SELECT item FROM CartelaRodada item
            JOIN FETCH item.cartela cartela
            WHERE item.pedido.id = :pedidoId
            ORDER BY cartela.numero ASC
            """)
    List<CartelaRodada> findByPedidoIdOrderByCartelaNumero(
            @Param("pedidoId") Long pedidoId
    );

    @Query("SELECT item.cartela.id FROM CartelaRodada item WHERE item.rodada.id = :rodadaId")
    List<Long> findCartelaIdsReservadas(@Param("rodadaId") Long rodadaId);

    long countByRodadaId(Long rodadaId);
}
