import { useCallback, useEffect, useRef, useState } from "react";
import api from "../services/api";
import useWebSocket from "../hooks/useWebSocket";
import BingoGlobe3D from "../components/BingoGlobe3D";

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

  const [premiacaoAtual, setPremiacaoAtual] = useState({
    linha: "",
    bingo: "",
    duploBingo: "",
    bolaMax: "60",
    doacao: "",
  });

  const [faseAnimacao, setFaseAnimacao] = useState("idle");
  const [countdown, setCountdown] = useState(null);

  // IMPORTANTE:
  // Não use localStorage para liberar som.
  // O navegador exige um clique real a cada nova abertura da página.
  const [somLiberado, setSomLiberado] = useState(false);

  const machineAudioRef = useRef(null);
  const dropAudioRef = useRef(null);
  const voiceAudioRef = useRef(null);
  const somLiberadoRef = useRef(false);

  const animandoRef = useRef(false);
  const filaRef = useRef([]);
  const countdownRodadaRef = useRef(null);
  const ultimoNumeroFaladoRef = useRef(null);

  const nomesPremio = {
    PRIMEIRA_LINHA: "Linha",
    CARTELA_CHEIA: "Bingo",
    DUPLA_LINHA: "Duplo Bingo",
    SEGUNDA_LINHA: "Bola Max",
    BOLA_MAX: "Bola Max",
    DOACAO: "Doação",
  };

  const letrasBingo = ["B", "I", "N", "G", "O"];

  const numerosPainel = [
    Array.from({ length: 15 }, (_, i) => i + 1),
    Array.from({ length: 15 }, (_, i) => i + 16),
    Array.from({ length: 15 }, (_, i) => i + 31),
    Array.from({ length: 15 }, (_, i) => i + 46),
    Array.from({ length: 15 }, (_, i) => i + 61),
  ];

  const ultimasBolas = historico.slice(-6).reverse();

  const premiosDaRodada = [
    {
      codigo: "PRIMEIRA_LINHA",
      titulo: "Linha",
      valor: formatarMoeda(premiacaoAtual.linha),
      descricao: "Primeiro prêmio",
    },
    {
      codigo: "CARTELA_CHEIA",
      titulo: "Bingo",
      valor: formatarMoeda(premiacaoAtual.bingo),
      descricao: "Cartela cheia",
    },
    {
      codigo: "DUPLA_LINHA",
      titulo: "Duplo Bingo",
      valor: formatarMoeda(premiacaoAtual.duploBingo),
      descricao: "Prêmio especial",
    },
    {
      codigo: "SEGUNDA_LINHA",
      titulo: "Bola Max",
      valor: premiacaoAtual.bolaMax
        ? `Até a bola ${premiacaoAtual.bolaMax}`
        : "--",
      descricao: "Desafio da rodada",
    },
    {
      codigo: "DOACAO",
      titulo: "Doação",
      valor: formatarMoeda(premiacaoAtual.doacao),
      descricao: "Valor beneficente",
    },
  ];

  function formatarNumero(numero) {
    if (numero === null || numero === undefined || numero === "") return "--";
    return String(Number(numero)).padStart(2, "0");
  }

  function formatarStatusRodada(status) {
    if (!status) return "AGUARDANDO";
    return String(status).replaceAll("_", " ");
  }

  function formatarPremio(premio) {
    return nomesPremio[premio] || premio || "Linha";
  }

  function formatarMoeda(valor) {
    if (valor === null || valor === undefined || valor === "") return "--";

    const numero = Number(String(valor).replace(",", "."));

    if (!Number.isFinite(numero)) return `R$ ${valor}`;

    return numero.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function valorPremioAtual(premio = premioAtual) {
    if (premio === "PRIMEIRA_LINHA") return formatarMoeda(premiacaoAtual.linha);
    if (premio === "CARTELA_CHEIA") return formatarMoeda(premiacaoAtual.bingo);
    if (premio === "DUPLA_LINHA") return formatarMoeda(premiacaoAtual.duploBingo);

    if (premio === "SEGUNDA_LINHA" || premio === "BOLA_MAX") {
      return premiacaoAtual.bolaMax
        ? `Até a bola ${premiacaoAtual.bolaMax}`
        : "--";
    }

    if (premio === "DOACAO") return formatarMoeda(premiacaoAtual.doacao);

    return "--";
  }

  function textoPremioAtual(premio = premioAtual) {
    return `${formatarPremio(premio)} • ${valorPremioAtual(premio)}`;
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

  function extrairNumeroSorteado(data) {
    if (typeof data === "number") return data;

    return (
      data?.numero ??
      data?.numeroSorteado ??
      data?.valor ??
      data?.bola ??
      data?.numeroAtual ??
      data?.number ??
      data?.data?.numero ??
      data?.data?.numeroSorteado ??
      null
    );
  }

  function montarFontes(data) {
    return [
      data,
      data?.data,
      data?.payload,
      data?.body,
      data?.rodada,
      data?.round,
      data?.premiacao,
      data?.premiacaoAtual,
      data?.premios,
      data?.valoresPremio,
    ].filter(Boolean);
  }

  function buscarValorEmFontes(fontes, chaves) {
    for (const fonte of fontes) {
      if (!fonte || typeof fonte !== "object") continue;

      for (const chave of chaves) {
        const valor = fonte[chave];

        if (valor !== undefined && valor !== null && valor !== "") {
          return valor;
        }
      }
    }

    return undefined;
  }

  function normalizarPremiacaoFonte(data) {
    if (!data) return null;

    const fontes = montarFontes(data);

    const linha = buscarValorEmFontes(fontes, [
      "linha",
      "premioLinha",
      "valorLinha",
      "primeiraLinha",
      "valorPrimeiraLinha",
      "premioPrimeiraLinha",
    ]);

    const bingo = buscarValorEmFontes(fontes, [
      "bingo",
      "premioBingo",
      "valorBingo",
      "cartelaCheia",
      "valorCartelaCheia",
      "premioCartelaCheia",
    ]);

    const duploBingo = buscarValorEmFontes(fontes, [
      "duploBingo",
      "duplo_bingo",
      "premioDuploBingo",
      "valorDuploBingo",
      "duplaLinha",
      "valorDuplaLinha",
      "premioDuplaLinha",
    ]);

    const bolaMax = buscarValorEmFontes(fontes, [
      "bolaMax",
      "bola_max",
      "premioBolaMax",
      "numeroBolaMax",
      "valorBolaMax",
      "acumulado",
    ]);

    const doacao = buscarValorEmFontes(fontes, [
      "doacao",
      "doação",
      "valorDoacao",
      "valorDoação",
      "premioDoacao",
      "arrecadacao",
    ]);

    const premiacao = {};

    if (linha !== undefined) premiacao.linha = linha;
    if (bingo !== undefined) premiacao.bingo = bingo;
    if (duploBingo !== undefined) premiacao.duploBingo = duploBingo;
    if (bolaMax !== undefined) premiacao.bolaMax = bolaMax;
    if (doacao !== undefined) premiacao.doacao = doacao;

    return Object.keys(premiacao).length > 0 ? premiacao : null;
  }

  function normalizarPremioAtual(valor) {
    if (!valor) return null;

    const texto = String(valor)
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (
      texto === "PRIMEIRA_LINHA" ||
      texto === "LINHA" ||
      texto.includes("PRIMEIRA")
    ) {
      return "PRIMEIRA_LINHA";
    }

    if (
      texto === "CARTELA_CHEIA" ||
      texto === "BINGO" ||
      texto.includes("CARTELA")
    ) {
      return "CARTELA_CHEIA";
    }

    if (
      texto === "DUPLA_LINHA" ||
      texto === "DUPLO_BINGO" ||
      texto.includes("DUPLO") ||
      texto.includes("DUPLA")
    ) {
      return "DUPLA_LINHA";
    }

    if (
      texto === "SEGUNDA_LINHA" ||
      texto === "BOLA_MAX" ||
      texto.includes("BOLA") ||
      texto.includes("ACUMULADO")
    ) {
      return "SEGUNDA_LINHA";
    }

    if (texto === "DOACAO" || texto.includes("DOACAO")) {
      return "DOACAO";
    }

    return valor;
  }

  function extrairPremioAtual(data) {
    const fontes = montarFontes(data);

    const premio = buscarValorEmFontes(fontes, [
      "premioAtual",
      "premio",
      "tipoPremio",
      "premioDaVez",
      "concorrendoAgora",
      "etapaPremio",
      "fasePremio",
    ]);

    return normalizarPremioAtual(premio);
  }

  function salvarPremiacaoLocal(premiacao) {
    try {
      localStorage.setItem("premiacaoRodadaAtual", JSON.stringify(premiacao));
    } catch {
      // ignora erro de localStorage
    }
  }

  function aplicarPremiacao(data, salvarLocalmente = false) {
    const premiacaoNormalizada = normalizarPremiacaoFonte(data);

    if (!premiacaoNormalizada) return;

    setPremiacaoAtual((atual) => {
      const novaPremiacao = {
        ...atual,
        ...premiacaoNormalizada,
      };

      if (salvarLocalmente) {
        salvarPremiacaoLocal(novaPremiacao);
      }

      return novaPremiacao;
    });
  }

  function aplicarPremioAtual(valor, salvarLocalmente = false) {
    const premioNormalizado = normalizarPremioAtual(valor);

    if (!premioNormalizado) return;

    setPremioAtual(premioNormalizado);

    if (salvarLocalmente) {
      try {
        localStorage.setItem("premioAtualOperador", premioNormalizado);
      } catch {
        // ignora erro de localStorage
      }
    }
  }

  function lerPremiacaoSalva() {
    try {
      const salvo = localStorage.getItem("premiacaoRodadaAtual");

      if (!salvo) return null;

      const dados = JSON.parse(salvo);

      return {
        linha: dados?.linha || "",
        bingo: dados?.bingo || "",
        duploBingo: dados?.duploBingo || "",
        bolaMax: dados?.bolaMax || "60",
        doacao: dados?.doacao || "",
      };
    } catch {
      return null;
    }
  }

  function atualizarPremiacaoDaTv() {
    const premiacaoSalva = lerPremiacaoSalva();

    if (premiacaoSalva) {
      setPremiacaoAtual((atual) => {
        const novaPremiacao = {
          ...atual,
          ...premiacaoSalva,
        };

        return JSON.stringify(atual) === JSON.stringify(novaPremiacao)
          ? atual
          : novaPremiacao;
      });
    }
  }

  function caminhosAudioNumero(numero) {
    const letraMaiuscula = letraDoNumero(numero);
    const letraMinuscula = letraMaiuscula.toLowerCase();

    const numeroComZero = formatarNumero(numero);
    const numeroSemZero = String(Number(numero));

    return [
      `/sounds/bingo-voice/${letraMaiuscula}_${numeroSemZero}.mp3`,
      `/sounds/bingo-voice/${letraMinuscula}_${numeroSemZero}.mp3`,
      `/sounds/bingo-voice/${letraMaiuscula}_${numeroComZero}.mp3`,
      `/sounds/bingo-voice/${letraMinuscula}_${numeroComZero}.mp3`,
    ];
  }

  function tocarAudioArquivo(src, playbackRate = 1) {
    return new Promise((resolve) => {
      if (!somLiberadoRef.current) {
        resolve(false);
        return;
      }

      if (voiceAudioRef.current) {
        voiceAudioRef.current.pause();
        voiceAudioRef.current.currentTime = 0;
      }

      const audio = new Audio();
      audio.src = src;
      audio.volume = 1;
      audio.playbackRate = playbackRate;
      audio.preload = "auto";

      voiceAudioRef.current = audio;

      let finalizado = false;

      const finalizar = (tocou) => {
        if (finalizado) return;
        finalizado = true;
        resolve(tocou);
      };

      audio.onended = () => finalizar(true);

      audio.onerror = () => {
        console.error("Erro ao encontrar/tocar áudio:", src);
        finalizar(false);
      };

      audio
        .play()
        .then(() => {
          console.log("Áudio tocando:", src);
        })
        .catch((error) => {
          console.error("Erro ao tocar áudio:", src, error);
          finalizar(false);
        });
    });
  }

  async function falarNumeroSorteado(numero) {
    if (!somLiberadoRef.current) return;
    if (!numero && numero !== 0) return;

    const caminhos = caminhosAudioNumero(numero);

    for (const caminho of caminhos) {
      const tocou = await tocarAudioArquivo(caminho, 1);

      if (tocou) {
        return;
      }
    }

    console.error("Nenhum áudio encontrado para o número:", numero);
  }

  function esperar(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function tocarAudio(audioRef) {
    if (!somLiberadoRef.current || !audioRef.current) return;

    try {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.volume = 1;
      await audioRef.current.play();
    } catch (error) {
      console.warn("Áudio bloqueado ou arquivo ausente:", error);
    }
  }

  function pararAudio(audioRef) {
    if (!audioRef.current) return;

    audioRef.current.pause();
    audioRef.current.currentTime = 0;
  }

  async function liberarSom() {
    try {
      somLiberadoRef.current = true;

      // Destrava o autoplay com um áudio silencioso em data URI.
      // Isso acontece dentro do clique real do botão.
      const unlockAudio = new Audio(
        "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQQAAAAAAA=="
      );

      unlockAudio.volume = 0.01;
      await unlockAudio.play();
      unlockAudio.pause();
      unlockAudio.currentTime = 0;

      setSomLiberado(true);
      setMensagem("Som da TV ativado. Boa sorte a todos!");

      console.log("Som da TV liberado.");
    } catch (error) {
      somLiberadoRef.current = false;
      setSomLiberado(false);
      console.warn("Não foi possível liberar o som:", error);
      setMensagem("Clique novamente em Ativar som da TV.");
    }
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
        // continua
      }

      const response = await api.get("/sessoes");
      const sessoes = extrairLista(response.data);

      if (sessoes.length > 0) {
        const sessao =
          sessoes.find(
            (s) =>
              s.status === "ATIVA" ||
              s.status === "EM_ANDAMENTO" ||
              s.status === "AGENDADA" ||
              s.ativa === true
          ) || sessoes[0];

        setSessaoId(sessao.id);
        return sessao.id;
      }

      const novaSessao = await criarSessaoAutomatica();

      setSessaoId(novaSessao.id);
      setMensagem("Sessão criada automaticamente.");

      return novaSessao.id;
    } catch (error) {
      console.error("Erro ao carregar/criar sessão:", error);
      setMensagem(
        error?.response?.data?.mensagem ||
          error?.response?.data?.message ||
          "Erro ao carregar ou criar sessão."
      );
      return null;
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

        aplicarPremiacao(response.data, true);

        const premioSalvo = localStorage.getItem("premioAtualOperador");
        const premioDaApi = extrairPremioAtual(response.data);

        aplicarPremioAtual(
          premioSalvo || premioDaApi || "PRIMEIRA_LINHA",
          false
        );

        atualizarPremiacaoDaTv();

        setMensagem(
          `Transmitindo rodada ${response.data.numeroRodada || response.data.id}`
        );
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

    if (!Number.isFinite(numeroNormalizado)) return;

    if (animandoRef.current) {
      filaRef.current.push({ numero: numeroNormalizado, premio });
      return;
    }

    animandoRef.current = true;

    try {
      setCountdown(null);

      setNumeroAnimado(numeroNormalizado);
      setNumeroAtual(numeroNormalizado);

      setHistorico((prev) =>
        prev.includes(numeroNormalizado) ? prev : [...prev, numeroNormalizado]
      );

      setMensagem(
        `${textoPremioAtual(premio)} • ${letraDoNumero(
          numeroNormalizado
        )} ${formatarNumero(numeroNormalizado)}`
      );

      setFaseAnimacao("dropping");

      await tocarAudio(dropAudioRef);
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

  const handleWsMessage = useCallback(
    (event) => {
      if (!event?.type) return;

      const tiposAtualizacaoPremio = [
        "PRIZE_UPDATED",
        "PRIZES_UPDATED",
        "PREMIO_ATUALIZADO",
        "PREMIACAO_ATUALIZADA",
        "PREMIOS_ATUALIZADOS",
        "ROUND_PRIZE_UPDATED",
        "ROUND_PRIZES_UPDATED",
        "ROUND_UPDATED",
      ];

      if (tiposAtualizacaoPremio.includes(event.type)) {
        aplicarPremiacao(event, true);

        const premioDoEvento = extrairPremioAtual(event);

        if (premioDoEvento) {
          aplicarPremioAtual(premioDoEvento, true);
        }

        setMensagem("Premiação atualizada.");

        return;
      }

      if (event.type === "NUMBER_DRAWN") {
        aplicarPremiacao(event, true);

        const numero = extrairNumeroSorteado(event);
        const premioDoEvento = extrairPremioAtual(event) || premioAtual;

        if (premioDoEvento) {
          aplicarPremioAtual(premioDoEvento, true);
        }

        iniciarSequenciaSorteio(numero, premioDoEvento);
        return;
      }

      if (event.type === "ROUND_CREATED") {
        const idRodada = event.rodadaId || event.id;

        if (idRodada) {
          setRodadaId(idRodada);
        }

        if (event.numeroRodada) {
          setNumeroRodada(event.numeroRodada);
        }

        aplicarPremiacao(event, true);

        const premioSalvo = localStorage.getItem("premioAtualOperador");
        const premioDoEvento = extrairPremioAtual(event);

        aplicarPremioAtual(
          premioSalvo || premioDoEvento || "PRIMEIRA_LINHA",
          false
        );

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

        if (voiceAudioRef.current) {
          voiceAudioRef.current.pause();
          voiceAudioRef.current.currentTime = 0;
        }

        setMensagem(
          event.numeroRodada
            ? `Rodada ${event.numeroRodada} criada. Aguardando início...`
            : "Nova rodada criada. Aguardando início..."
        );

        return;
      }

      if (event.type === "ROUND_STARTED" || event.type === "GAME_STARTED") {
        const idRodada = event.rodadaId || event.id || rodadaId;

        if (idRodada) {
          setRodadaId(idRodada);
        }

        if (event.numeroRodada) {
          setNumeroRodada(event.numeroRodada);
        }

        aplicarPremiacao(event, true);

        const premioSalvo = localStorage.getItem("premioAtualOperador");
        const premioDoEvento = extrairPremioAtual(event);

        aplicarPremioAtual(
          premioSalvo || premioDoEvento || "PRIMEIRA_LINHA",
          false
        );

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

        if (voiceAudioRef.current) {
          voiceAudioRef.current.pause();
          voiceAudioRef.current.currentTime = 0;
        }

        iniciarContagemRodada(idRodada);

        return;
      }

      if (event.type === "ROUND_PAUSED") {
        setStatusRodada("PAUSADA");
        setMensagem("Rodada pausada.");
        pararAudio(machineAudioRef);
        pararAudio(dropAudioRef);

        if (voiceAudioRef.current) {
          voiceAudioRef.current.pause();
          voiceAudioRef.current.currentTime = 0;
        }

        return;
      }

      if (event.type === "ROUND_FINISHED") {
        setStatusRodada("FINALIZADA");
        setMensagem("Rodada encerrada.");
        pararAudio(machineAudioRef);
        pararAudio(dropAudioRef);

        if (voiceAudioRef.current) {
          voiceAudioRef.current.pause();
          voiceAudioRef.current.currentTime = 0;
        }
      }
    },
    [premioAtual, rodadaId, premiacaoAtual]
  );

  useWebSocket({
    sessaoId,
    rodadaId,
    onMessage: handleWsMessage,
  });

  useEffect(() => {
    somLiberadoRef.current = somLiberado;
  }, [somLiberado]);

  useEffect(() => {
    async function iniciarTv() {
      const premioSalvo = localStorage.getItem("premioAtualOperador");

      if (premioSalvo) {
        aplicarPremioAtual(premioSalvo, false);
      }

      atualizarPremiacaoDaTv();

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
    function atualizarPremio(event) {
      if (event.detail) {
        aplicarPremioAtual(event.detail, true);
      }
    }

    function atualizarPremiacao(event) {
      if (event.detail) {
        aplicarPremiacao(event.detail, true);
      }
    }

    function atualizarPorStorage(event) {
      if (event.key === "premioAtualOperador" && event.newValue) {
        aplicarPremioAtual(event.newValue, false);
      }

      if (event.key === "premiacaoRodadaAtual") {
        atualizarPremiacaoDaTv();
      }
    }

    const intervalo = setInterval(() => {
      const premioSalvo = localStorage.getItem("premioAtualOperador");

      if (premioSalvo) {
        setPremioAtual((atual) => {
          const premioNormalizado = normalizarPremioAtual(premioSalvo);
          return atual === premioNormalizado ? atual : premioNormalizado;
        });
      }

      atualizarPremiacaoDaTv();
    }, 700);

    window.addEventListener("premioAtualizado", atualizarPremio);
    window.addEventListener("premiacaoAtualizada", atualizarPremiacao);
    window.addEventListener("storage", atualizarPorStorage);

    return () => {
      clearInterval(intervalo);
      window.removeEventListener("premioAtualizado", atualizarPremio);
      window.removeEventListener("premiacaoAtualizada", atualizarPremiacao);
      window.removeEventListener("storage", atualizarPorStorage);
    };
  }, []);

  useEffect(() => {
    return () => {
      pararAudio(machineAudioRef);
      pararAudio(dropAudioRef);

      if (voiceAudioRef.current) {
        voiceAudioRef.current.pause();
        voiceAudioRef.current.currentTime = 0;
      }
    };
  }, []);

  return (
    <div className={`tv-page bingo-tv-gold fase-${faseAnimacao}`}>
      <audio
        ref={machineAudioRef}
        src="/sounds/bingo-machine.mp3"
        preload="auto"
        loop
      />

      <audio ref={dropAudioRef} src="/sounds/ball-drop.mp3" preload="auto" />

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
          <div className="gold-benefit-title">
            <strong>Bingo Beneficente</strong>
            <span>
              Rodada {numeroRodada || rodadaId || "--"} •{" "}
              {formatarStatusRodada(statusRodada)}
            </span>
          </div>

          <div className="gold-number-board">
            {numerosPainel.map((linha, linhaIndex) => (
              <div className="gold-board-row" key={letrasBingo[linhaIndex]}>
                <div className="gold-board-letter">
                  {letrasBingo[linhaIndex]}
                </div>

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
                      {formatarNumero(numero)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <section className="gold-prize-showcase">
            <div className="gold-prize-now">
              <span className="gold-prize-eyebrow">Concorrendo agora</span>

              <div className="gold-prize-now-main">
                <strong>{formatarPremio(premioAtual)}</strong>
                <em>{valorPremioAtual(premioAtual)}</em>
              </div>

              <small>Prêmio em destaque da rodada</small>
            </div>

            <div className="gold-prize-list">
              {premiosDaRodada.map((premio) => (
                <div
                  key={premio.codigo}
                  className={`gold-prize-mini-card ${
                    premio.codigo === premioAtual ? "active" : ""
                  }`}
                >
                  <span>{premio.titulo}</span>
                  <strong>{premio.valor}</strong>
                  <small>{premio.descricao}</small>
                </div>
              ))}
            </div>
          </section>

          <div className="gold-info-card gold-current-card">
            <span className="gold-info-label">NÚMERO ATUAL</span>
            <strong>
              {numeroAtual ? (
                <>
                  <em>{letraDoNumero(numeroAtual)}</em>{" "}
                  {formatarNumero(numeroAtual)}
                </>
              ) : (
                "--"
              )}
            </strong>
          </div>

          <div className="gold-info-card gold-order-card">
            <span className="gold-info-label">ORDEM DAS BOLAS CANTADAS</span>
            <strong>
              {historico.length}
              <small>/75</small>
            </strong>
          </div>

          <div className="gold-message-card">
            {mensagem || "Boa sorte a todos!"}
          </div>
        </section>

        <section className="gold-right-panel">
          <BingoGlobe3D
            numeroAtual={numeroAtual}
            numeroAnimado={numeroAnimado}
            faseAnimacao={faseAnimacao}
            historico={historico}
          />

          <div className="gold-info-card gold-last-card gold-globe-last-card">
            <span className="gold-info-label">ÚLTIMAS BOLAS CANTADAS</span>

            <div className="gold-last-balls">
              {ultimasBolas.length > 0 ? (
                ultimasBolas.map((numero, index) => (
                  <div
                    className={`gold-small-ball ${
                      numero === numeroAtual ? "active" : ""
                    }`}
                    key={`${numero}-${index}`}
                  >
                    <span>{formatarNumero(numero)}</span>
                  </div>
                ))
              ) : (
                <>
                  <div className="gold-small-ball empty">
                    <span>--</span>
                  </div>
                  <div className="gold-small-ball empty">
                    <span>--</span>
                  </div>
                  <div className="gold-small-ball empty">
                    <span>--</span>
                  </div>
                  <div className="gold-small-ball empty">
                    <span>--</span>
                  </div>
                  <div className="gold-small-ball empty">
                    <span>--</span>
                  </div>
                  <div className="gold-small-ball empty">
                    <span>--</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}