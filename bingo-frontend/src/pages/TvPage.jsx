import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  const machineAudioRef = useRef(null);
  const dropAudioRef = useRef(null);
  const animandoRef = useRef(false);
  const filaRef = useRef([]);
  const countdownRodadaRef = useRef(null);
  const ultimoNumeroFaladoRef = useRef(null);

  const nomesPremio = {
    PRIMEIRA_LINHA: "Primeira Linha",
    SEGUNDA_LINHA: "Segunda Linha",
    DUPLA_LINHA: "Dupla Linha",
    CARTELA_CHEIA: "Cartela Cheia",
  };

  const numerosGlobo = useMemo(
    () => [
      3, 5, 8, 12, 15, 18, 21, 22, 27, 31, 33, 37,
      41, 44, 48, 49, 52, 56, 59, 62, 64, 67, 71, 72,
      73, 75, 9, 14, 25, 36, 43, 54, 68, 70, 6, 11,
      1, 4, 7, 10, 13, 16, 19, 24, 28, 32, 35, 39,
    ],
    []
  );

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

        if (response.data?.id) {
          return response.data;
        }
      } catch {
        // tenta o próximo formato
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
          /maria|luciana|helena|female|feminina|mulher|google português|google portuguese|portuguese brazil/i.test(
            voz.name
          )
      ) ||
      vozes.find((voz) => voz.lang === "pt-BR") ||
      vozes.find((voz) => voz.lang?.startsWith("pt")) ||
      null
    );
  }

  function falarTexto(texto) {
    return new Promise((resolve) => {
      if (!somLiberado || !("speechSynthesis" in window)) {
        resolve();
        return;
      }

      if (!texto) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();

      const fala = new SpeechSynthesisUtterance(texto);

      fala.lang = "pt-BR";
      fala.rate = 0.9;
      fala.pitch = 1.08;
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

  function falarNumeroSorteado(numero) {
    return new Promise((resolve) => {
      if (!somLiberado || !("speechSynthesis" in window)) {
        resolve();
        return;
      }

      if (!numero && numero !== 0) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();

      const numeroTexto = String(numero);

      // Antes estava com "join(' e ')".
      // Agora fica: 15, 1, 5
      const digitos = numeroTexto.split("").join(", ");
      const texto = `${numeroTexto}, ${digitos}`;

      const fala = new SpeechSynthesisUtterance(texto);

      fala.lang = "pt-BR";
      fala.rate = 0.9;
      fala.pitch = 1.08;
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
      if (machineAudioRef.current) {
        machineAudioRef.current.volume = 0.01;
        await machineAudioRef.current.play();
        machineAudioRef.current.pause();
        machineAudioRef.current.currentTime = 0;
        machineAudioRef.current.volume = 1;
      }

      if (dropAudioRef.current) {
        dropAudioRef.current.volume = 0.01;
        await dropAudioRef.current.play();
        dropAudioRef.current.pause();
        dropAudioRef.current.currentTime = 0;
        dropAudioRef.current.volume = 1;
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
    } catch {
      console.warn("Som será liberado após nova interação do usuário.");
    }
  }

  async function iniciarContagemRodada(idRodada) {
    const chaveRodada = idRodada || rodadaId || "JOGO";

    if (countdownRodadaRef.current === chaveRodada) {
      return;
    }

    countdownRodadaRef.current = chaveRodada;

    const sequencia = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];

    setNumeroAtual(null);
    setNumeroAnimado(null);
    setMensagem("Rodada iniciada, boa sorte a todos!");
    setFaseAnimacao("countdown");

    for (const item of sequencia) {
      setCountdown(item);
      await esperar(1300);
    }

    setCountdown(null);
    setFaseAnimacao("idle");
    setMensagem("Rodada pronta para o sorteio.");
  }

  async function iniciarSequenciaSorteio(numero, premio = premioAtual) {
    if (!numero && numero !== 0) return;

    if (animandoRef.current) {
      filaRef.current.push({ numero, premio });
      return;
    }

    animandoRef.current = true;

    const premioFormatado = formatarPremio(premio);

    try {
      setCountdown(null);

      // Aqui está o ajuste principal:
      // Não espera mais 3 segundos misturando antes de mostrar a bolinha.
      setNumeroAnimado(numero);
      setNumeroAtual(numero);

      setHistorico((prev) =>
        prev.includes(numero) ? prev : [...prev, numero]
      );

      setMensagem(`${premioFormatado} • Número sorteado: ${numero}`);
      setFaseAnimacao("dropping");

      tocarAudio(dropAudioRef);
      pararAudio(machineAudioRef);

      await esperar(450);

      setFaseAnimacao("revealed");

      if (ultimoNumeroFaladoRef.current !== numero) {
        ultimoNumeroFaladoRef.current = numero;
        await falarNumeroSorteado(numero);
      }

      await esperar(350);

      setFaseAnimacao("idle");
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

      const numerosSorteados = extrairLista(response.data)
        .map((item) => item?.numero ?? item?.numeroSorteado ?? item)
        .filter((numero) => numero !== null && numero !== undefined)
        .map(Number)
        .filter((numero) => Number.isFinite(numero));

      setHistorico(numerosSorteados);

      if (numerosSorteados.length > 0) {
        const ultimo = numerosSorteados[numerosSorteados.length - 1];

        setNumeroAtual(ultimo);
        setNumeroAnimado(ultimo);
        setMensagem("Transmissão sincronizada.");
      } else {
        setNumeroAtual(null);
        setNumeroAnimado(null);
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

  useEffect(() => {
    return () => {
      pararAudio(machineAudioRef);
      pararAudio(dropAudioRef);

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleWsMessage = useCallback(
    (event) => {
      if (!event?.type) return;

      if (event.type === "ROUND_CREATED") {
        const idRodada = event.rodadaId || event.id;

        if (idRodada) {
          setRodadaId(idRodada);
        }

        if (event.numeroRodada) {
          setNumeroRodada(event.numeroRodada);
        }

        setStatusRodada(event.status || "CRIADA");
        setHistorico([]);
        setNumeroAtual(null);
        setNumeroAnimado(null);
        setCountdown(null);
        setFaseAnimacao("idle");

        countdownRodadaRef.current = null;
        filaRef.current = [];
        animandoRef.current = false;
        ultimoNumeroFaladoRef.current = null;

        pararAudio(machineAudioRef);
        pararAudio(dropAudioRef);

        setMensagem(
          event.numeroRodada
            ? `Rodada ${event.numeroRodada} criada. Aguardando início...`
            : "Nova rodada criada. Aguardando início..."
        );

        return;
      }

      if (event.type === "ROUND_STARTED" || event.type === "GAME_STARTED") {
        const idRodada = event.rodadaId || event.id || rodadaId;

        if (event.rodadaId) {
          setRodadaId(event.rodadaId);
        }

        if (event.numeroRodada) {
          setNumeroRodada(event.numeroRodada);
        }

        setStatusRodada("EM_ANDAMENTO");
        setMensagem("Rodada iniciada, boa sorte a todos!");

        setHistorico([]);
        setNumeroAtual(null);
        setNumeroAnimado(null);
        setCountdown(null);
        setFaseAnimacao("idle");

        countdownRodadaRef.current = null;
        filaRef.current = [];
        animandoRef.current = false;
        ultimoNumeroFaladoRef.current = null;

        pararAudio(machineAudioRef);
        pararAudio(dropAudioRef);

        iniciarContagemRodada(idRodada);

        return;
      }

      if (event.type === "NUMBER_DRAWN") {
        const numero = event.numero ?? event.number ?? event.numeroSorteado;

        if (event.rodadaId) {
          setRodadaId(event.rodadaId);
        }

        iniciarSequenciaSorteio(numero, event.premio || premioAtual);

        return;
      }

      if (event.type === "ROUND_PAUSED") {
        setStatusRodada("PAUSADA");
        setMensagem("Rodada pausada.");
        pararAudio(machineAudioRef);
        pararAudio(dropAudioRef);
        return;
      }

      if (event.type === "ROUND_FINISHED") {
        setStatusRodada("FINALIZADA");
        setMensagem("Rodada encerrada.");
        pararAudio(machineAudioRef);
        pararAudio(dropAudioRef);
        return;
      }

      if (event.type === "PRIZE_UPDATED") {
        setPremioAtual(event.premio);
        return;
      }

      if (
        event.type === "LINE_COMPLETED" ||
        event.type === "LINHA_CANTADA" ||
        event.type === "BINGO" ||
        event.type === "BINGO_CANTADO"
      ) {
        return;
      }
    },
    [premioAtual, rodadaId, somLiberado]
  );

  useWebSocket(sessaoId ? [`/topic/tv/${sessaoId}`] : [], handleWsMessage);

  const ultimasNoveBolas = historico.slice(-9).reverse();

  return (
    <div className={`tv-page casino-tv cinematic-tv fase-${faseAnimacao}`}>
      <audio
        ref={machineAudioRef}
        src="/sounds/bingo-machine.mp3"
        preload="auto"
        loop
      />

      <audio
        ref={dropAudioRef}
        src="/sounds/ball-drop.mp3"
        preload="auto"
      />

      {!somLiberado && (
        <button className="tv-enable-sound" onClick={liberarSom}>
          Ativar som da TV
        </button>
      )}

      {faseAnimacao === "countdown" && countdown !== null && (
        <div className="tv-countdown-overlay">
          <div className="tv-countdown-content">
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

      <section className="casino-top-drawn-panel cinematic-drawn-panel">
        <div className="casino-side-title">
          <span>ÚLTIMAS BOLAS SORTEADAS</span>
          <strong>{historico.length}/75</strong>
        </div>

        <div className="casino-results-strip casino-results-strip-top">
          {ultimasNoveBolas.length > 0 ? (
            ultimasNoveBolas.map((n, index) => (
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
              <span>--</span>
            </>
          )}
        </div>
      </section>

      <main className="casino-tv-main casino-tv-main-centered cinematic-main">
        <section className="casino-machine-area cinematic-machine-area">
          <div className="casino-message cinematic-message">{mensagem}</div>

          <div
            className={`casino-bingo-machine cinematic-bingo-machine ${
              faseAnimacao === "spinning" ? "spinning" : ""
            } ${faseAnimacao === "selecting" ? "selecting" : ""} ${
              faseAnimacao === "dropping" ? "dropping" : ""
            } ${faseAnimacao === "revealed" ? "revealed" : ""}`}
          >
            <div className="machine-aura"></div>
            <div className="machine-shadow"></div>

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

            <div className="casino-top-tube cinematic-top-tube">
              <div className="casino-top-ball cinematic-top-ball">
                <span>
                  {numeroAtual ? String(numeroAtual).padStart(2, "0") : "--"}
                </span>
              </div>
              <div className="casino-tube-glass"></div>
            </div>

            <div className="cinematic-globe-platform">
              <div className="cinematic-back-stand"></div>

              <div className="casino-globe-wrap cinematic-globe-wrap">
                <div className="casino-globe cinematic-globe spinning-always">
                  <div className="cinematic-glass-reflection reflection-one"></div>
                  <div className="cinematic-glass-reflection reflection-two"></div>
                  <div className="casino-globe-shine"></div>
                  <div className="casino-globe-ring"></div>

                  <div className="cinematic-depth depth-back"></div>

                  <div className="casino-inner-balls popcorn-balls balls-back">
                    {numerosGlobo.slice(0, 16).map((n, index) => (
                      <span
                        key={`back-${n}-${index}`}
                        className={`casino-inner-ball cinematic-inner-ball depth-ball ib-${
                          index + 1
                        }`}
                      >
                        {String(n).padStart(2, "0")}
                      </span>
                    ))}
                  </div>

                  <div className="cinematic-mixer mixer-always">
                    <div className="casino-globe-center"></div>
                    <div className="casino-globe-arm arm-1"></div>
                    <div className="casino-globe-arm arm-2"></div>
                    <div className="casino-globe-arm arm-3"></div>
                    <div className="casino-globe-arm arm-4"></div>
                    <div className="casino-globe-arm arm-5"></div>
                    <div className="casino-globe-arm arm-6"></div>
                  </div>

                  <div className="casino-inner-balls popcorn-balls balls-mid">
                    {numerosGlobo.slice(16, 34).map((n, index) => (
                      <span
                        key={`mid-${n}-${index}`}
                        className={`casino-inner-ball cinematic-inner-ball ib-${
                          index + 17
                        }`}
                      >
                        {String(n).padStart(2, "0")}
                      </span>
                    ))}
                  </div>

                  <div className="casino-inner-balls popcorn-balls balls-front">
                    {numerosGlobo.slice(34).map((n, index) => (
                      <span
                        key={`front-${n}-${index}`}
                        className={`casino-inner-ball cinematic-inner-ball front-ball ib-${
                          index + 35
                        }`}
                      >
                        {String(n).padStart(2, "0")}
                      </span>
                    ))}
                  </div>

                  <div className="cinematic-depth depth-front"></div>
                </div>
              </div>

              <div className="cinematic-front-stand"></div>
            </div>

            <div className="cinematic-exit-system">
              <div
                className={`cinematic-gate ${
                  faseAnimacao === "dropping" || faseAnimacao === "revealed"
                    ? "open"
                    : ""
                }`}
              >
                <span></span>
              </div>

              <div className="cinematic-exit-neck"></div>

              <div className="casino-output-tube cinematic-output-tube">
                <div className="cinematic-tube-highlight"></div>

                {numeroAnimado !== null && (
                  <div
                    key={numeroAnimado}
                    className={`casino-drawn-ball cinematic-drawn-ball ${
                      faseAnimacao === "dropping" ? "dropping" : ""
                    } ${faseAnimacao === "revealed" ? "revealed" : ""} ${
                      faseAnimacao === "idle" ? "resting" : ""
                    }`}
                  >
                    <span>{String(numeroAnimado).padStart(2, "0")}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="casino-machine-base cinematic-machine-base">
              <div className="cinematic-base-glow"></div>

              <div className="casino-base-label">
                {numeroAtual
                  ? `Número sorteado: ${String(numeroAtual).padStart(2, "0")}`
                  : "Aguardando sorteio"}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="casino-tv-footer">
        Cartela manual • Bingo tradicional 1 a 75
      </footer>
    </div>
  );
}