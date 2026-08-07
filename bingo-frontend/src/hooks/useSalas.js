import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";

const STORAGE_KEY = "bingo_sala_selecionada";

export default function useSalas() {
  const [salas, setSalas] = useState([]);
  const [salaSelecionadaId, setSalaSelecionadaIdState] = useState(() => {
    const salvo = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(salvo) && salvo > 0 ? salvo : null;
  });
  const [carregandoSalas, setCarregandoSalas] = useState(true);
  const [erroSalas, setErroSalas] = useState("");

  const carregarSalas = useCallback(async () => {
    setCarregandoSalas(true);
    setErroSalas("");

    try {
      const response = await api.get("/salas");
      const lista = Array.isArray(response.data) ? response.data : [];
      setSalas(lista);
      setSalaSelecionadaIdState((atual) => {
        const existe = lista.some((sala) => sala.id === atual);
        const proximo = existe ? atual : lista[0]?.id || null;
        if (proximo) localStorage.setItem(STORAGE_KEY, String(proximo));
        return proximo;
      });
      return lista;
    } catch (error) {
      setErroSalas(
        error?.response?.data?.mensagem || "Não foi possível carregar as salas."
      );
      return [];
    } finally {
      setCarregandoSalas(false);
    }
  }, []);

  useEffect(() => {
    let ativo = true;
    Promise.resolve().then(() => {
      if (ativo) carregarSalas();
    });

    return () => {
      ativo = false;
    };
  }, [carregarSalas]);

  const selecionarSala = useCallback((valor) => {
    const id = Number(valor);
    const proximo = Number.isFinite(id) && id > 0 ? id : null;
    setSalaSelecionadaIdState(proximo);
    if (proximo) localStorage.setItem(STORAGE_KEY, String(proximo));
  }, []);

  const salaSelecionada = useMemo(
    () => salas.find((sala) => sala.id === salaSelecionadaId) || null,
    [salas, salaSelecionadaId]
  );

  return {
    salas,
    salaSelecionada,
    salaSelecionadaId,
    selecionarSala,
    carregandoSalas,
    erroSalas,
    recarregarSalas: carregarSalas,
  };
}
