import { useCallback, useEffect, useRef, useState } from "react";
import api from "../services/api";
import useWebSocket from "../hooks/useWebSocket";

export default function TvPage() {
  const [sessaoId, setSessaoId] = useState(null);
  const [rodadaId, setRodadaId] = useState(null);

  const [numeroAtual, setNumeroAtual] = useState(null);
  const [numeroAnimado, setNumeroAnimado] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [mensagem, setMensagem] = useState("Preparando transmissão...");
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

  function extrairLista(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  }

  async function criarSessaoAutomatica() {
    const tentativas = [
      () => api.post("/sessoes", { nome: "Sessão Principal" }),
      () => api.post("/sessoes", { descricao: "Sessão Principal" }),
      () => api.post("/sessoes"),
    ];

    for (const tentativa of tentativas) {
      try {
        const response = await tentativa();
        if (response.data?.id) return response.data;
      } catch {
        // tenta próximo formato
      }
    }

    throw new Error("Não foi possível criar sessão automaticamente.");
  }

  async function carregarOuCriarSessao() {
    try {
      setMensagem("Buscando sessão...");

      try {
        const ativa = await api.get("/sessoes/ativa");
        if (ativa.data?.id) {
          setSessaoId(ativa.data.id);
          return ativa.data.id;
        }
      } catch {
        // endpoint pode não existir
      }

      const response = await api.get("/sessoes");
      const sessoes = extrairLista(response.data);

      if (sessoes.length > 0) {
        const sessao =
          sessoes.find((s) => s.status === "ATIVA" || s.ativa === true) ||
          sessoes[0];

        setSessaoId(sessao.id);
        return sessao.id;
      }

      const novaSessao = await criarSessaoAutomatica();
      setSessaoId(novaSessao.id);
      setMensagem("Sessão criada automaticamente.");
      return novaSessao.id;
    } catch (error) {
      console.error("Erro ao carregar/criar sessão:", error);
      setMensagem("Erro ao carregar ou criar sessão.");
      return null;
    }
  }

  function escolherVozFeminina() {
    if (!("speechSynthesis" in window)) return null;

    const vozes = window.speechSynthesis.getVoices();

    return (
      vozes.find(
        (voz) =>
          voz.lang === "pt-BR" &&
          /maria|francisca|helena|luciana|female|feminina|google portuguese|portuguese brazil/i.test(
            voz.name
          )
      ) ||
      vozes.find((voz) => voz.lang === "pt-BR") ||
      vozes.find((voz) => voz.lang?.startsWith("pt")) ||
      null
    );
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
      if (voz) fala.voice = voz;

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
    } catch {
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
        if (voz) teste.voice = voz;

        window.speechSynthesis.speak(teste);
        window.speechSynthesis.cancel();
      }
    } catch {
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

  async function carregarRodadaAtiva(idSessao) {
    if (!idSessao) return;

    try {
      const response = await api.get(`/rodadas/sessao/${idSessao}/ativa`);

      if (response.data?.id) {
        setRodadaId(response.data.id);
        setStatusRodada(response.data.status || "AGUARDANDO");
        setNumeroRodada(response.data.numeroRodada);
        setMensagem(`Transmitindo rodada ${response.data.numeroRodada}`);
      } else {
        setMensagem("Nenhuma rodada ativa no momento.");
      }
    } catch {
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
    async function iniciarTv() {
      const premioSalvo = localStorage.getItem("premioAtualOperador");

      if (premioSalvo) {
        setPremioAtual(premioSalvo);
      }

      const idSessao = await carregarOuCriarSessao();

      if (idSessao) {
        await carregarRodadaAtiva(idSessao);
      }
    }

    iniciarTv();
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
      if (!event?.type) return;

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

  useWebSocket(sessaoId ? [`/topic/tv/${sessaoId}`] : [], handleWsMessage);

  return (
    <div className={`tv-page casino-tv fase-${faseAnimacao}`}>
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

      <header className="casino-tv-header">
        <div className="casino-brand">
          <span>BINGO BENEFICENTE</span>
          <strong>
            {numeroRodada ? `RODADA ${numeroRodada}` : "TRANSMISSÃO AO VIVO"}
          </strong>
        </div>

        <div className="casino-status">
          <span>STATUS</span>
          <strong>{statusRodada}</strong>
        </div>

        <div className="casino-prize">
          <span>CONCORRENDO AGORA</span>
          <strong>{formatarPremio(premioAtual)}</strong>
        </div>
      </header>

      <main className="casino-tv-main">
        <section className="casino-machine-area">
          <div className="casino-message">{mensagem}</div>

          <div
            className={`casino-bingo-machine ${
              faseAnimacao === "spinning" ? "spinning" : ""
            }`}
          >
            <div className="casino-light-column left">
              <i></i>
              <i></i>
              <i></i>
              <i></i>
              <i></i>
            </div>

            <div className="casino-light-column right">
              <i></i>
              <i></i>
              <i></i>
              <i></i>
              <i></i>
            </div>

            <div className="casino-top-tube">
              <div className="casino-top-ball">
                <span>
                  {numeroAtual ? String(numeroAtual).padStart(2, "0") : "--"}
                </span>
              </div>
              <div className="casino-tube-glass"></div>
            </div>

            <div className="casino-globe-wrap">
              <div className="casino-globe">
                <div className="casino-globe-shine"></div>
                <div className="casino-globe-ring"></div>
                <div className="casino-globe-center"></div>
                <div className="casino-globe-arm arm-1"></div>
                <div className="casino-globe-arm arm-2"></div>
                <div className="casino-globe-arm arm-3"></div>
                <div className="casino-globe-arm arm-4"></div>

                <div className="casino-inner-balls">
                  {[
                    3, 5, 8, 12, 15, 18, 21, 22, 27, 31, 33, 37, 41, 44, 48,
                    49, 52, 56, 59, 62, 64, 67, 71, 72, 73, 75, 9, 14, 25,
                    36, 43, 54, 68, 70, 6, 11,
                  ].map((n, index) => (
                    <span
                      key={`${n}-${index}`}
                      className={`casino-inner-ball ib-${index + 1}`}
                    >
                      {String(n).padStart(2, "0")}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="casino-output-tube">
              {numeroAnimado !== null && (
                <div
                  className={`casino-drawn-ball ${
                    faseAnimacao === "dropping" ? "dropping" : ""
                  } ${faseAnimacao === "revealed" ? "revealed" : ""}`}
                >
                  <span>{String(numeroAnimado).padStart(2, "0")}</span>
                </div>
              )}
            </div>

            <div className="casino-machine-base">
              <div className="casino-results-strip">
                {historico.length > 0 ? (
                  historico
                    .slice()
                    .reverse()
                    .slice(0, 8)
                    .reverse()
                    .map((n, index) => (
                      <span key={`${n}-${index}`}>
                        {String(n).padStart(2, "0")}
                      </span>
                    ))
                ) : (
                  <>
                    <span>--</span>
                    <span>--</span>
                    <span>--</span>
                    <span>--</span>
                    <span>--</span>
                    <span>--</span>
                    <span>--</span>
                    <span>--</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className="casino-side-panel">
          <div className="casino-side-title">
            <span>BOLAS SORTEADAS</span>
            <strong>{historico.length}/75</strong>
          </div>

          <div className="casino-number-grid">
            {todosNumeros.map((n) => (
              <span key={n} className={historico.includes(n) ? "drawn" : ""}>
                {String(n).padStart(2, "0")}
              </span>
            ))}
          </div>

          <div className="casino-values">
            <div>
              <span>LINHA</span>
              <strong>R$ {valores.linha}</strong>
            </div>
            <div>
              <span>BINGO</span>
              <strong>R$ {valores.bingo}</strong>
            </div>
            <div>
              <span>ACUMULADO</span>
              <strong>R$ {valores.acumulado}</strong>
            </div>
          </div>
        </aside>
      </main>

      <footer className="casino-tv-footer">
        Cartela manual • Bingo tradicional 1 a 75
      </footer>
    </div>
  );
}