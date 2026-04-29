import { useCallback, useEffect, useRef, useState } from "react";
import api from "../services/api";
import useWebSocket from "../hooks/useWebSocket";

export default function TvPage() {
  const [sessaoId] = useState(2);
  const [rodadaId, setRodadaId] = useState(null);

  const [numeroAtual, setNumeroAtual] = useState(null);
  const [numeroAnimado, setNumeroAnimado] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [mensagem, setMensagem] = useState("Aguardando transmissão...");
  const [statusRodada, setStatusRodada] = useState("AGUARDANDO");
  const [numeroRodada, setNumeroRodada] = useState(null);
  const [premioAtual, setPremioAtual] = useState("PRIMEIRA_LINHA");

  const [faseAnimacao, setFaseAnimacao] = useState("idle");
  const [countdown, setCountdown] = useState(null);
  const [somLiberado, setSomLiberado] = useState(false);

  const introAudioRef = useRef(null);
  const machineAudioRef = useRef(null);
  const animandoRef = useRef(false);
  const filaRef = useRef([]);

  const valores = {
    linha: "200,00",
    bingo: "500,00",
    acumulado: "1.000,00",
  };

  const todosNumeros = Array.from({ length: 75 }, (_, i) => i + 1);

  const nomesPremio = {
    PRIMEIRA_LINHA: "Primeira Linha",
    SEGUNDA_LINHA: "Segunda Linha",
    DUPLA_LINHA: "Dupla Linha",
    CARTELA_CHEIA: "Cartela Cheia",
  };

  function formatarPremio(premio) {
    return nomesPremio[premio] || "Primeira Linha";
  }

  function escolherVozFeminina() {
    if (!("speechSynthesis" in window)) return null;

    const vozes = window.speechSynthesis.getVoices();

    const vozFemininaPtBr =
      vozes.find(
        (voz) =>
          voz.lang === "pt-BR" &&
          /maria|francisca|helena|luciana|female|feminina|google portuguese|portuguese brazil/i.test(
            voz.name
          )
      ) ||
      vozes.find((voz) => voz.lang === "pt-BR") ||
      vozes.find((voz) => voz.lang?.startsWith("pt"));

    return vozFemininaPtBr || null;
  }

  function falar(texto) {
    return new Promise((resolve) => {
      if (!somLiberado || !("speechSynthesis" in window)) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();

      const fala = new SpeechSynthesisUtterance(texto);
      fala.lang = "pt-BR";
      fala.rate = 0.86;
      fala.pitch = 1.15;
      fala.volume = 1;

      const voz = escolherVozFeminina();

      if (voz) {
        fala.voice = voz;
      }

      fala.onend = () => resolve();
      fala.onerror = () => resolve();

      window.speechSynthesis.speak(fala);
    });
  }

  function esperar(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function tocarAudio(audioRef) {
    if (!somLiberado || !audioRef.current) return;

    try {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
    } catch (error) {
      console.warn("O navegador bloqueou o áudio até haver interação do usuário.");
    }
  }

  function pararAudio(audioRef) {
    if (!audioRef.current) return;

    audioRef.current.pause();
    audioRef.current.currentTime = 0;
  }

  async function liberarSom() {
    setSomLiberado(true);

    try {
      if (introAudioRef.current) {
        introAudioRef.current.volume = 0.01;
        await introAudioRef.current.play();
        introAudioRef.current.pause();
        introAudioRef.current.currentTime = 0;
        introAudioRef.current.volume = 1;
      }

      if (machineAudioRef.current) {
        machineAudioRef.current.volume = 0.01;
        await machineAudioRef.current.play();
        machineAudioRef.current.pause();
        machineAudioRef.current.currentTime = 0;
        machineAudioRef.current.volume = 1;
      }

      if ("speechSynthesis" in window) {
        window.speechSynthesis.getVoices();

        const teste = new SpeechSynthesisUtterance("");
        teste.lang = "pt-BR";
        const voz = escolherVozFeminina();

        if (voz) {
          teste.voice = voz;
        }

        window.speechSynthesis.speak(teste);
        window.speechSynthesis.cancel();
      }
    } catch (error) {
      console.warn("Som será liberado após nova interação do usuário.");
    }
  }

  async function iniciarSequenciaSorteio(numero, premio = premioAtual) {
    if (!numero) return;

    if (animandoRef.current) {
      filaRef.current.push({ numero, premio });
      return;
    }

    animandoRef.current = true;

    const premioFormatado = formatarPremio(premio);

    try {
      setNumeroAnimado(null);
      setCountdown(null);
      setMensagem("Prepare-se! O sorteio vai começar...");
      setFaseAnimacao("countdown");

      await tocarAudio(introAudioRef);

      for (const item of [5, 4, 3, 2, 1]) {
        setCountdown(item);
        await falar(String(item));
        await esperar(250);
      }

      setCountdown(null);
      setMensagem("Sorteando agora...");
      await falar("Sorteando agora");

      setFaseAnimacao("spinning");
      await tocarAudio(machineAudioRef);

      await esperar(2800);

      setNumeroAnimado(numero);
      setMensagem("Bola sorteada!");
      setFaseAnimacao("dropping");

      await esperar(1300);

      pararAudio(machineAudioRef);

      setNumeroAtual(numero);

      setHistorico((prev) =>
        prev.includes(numero) ? prev : [...prev, numero]
      );

      setMensagem(`${premioFormatado} • Número sorteado: ${numero}`);
      setFaseAnimacao("revealed");

      await falar(`${premioFormatado}. Número sorteado, ${numero}`);

      await esperar(1200);

      setFaseAnimacao("idle");
      setNumeroAnimado(null);
    } finally {
      animandoRef.current = false;

      const proximo = filaRef.current.shift();

      if (proximo) {
        iniciarSequenciaSorteio(proximo.numero, proximo.premio);
      }
    }
  }

  async function carregarRodadaAtiva() {
    try {
      const response = await api.get(`/rodadas/sessao/${sessaoId}/ativa`);

      if (response.data && response.data.id) {
        setRodadaId(response.data.id);
        setStatusRodada(response.data.status || "AGUARDANDO");
        setNumeroRodada(response.data.numeroRodada);
        setMensagem(`Transmitindo rodada ${response.data.numeroRodada}`);
      } else {
        setMensagem("Nenhuma rodada ativa no momento.");
      }
    } catch (error) {
      setMensagem("Nenhuma rodada ativa no momento.");
    }
  }

  async function carregarHistorico(idRodada) {
    if (!idRodada) return;

    try {
      const response = await api.get(`/rodadas/${idRodada}/numeros`);
      const numerosSorteados = response.data.map((item) => item.numero);

      setHistorico(numerosSorteados);

      if (numerosSorteados.length > 0) {
        setNumeroAtual(numerosSorteados[numerosSorteados.length - 1]);
        setMensagem("Transmissão sincronizada.");
      } else {
        setNumeroAtual(null);
      }
    } catch (error) {
      console.error("Erro ao carregar histórico da TV", error);
      setMensagem("Erro ao sincronizar transmissão.");
    }
  }

  useEffect(() => {
    carregarRodadaAtiva();

    const premioSalvo = localStorage.getItem("premioAtualOperador");

    if (premioSalvo) {
      setPremioAtual(premioSalvo);
    }
  }, []);

  useEffect(() => {
    carregarHistorico(rodadaId);
  }, [rodadaId]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };

    window.speechSynthesis.getVoices();

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    function atualizarPremio(event) {
      if (event.detail) {
        setPremioAtual(event.detail);
      }
    }

    function atualizarPremioPorStorage(event) {
      if (event.key === "premioAtualOperador" && event.newValue) {
        setPremioAtual(event.newValue);
      }
    }

    window.addEventListener("premioAtualizado", atualizarPremio);
    window.addEventListener("storage", atualizarPremioPorStorage);

    return () => {
      window.removeEventListener("premioAtualizado", atualizarPremio);
      window.removeEventListener("storage", atualizarPremioPorStorage);
    };
  }, []);

  const handleWsMessage = useCallback(
    (event) => {
      if (!event || !event.type) return;

      if (event.type === "ROUND_STARTED") {
        setRodadaId(event.rodadaId);
        setNumeroRodada(event.numeroRodada);
        setStatusRodada("EM_ANDAMENTO");
        setMensagem(`Rodada ${event.numeroRodada} iniciada!`);
        setHistorico([]);
        setNumeroAtual(null);
        setNumeroAnimado(null);
        setCountdown(null);
        setFaseAnimacao("idle");
        filaRef.current = [];
        animandoRef.current = false;
        pararAudio(machineAudioRef);
      }

      if (event.type === "NUMBER_DRAWN") {
        setRodadaId(event.rodadaId);
        iniciarSequenciaSorteio(event.numero, premioAtual);
      }

      if (event.type === "ROUND_PAUSED") {
        setStatusRodada("PAUSADA");
        setMensagem("Rodada pausada.");
        pararAudio(machineAudioRef);
      }

      if (event.type === "ROUND_FINISHED") {
        setStatusRodada("FINALIZADA");
        setMensagem("Rodada encerrada.");
        pararAudio(machineAudioRef);
      }

      if (event.type === "PRIZE_UPDATED") {
        setPremioAtual(event.premio);
      }
    },
    [premioAtual, somLiberado]
  );

  useWebSocket([`/topic/tv/${sessaoId}`], handleWsMessage);

  return (
    <div className="tv-page">
      <audio ref={introAudioRef} src="/sounds/bingo-start.mp3" preload="auto" />
      <audio
        ref={machineAudioRef}
        src="/sounds/bingo-machine.mp3"
        preload="auto"
        loop
      />

      {!somLiberado && (
        <button className="tv-enable-sound" onClick={liberarSom}>
          Ativar som da TV
        </button>
      )}

      {faseAnimacao === "countdown" && (
        <div className="tv-countdown-overlay">
          <div className="tv-countdown-content">
            <span>PREPARE-SE</span>
            <strong>{countdown}</strong>
          </div>
        </div>
      )}

      <header className="tv-header">
        <div className="tv-title">
          <strong>BINGO BENEFICENTE</strong>
          <span>
            {numeroRodada ? `RODADA ${numeroRodada} • ` : ""}
            {statusRodada}
          </span>
        </div>

        <div className="tv-prize-now">
          <span>CONCORRENDO AGORA</span>
          <strong>{formatarPremio(premioAtual)}</strong>
        </div>

        <div className="tv-mini-card">
          <span>LINHA</span>
          <strong>R$ {valores.linha}</strong>
        </div>

        <div className="tv-mini-card">
          <span>BINGO</span>
          <strong>R$ {valores.bingo}</strong>
        </div>

        <div className="tv-mini-card">
          <span>ACUMULADO</span>
          <strong>R$ {valores.acumulado}</strong>
        </div>
      </header>

      <main className="tv-main tv-main-simple">
        <section className="tv-center">
          <div className="tv-message">{mensagem}</div>

          <div className="tv-current-prize-banner">
            <span>Valendo prêmio de</span>
            <strong>{formatarPremio(premioAtual)}</strong>
          </div>

          <div className="tv-machine-stage">
            <div
              className={`tv-globe ${
                faseAnimacao === "spinning" ? "is-spinning" : ""
              }`}
            >
              <div className="tv-globe-shine" />

              <span className="tv-mini-ball ball-1">8</span>
              <span className="tv-mini-ball ball-2">21</span>
              <span className="tv-mini-ball ball-3">33</span>
              <span className="tv-mini-ball ball-4">46</span>
              <span className="tv-mini-ball ball-5">59</span>
              <span className="tv-mini-ball ball-6">72</span>
              <span className="tv-mini-ball ball-7">15</span>
              <span className="tv-mini-ball ball-8">64</span>
            </div>

            <div className="tv-drop-track">
              {numeroAnimado !== null && (
                <div
                  className={`tv-drawn-ball ${
                    faseAnimacao === "dropping" ? "is-dropping" : ""
                  } ${faseAnimacao === "revealed" ? "is-revealed" : ""}`}
                >
                  {String(numeroAnimado).padStart(2, "0")}
                </div>
              )}
            </div>
          </div>

          <div className="tv-ball-area">
            <div className={`tv-final-ball ${numeroAtual ? "has-number" : ""}`}>
              <span>
                {numeroAtual ? String(numeroAtual).padStart(2, "0") : "--"}
              </span>
            </div>
          </div>

          <div className="tv-last-balls">
            {historico.length > 0 ? (
              historico
                .slice()
                .reverse()
                .slice(0, 8)
                .map((n, index) => (
                  <span key={`${n}-${index}`}>
                    {String(n).padStart(2, "0")}
                  </span>
                ))
            ) : (
              <p>Sem números sorteados ainda</p>
            )}
          </div>
        </section>

        <aside className="tv-board">
          <div className="tv-board-title">
            <strong>{historico.length}/75</strong>
            <span>BOLAS SORTEADAS</span>
          </div>

          <div className="tv-number-grid bingo-75-grid">
            {todosNumeros.map((n) => (
              <span key={n} className={historico.includes(n) ? "drawn" : ""}>
                {String(n).padStart(2, "0")}
              </span>
            ))}
          </div>
        </aside>
      </main>

      <footer className="tv-footer">
        Cartela manual • Bingo tradicional 1 a 75
      </footer>
    </div>
  );
}