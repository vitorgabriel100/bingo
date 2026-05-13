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

  const letrasBingo = ["B", "I", "N", "G", "O"];

  const numerosPainel = [
    Array.from({ length: 15 }, (_, i) => i + 1),
    Array.from({ length: 15 }, (_, i) => i + 16),
    Array.from({ length: 15 }, (_, i) => i + 31),
    Array.from({ length: 15 }, (_, i) => i + 46),
    Array.from({ length: 15 }, (_, i) => i + 61),
  ];

  const numerosGlobo = useMemo(
    () => [
      3, 5, 8, 12, 15, 18, 21, 22, 27, 31, 33, 37,
      41, 44, 48, 49, 52, 56, 59, 62, 64, 67, 71, 72,
      73, 75, 9, 14, 25, 36, 43, 54, 68, 70, 6, 11,
      1, 4, 7, 10, 13, 16, 19, 24, 28, 32, 35, 39,
    ],
    []
  );

  const ultimasSeisBolas = historico.slice(-6).reverse();

  function formatarPremio(premio) {
    return nomesPremio[premio] || premio || "Primeira Linha";
  }

  function letraDoNumero(numero) {
    const n = Number(numero);

    if (n <= 15) return "B";
    if (n <= 30) return "I";
    if (n <= 45) return "N";
    if (n <= 60) return "G";

    return "O";
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

      const letra = letraDoNumero(numero);
      const texto = `${letra} ${numero}. Repito, ${letra} ${numero}.`;

      const fala = new SpeechSynthesisUtterance(texto);

      fala.lang = "pt-BR";
      fala.rate = 0.86;
      fala.pitch = 1.05;
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

    const numeroNormalizado = Number(numero);

    if (animandoRef.current) {
      filaRef.current.push({ numero: numeroNormalizado, premio });
      return;
    }

    animandoRef.current = true;

    const premioFormatado = formatarPremio(premio);

    try {
      setCountdown(null);

      setNumeroAnimado(numeroNormalizado);
      setNumeroAtual(numeroNormalizado);

      setHistorico((prev) =>
        prev.includes(numeroNormalizado) ? prev : [...prev, numeroNormalizado]
      );

      setMensagem(`${premioFormatado} • ${letraDoNumero(numeroNormalizado)} ${numeroNormalizado}`);
      setFaseAnimacao("dropping");

      tocarAudio(dropAudioRef);
      pararAudio(machineAudioRef);

      await esperar(650);

      setFaseAnimacao("revealed");

      if (ultimoNumeroFaladoRef.current !== numeroNormalizado) {
        ultimoNumeroFaladoRef.current = numeroNormalizado;
        await falarNumeroSorteado(numeroNormalizado);
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
        setPremioAtual(response.data.premio || response.data.premioAtual || "PRIMEIRA_LINHA");
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

        if (event.premio) {
          setPremioAtual(event.premio);
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

        if (event.premio) {
          setPremioAtual(event.premio);
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

        if (event.premio) {
          setPremioAtual(event.premio);
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
        localStorage.setItem("premioAtualOperador", event.premio);
        return;
      }
    },
    [premioAtual, rodadaId, somLiberado]
  );

  useWebSocket(sessaoId ? [`/topic/tv/${sessaoId}`] : [], handleWsMessage);

  return (
    <div className={`tv-page bingo-tv-gold fase-${faseAnimacao}`}>
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

      <main className="gold-tv-layout">
        <section className="gold-left-panel">
          <div className="gold-number-board">
            {numerosPainel.map((linha, linhaIndex) => (
              <div className="gold-board-row" key={letrasBingo[linhaIndex]}>
                <div className="gold-board-letter">{letrasBingo[linhaIndex]}</div>

                {linha.map((numero) => {
                  const sorteado = historico.includes(numero);
                  const atual = numeroAtual === numero;

                  return (
                    <div
                      key={numero}
                      className={`gold-board-cell ${sorteado ? "drawn" : ""} ${
                        atual ? "current" : ""
                      }`}
                    >
                      {numero}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="gold-info-card gold-last-card">
            <span className="gold-info-label">ÚLTIMAS 6 BOLAS</span>

            <div className="gold-last-balls">
              {ultimasSeisBolas.length > 0 ? (
                ultimasSeisBolas.map((numero, index) => (
                  <div
                    className={`gold-small-ball ${
                      numero === numeroAtual ? "active" : ""
                    }`}
                    key={`${numero}-${index}`}
                  >
                    {String(numero).padStart(2, "0")}
                  </div>
                ))
              ) : (
                <>
                  <div className="gold-small-ball empty">--</div>
                  <div className="gold-small-ball empty">--</div>
                  <div className="gold-small-ball empty">--</div>
                  <div className="gold-small-ball empty">--</div>
                  <div className="gold-small-ball empty">--</div>
                  <div className="gold-small-ball empty">--</div>
                </>
              )}
            </div>
          </div>

          <div className="gold-info-card gold-prize-card">
            <span className="gold-info-label">PRÊMIO DA RODADA</span>
            <strong>{formatarPremio(premioAtual)}</strong>
          </div>

          <div className="gold-info-card gold-current-card">
            <span className="gold-info-label">NÚMERO ATUAL</span>
            <strong>
              {numeroAtual ? (
                <>
                  <em>{letraDoNumero(numeroAtual)}</em>{" "}
                  {String(numeroAtual).padStart(2, "0")}
                </>
              ) : (
                "--"
              )}
            </strong>
          </div>

          <div className="gold-message-card">
            {mensagem || "Boa sorte a todos!"}
          </div>
        </section>

        <section className="gold-right-panel">
          <div className="gold-cage-stage">
            <div className="gold-cage-light"></div>

            <div className="gold-cage-machine">
              <div className="gold-cage-support left"></div>
              <div className="gold-cage-support right"></div>

              <div className="gold-crank">
                <span></span>
              </div>

              <div className="gold-cage-globe">
                <div className="gold-cage-rim horizontal"></div>
                <div className="gold-cage-rim top"></div>
                <div className="gold-cage-rim bottom"></div>

                {Array.from({ length: 22 }).map((_, index) => (
                  <span
                    key={`rod-${index}`}
                    className="gold-cage-rod"
                    style={{ "--rod": index }}
                  ></span>
                ))}

                <div className="gold-cage-balls">
                  {numerosGlobo.slice(0, 28).map((numero, index) => (
                    <span
                      key={`${numero}-${index}`}
                      className={`gold-cage-ball ball-${index + 1}`}
                    >
                      {numero}
                    </span>
                  ))}
                </div>

                <div className="gold-cage-shine"></div>
              </div>

              <div className="gold-drop-neck">
                <div className="gold-drop-window"></div>

                {numeroAnimado !== null && (
                  <div
                    key={numeroAnimado}
                    className={`gold-drop-ball ${
                      faseAnimacao === "dropping" ? "dropping" : ""
                    } ${faseAnimacao === "revealed" ? "revealed" : ""}`}
                  >
                    {String(numeroAnimado).padStart(2, "0")}
                  </div>
                )}
              </div>

              <div className="gold-stage-base"></div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}