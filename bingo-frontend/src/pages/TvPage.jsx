import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import useWebSocket from "../hooks/useWebSocket";
import BingoGlobe3D from "../components/BingoGlobe3D";
import "./TvPage.css";

const LETRAS_BINGO = ["B", "I", "N", "G", "O"];
const STATUS_SESSAO_ATIVA = new Set(["CRIADA", "AGENDADA", "EM_ANDAMENTO", "PAUSADA"]);
const TIPOS_PREMIACAO = new Set([
  "PRIZE_UPDATED",
  "PRIZES_UPDATED",
  "PREMIO_ATUALIZADO",
  "PREMIACAO_ATUALIZADA",
  "PREMIOS_ATUALIZADOS",
  "ROUND_PRIZE_UPDATED",
  "ROUND_PRIZES_UPDATED",
  "ROUND_UPDATED",
]);

const NOMES_PREMIO = {
  PRIMEIRA_LINHA: "Linha",
  CARTELA_CHEIA: "Bingo",
  DUPLA_LINHA: "Duplo Bingo",
  SEGUNDA_LINHA: "Bola Max",
  BOLA_MAX: "Bola Max",
  DOACAO: "Doação",
};

const PREMIACAO_INICIAL = {
  linha: "",
  bingo: "",
  duploBingo: "",
  bolaMax: "60",
  doacao: "",
};

const FAIXAS_NUMEROS = LETRAS_BINGO.map(function montarFaixa(letra, indice) {
  return {
    letra: letra,
    numeros: Array.from({ length: 15 }, function criarNumero(_, numero) {
      return indice * 15 + numero + 1;
    }),
  };
});

function extrairLista(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data && data.content)) return data.content;
  if (Array.isArray(data && data.data)) return data.data;
  return [];
}

function formatarNumero(numero) {
  if (numero === null || numero === undefined || numero === "") return "--";
  return String(Number(numero)).padStart(2, "0");
}

function letraDoNumero(numero) {
  const indice = Math.min(4, Math.max(0, Math.ceil(Number(numero) / 15) - 1));
  return LETRAS_BINGO[indice];
}

function formatarStatus(status) {
  return String(status || "AGUARDANDO").replaceAll("_", " ");
}

function formatarMoeda(valor) {
  if (valor === null || valor === undefined || valor === "") return "--";
  const numero = Number(String(valor).replace(",", "."));
  if (!Number.isFinite(numero)) return "R$ " + valor;
  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function montarFontes(data) {
  return [
    data,
    data && data.data,
    data && data.payload,
    data && data.body,
    data && data.rodada,
    data && data.round,
    data && data.premiacao,
    data && data.premiacaoAtual,
    data && data.premios,
    data && data.valoresPremio,
  ].filter(Boolean);
}

function buscarValor(fontes, chaves) {
  for (const fonte of fontes) {
    if (!fonte || typeof fonte !== "object") continue;
    for (const chave of chaves) {
      const valor = fonte[chave];
      if (valor !== undefined && valor !== null && valor !== "") return valor;
    }
  }
  return undefined;
}

function normalizarPremio(valor) {
  if (!valor) return null;
  const texto = String(valor)
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (texto === "LINHA" || texto.includes("PRIMEIRA")) return "PRIMEIRA_LINHA";
  if (texto === "BINGO" || texto.includes("CARTELA")) return "CARTELA_CHEIA";
  if (texto.includes("DUPLO") || texto.includes("DUPLA")) return "DUPLA_LINHA";
  if (texto.includes("BOLA") || texto.includes("ACUMULADO")) return "SEGUNDA_LINHA";
  if (texto.includes("DOACAO")) return "DOACAO";
  return valor;
}

function extrairPremioAtual(data) {
  return normalizarPremio(
    buscarValor(montarFontes(data), [
      "premioAtual",
      "premio",
      "tipoPremio",
      "premioDaVez",
      "concorrendoAgora",
      "etapaPremio",
    ])
  );
}

function extrairNumeroSorteado(data) {
  if (typeof data === "number") return data;
  return (
    (data && data.numero) ||
    (data && data.numeroSorteado) ||
    (data && data.valor) ||
    (data && data.bola) ||
    (data && data.numeroAtual) ||
    (data && data.data && data.data.numero) ||
    null
  );
}

function normalizarPremiacao(data) {
  if (!data) return null;
  const fontes = montarFontes(data);
  const premiacao = {};
  const linha = buscarValor(fontes, [
    "linha",
    "premioLinha",
    "valorLinha",
    "primeiraLinha",
    "valorPrimeiraLinha",
  ]);
  const bingo = buscarValor(fontes, [
    "bingo",
    "premioBingo",
    "valorBingo",
    "cartelaCheia",
    "valorCartelaCheia",
  ]);
  const duploBingo = buscarValor(fontes, [
    "duploBingo",
    "duplo_bingo",
    "premioDuploBingo",
    "valorDuploBingo",
    "duplaLinha",
  ]);
  const bolaMax = buscarValor(fontes, [
    "bolaMax",
    "bola_max",
    "premioBolaMax",
    "numeroBolaMax",
    "valorBolaMax",
    "acumulado",
  ]);
  const doacao = buscarValor(fontes, [
    "doacao",
    "doação",
    "valorDoacao",
    "valorDoação",
    "premioDoacao",
    "arrecadacao",
  ]);

  if (linha !== undefined) premiacao.linha = linha;
  if (bingo !== undefined) premiacao.bingo = bingo;
  if (duploBingo !== undefined) premiacao.duploBingo = duploBingo;
  if (bolaMax !== undefined) premiacao.bolaMax = bolaMax;
  if (doacao !== undefined) premiacao.doacao = doacao;
  return Object.keys(premiacao).length ? premiacao : null;
}

function montarTextoLocucao(numero) {
  const valor = Number(numero);
  if (!Number.isFinite(valor)) return "";
  const digitos = String(valor).split("").join(". ");
  return String(valor) + ". " + digitos + ".";
}

function escolherVozFeminina() {
  if (!("speechSynthesis" in window)) return null;
  const vozes = window.speechSynthesis.getVoices();
  const prioridades = [
    "Google português do Brasil",
    "Microsoft Francisca",
    "Microsoft Maria",
    "Francisca",
    "Maria",
    "Google",
  ];

  for (const nome of prioridades) {
    const voz = vozes.find(function encontrar(item) {
      return (
        item.lang &&
        item.lang.toLowerCase().includes("pt-br") &&
        item.name &&
        item.name.toLowerCase().includes(nome.toLowerCase())
      );
    });
    if (voz) return voz;
  }

  return (
    vozes.find(function ptBr(voz) {
      return voz.lang && voz.lang.toLowerCase().includes("pt-br");
    }) ||
    vozes.find(function pt(voz) {
      return voz.lang && voz.lang.toLowerCase().startsWith("pt");
    }) ||
    null
  );
}

function esperar(ms) {
  return new Promise(function aguardar(resolve) {
    window.setTimeout(resolve, ms);
  });
}

export default function TvPage() {
  const navigate = useNavigate();
  const params = useParams();
  const salaIdDaRota = params.salaId ? Number(params.salaId) : null;

  const [salas, setSalas] = useState([]);
  const [salaSelecionada, setSalaSelecionada] = useState(null);
  const [selecionandoSala, setSelecionandoSala] = useState(false);
  const [erroInicial, setErroInicial] = useState("");
  const [carregando, setCarregando] = useState(true);

  const [sessaoId, setSessaoId] = useState(null);
  const [rodadaId, setRodadaId] = useState(null);
  const [numeroRodada, setNumeroRodada] = useState(null);
  const [statusRodada, setStatusRodada] = useState("AGUARDANDO");
  const [numeroAtual, setNumeroAtual] = useState(null);
  const [numeroAnimado, setNumeroAnimado] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [mensagem, setMensagem] = useState("Preparando transmissão...");
  const [premioAtual, setPremioAtual] = useState("PRIMEIRA_LINHA");
  const [premiacao, setPremiacao] = useState(PREMIACAO_INICIAL);
  const [faseAnimacao, setFaseAnimacao] = useState("idle");
  const [countdown, setCountdown] = useState(null);
  const [somLiberado, setSomLiberado] = useState(false);
  const [ativandoSom, setAtivandoSom] = useState(false);

  const voiceAudioRef = useRef(null);
  const countdownAudioRef = useRef(null);
  const audioContextRef = useRef(null);
  const somLiberadoRef = useRef(false);
  const animandoRef = useRef(false);
  const filaRef = useRef([]);
  const numeroEmAnimacaoRef = useRef(null);
  const eventosProcessadosRef = useRef(new Map());
  const countdownRodadaRef = useRef(null);
  const contagemCanceladaRef = useRef(false);
  const sessaoIdRef = useRef(null);
  const rodadaIdRef = useRef(null);
  const premioAtualRef = useRef("PRIMEIRA_LINHA");
  const carregarSessaoDaSalaRef = useRef(null);
  const carregarRodadaAtivaRef = useRef(null);

  const historicoSet = useMemo(function criarSetHistorico() {
    return new Set(historico);
  }, [historico]);

  const ultimasBolas = useMemo(function obterUltimas() {
    return historico.slice(-8).reverse();
  }, [historico]);

  const premios = useMemo(function montarPremios() {
    return [
      { codigo: "PRIMEIRA_LINHA", titulo: "Linha", valor: formatarMoeda(premiacao.linha) },
      { codigo: "CARTELA_CHEIA", titulo: "Bingo", valor: formatarMoeda(premiacao.bingo) },
      { codigo: "DUPLA_LINHA", titulo: "Duplo Bingo", valor: formatarMoeda(premiacao.duploBingo) },
      {
        codigo: "SEGUNDA_LINHA",
        titulo: "Bola Max",
        valor: premiacao.bolaMax ? "Até a bola " + premiacao.bolaMax : "--",
      },
      { codigo: "DOACAO", titulo: "Doação", valor: formatarMoeda(premiacao.doacao) },
    ];
  }, [premiacao]);

  function valorPremioAtual(codigo) {
    const premio = codigo || premioAtual;
    if (premio === "PRIMEIRA_LINHA") return formatarMoeda(premiacao.linha);
    if (premio === "CARTELA_CHEIA") return formatarMoeda(premiacao.bingo);
    if (premio === "DUPLA_LINHA") return formatarMoeda(premiacao.duploBingo);
    if (premio === "DOACAO") return formatarMoeda(premiacao.doacao);
    if (premio === "SEGUNDA_LINHA" || premio === "BOLA_MAX") {
      return premiacao.bolaMax ? "Até a bola " + premiacao.bolaMax : "--";
    }
    return "--";
  }

  function aplicarDadosRodada(data) {
    if (!data) return;
    const novaPremiacao = normalizarPremiacao(data);
    const novoPremio = extrairPremioAtual(data);
    const fontes = montarFontes(data);
    const id = buscarValor(fontes, ["rodadaId", "id"]);
    const numero = buscarValor(fontes, ["numeroRodada", "numero_rodada"]);
    const status = buscarValor(fontes, ["status", "situacao"]);

    if (id) {
      setRodadaId(Number(id));
      rodadaIdRef.current = Number(id);
    }
    if (numero) setNumeroRodada(numero);
    if (status) setStatusRodada(status);
    if (novaPremiacao) {
      setPremiacao(function atualizar(atual) {
        return Object.assign({}, atual, novaPremiacao);
      });
    }
    if (novoPremio) {
      setPremioAtual(novoPremio);
      premioAtualRef.current = novoPremio;
    }
  }

  function obterAudioContext() {
    if (audioContextRef.current) return audioContextRef.current;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    audioContextRef.current = new AudioContext();
    return audioContextRef.current;
  }

  async function desbloquearElemento(audio, src) {
    if (!audio) return false;
    try {
      audio.pause();
      audio.src = src;
      audio.volume = 0.001;
      audio.muted = false;
      audio.load();
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 1;
      return true;
    } catch (error) {
      console.warn("Não foi possível pré-liberar um áudio da TV:", error);
      audio.volume = 1;
      return false;
    }
  }

  async function liberarSom() {
    setAtivandoSom(true);
    setMensagem("Ativando áudio da transmissão...");
    try {
      const contexto = obterAudioContext();
      if (contexto && contexto.state === "suspended") await contexto.resume();

      await Promise.allSettled([
        desbloquearElemento(
          voiceAudioRef.current,
          "/sounds/bingo-voice/B_1.mp3"
        ),
        desbloquearElemento(
          countdownAudioRef.current,
          "/sounds/countdown-vignette.mp3"
        ),
      ]);

      somLiberadoRef.current = true;
      setSomLiberado(true);
      setMensagem("Som ativado. Transmissão pronta.");
      if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
    } finally {
      setAtivandoSom(false);
    }
  }

  function tocarEfeitoBolinheira() {
    if (!somLiberadoRef.current) return;
    const contexto = obterAudioContext();
    if (!contexto) return;

    const inicio = contexto.currentTime;
    const oscilador = contexto.createOscillator();
    const ganho = contexto.createGain();
    oscilador.type = "sawtooth";
    oscilador.frequency.setValueAtTime(92, inicio);
    oscilador.frequency.exponentialRampToValueAtTime(54, inicio + 0.65);
    ganho.gain.setValueAtTime(0.0001, inicio);
    ganho.gain.exponentialRampToValueAtTime(0.075, inicio + 0.04);
    ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.7);
    oscilador.connect(ganho);
    ganho.connect(contexto.destination);
    oscilador.start(inicio);
    oscilador.stop(inicio + 0.72);
  }

  function tocarEfeitoQueda() {
    if (!somLiberadoRef.current) return;
    const contexto = obterAudioContext();
    if (!contexto) return;

    const inicio = contexto.currentTime;
    const oscilador = contexto.createOscillator();
    const ganho = contexto.createGain();
    oscilador.type = "sine";
    oscilador.frequency.setValueAtTime(720, inicio);
    oscilador.frequency.exponentialRampToValueAtTime(210, inicio + 0.22);
    ganho.gain.setValueAtTime(0.18, inicio);
    ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.25);
    oscilador.connect(ganho);
    ganho.connect(contexto.destination);
    oscilador.start(inicio);
    oscilador.stop(inicio + 0.26);
  }

  function falarComVozDoNavegador(numero) {
    return new Promise(function criarFala(resolve) {
      if (!somLiberadoRef.current || !("speechSynthesis" in window)) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();
      const fala = new SpeechSynthesisUtterance(montarTextoLocucao(numero));
      fala.lang = "pt-BR";
      fala.rate = 1.28;
      fala.pitch = 1.12;
      fala.volume = 1;
      const voz = escolherVozFeminina();
      if (voz) fala.voice = voz;
      fala.onend = resolve;
      fala.onerror = resolve;
      window.speechSynthesis.speak(fala);
      window.setTimeout(resolve, 6500);
    });
  }

  function tocarLocucaoGravada(numero) {
    return new Promise(function reproduzir(resolve) {
      if (!somLiberadoRef.current || !voiceAudioRef.current) {
        resolve();
        return;
      }

      const audio = voiceAudioRef.current;
      let terminou = false;
      function finalizar() {
        if (terminou) return;
        terminou = true;
        audio.onended = null;
        audio.onerror = null;
        resolve();
      }

      audio.pause();
      audio.src =
        "/sounds/bingo-voice/" +
        letraDoNumero(numero) +
        "_" +
        Number(numero) +
        ".mp3";
      audio.volume = 1;
      audio.playbackRate = 1.12;
      audio.preservesPitch = true;
      audio.onended = finalizar;
      audio.onerror = function usarFallback() {
        falarComVozDoNavegador(numero).finally(finalizar);
      };
      audio.load();
      audio.play().catch(function usarFallback() {
        falarComVozDoNavegador(numero).finally(finalizar);
      });
      window.setTimeout(finalizar, 7000);
    });
  }

  function limparTransmissao() {
    setSessaoId(null);
    setRodadaId(null);
    setNumeroRodada(null);
    setStatusRodada("AGUARDANDO");
    setNumeroAtual(null);
    setNumeroAnimado(null);
    setHistorico([]);
    setPremioAtual("PRIMEIRA_LINHA");
    setPremiacao(PREMIACAO_INICIAL);
    setFaseAnimacao("idle");
    setCountdown(null);
    sessaoIdRef.current = null;
    rodadaIdRef.current = null;
    premioAtualRef.current = "PRIMEIRA_LINHA";
    filaRef.current = [];
    animandoRef.current = false;
    numeroEmAnimacaoRef.current = null;
    eventosProcessadosRef.current.clear();
    countdownRodadaRef.current = null;
    contagemCanceladaRef.current = true;
  }

  async function carregarHistorico(idRodada) {
    if (!idRodada) return;
    try {
      const response = await api.get("/rodadas/" + idRodada + "/numeros");
      const numeros = extrairLista(response.data)
        .map(function obterNumero(item) {
          return (item && (item.numero || item.numeroSorteado)) || item;
        })
        .map(Number)
        .filter(Number.isFinite);
      const semRepeticao = Array.from(new Set(numeros));
      setHistorico(semRepeticao);
      const ultimo = semRepeticao.length
        ? semRepeticao[semRepeticao.length - 1]
        : null;
      setNumeroAtual(ultimo);
      setNumeroAnimado(ultimo);
    } catch (error) {
      console.error("Erro ao carregar histórico da TV:", error);
      setMensagem("Não foi possível sincronizar os números da rodada.");
    }
  }

  async function carregarRodadaAtiva(idSessao) {
    try {
      const response = await api.get("/rodadas/sessao/" + idSessao + "/ativa");
      if (!response.data || !response.data.id) {
        setMensagem("Sala pronta. Aguardando o operador criar uma rodada.");
        return;
      }

      aplicarDadosRodada(response.data);
      setMensagem(
        "Transmitindo rodada " +
          (response.data.numeroRodada || response.data.id)
      );
      await carregarHistorico(response.data.id);
    } catch {
      setMensagem("Sala pronta. Aguardando o início da próxima rodada.");
    }
  }

  async function carregarSessaoDaSala(sala) {
    if (!sala) return;
    limparTransmissao();
    contagemCanceladaRef.current = false;
    setCarregando(true);
    setMensagem("Conectando à sala " + sala.nome + "...");

    try {
      const response = await api.get("/sessoes");
      const sessoes = extrairLista(response.data);
      const sessao = sessoes.find(function buscar(item) {
        return (
          Number(item.salaId) === Number(sala.id) &&
          STATUS_SESSAO_ATIVA.has(String(item.status || "").toUpperCase())
        );
      });

      if (!sessao) {
        setMensagem("Sala pronta. Aguardando o operador iniciar a sessão.");
        return;
      }

      setSessaoId(sessao.id);
      sessaoIdRef.current = Number(sessao.id);
      await carregarRodadaAtiva(sessao.id);
    } catch (error) {
      const status = error && error.response && error.response.status;
      if (status === 401 || status === 403) {
        setErroInicial(
          "Faça login neste aparelho com um acesso da sala e abra a TV novamente."
        );
      } else {
        setErroInicial("Não foi possível conectar esta TV ao servidor do bingo.");
      }
    } finally {
      setCarregando(false);
    }
  }

  async function iniciarContagemRodada(idRodada) {
    const chave = idRodada || "RODADA";
    if (countdownRodadaRef.current === chave) return;
    countdownRodadaRef.current = chave;
    contagemCanceladaRef.current = false;
    setNumeroAtual(null);
    setNumeroAnimado(null);
    setHistorico([]);
    setFaseAnimacao("countdown");
    setMensagem("Rodada iniciada. Boa sorte a todos!");

    const musica = countdownAudioRef.current;
    if (somLiberadoRef.current && musica) {
      musica.pause();
      musica.src = "/sounds/countdown-vignette.mp3";
      musica.currentTime = 0;
      musica.volume = 0.65;
      musica.play().catch(function ignorar() {});
    }

    for (let valor = 10; valor >= 1; valor -= 1) {
      if (contagemCanceladaRef.current) break;
      setCountdown(valor);
      await esperar(1000);
    }

    if (!contagemCanceladaRef.current) {
      setCountdown("JÁ!");
      await esperar(850);
    }

    if (musica) {
      musica.pause();
      musica.currentTime = 0;
    }
    setCountdown(null);
    setFaseAnimacao("idle");
    if (!contagemCanceladaRef.current) {
      setMensagem("Rodada pronta para o sorteio.");
    }
  }

  async function iniciarSequenciaSorteio(numero, premio) {
    const valor = Number(numero);
    if (!Number.isFinite(valor)) return;

    if (
      numeroEmAnimacaoRef.current === valor ||
      filaRef.current.some(function repetido(item) {
        return item.numero === valor;
      })
    ) {
      return;
    }

    if (animandoRef.current) {
      filaRef.current.push({ numero: valor, premio: premio });
      return;
    }

    animandoRef.current = true;
    numeroEmAnimacaoRef.current = valor;
    try {
      setCountdown(null);
      setFaseAnimacao("spinning");
      setMensagem("Misturando as bolas...");
      tocarEfeitoBolinheira();
      await esperar(650);

      setNumeroAtual(valor);
      setNumeroAnimado(valor);
      setFaseAnimacao("dropping");
      tocarEfeitoQueda();
      await esperar(520);

      setHistorico(function adicionar(anterior) {
        return anterior.includes(valor) ? anterior : anterior.concat(valor);
      });
      setFaseAnimacao("revealed");
      setMensagem(
        (NOMES_PREMIO[premio] || NOMES_PREMIO[premioAtualRef.current]) +
          " • " +
          letraDoNumero(valor) +
          " " +
          formatarNumero(valor)
      );
      await tocarLocucaoGravada(valor);
      await esperar(180);
      setFaseAnimacao("idle");
    } finally {
      animandoRef.current = false;
      numeroEmAnimacaoRef.current = null;
      const proximo = filaRef.current.shift();
      if (proximo) iniciarSequenciaSorteio(proximo.numero, proximo.premio);
    }
  }

  function eventoDaTransmissaoAtual(event) {
    if (
      event.sessaoId &&
      sessaoIdRef.current &&
      Number(event.sessaoId) !== Number(sessaoIdRef.current)
    ) {
      return false;
    }
    return true;
  }

  function eventoJaProcessado(event) {
    const chave = [
      event.type,
      event.sessaoId || sessaoIdRef.current,
      event.rodadaId || rodadaIdRef.current,
      event.ordem || "",
      extrairNumeroSorteado(event) || "",
      event.status || "",
    ].join(":");
    const agora = Date.now();
    const anterior = eventosProcessadosRef.current.get(chave);
    eventosProcessadosRef.current.set(chave, agora);

    eventosProcessadosRef.current.forEach(function limpar(timestamp, item) {
      if (agora - timestamp > 10000) eventosProcessadosRef.current.delete(item);
    });
    return anterior && agora - anterior < 1500;
  }

  const handleWsMessage = function receberEvento(event) {
    if (!event || !event.type || !eventoDaTransmissaoAtual(event)) return;
    if (eventoJaProcessado(event)) return;

    if (TIPOS_PREMIACAO.has(event.type)) {
      aplicarDadosRodada(event);
      setMensagem("Premiação atualizada.");
      return;
    }

    if (event.type === "NUMBER_DRAWN") {
      aplicarDadosRodada(event);
      const numero = extrairNumeroSorteado(event);
      const premio = extrairPremioAtual(event) || premioAtualRef.current;
      iniciarSequenciaSorteio(numero, premio);
      return;
    }

    if (event.type === "ROUND_CREATED") {
      aplicarDadosRodada(event);
      setHistorico([]);
      setNumeroAtual(null);
      setNumeroAnimado(null);
      setStatusRodada(event.status || "CRIADA");
      filaRef.current = [];
      countdownRodadaRef.current = null;
      setMensagem(
        "Rodada " +
          (event.numeroRodada || event.rodadaId || event.id) +
          " criada. Aguardando início."
      );
      return;
    }

    if (event.type === "ROUND_STARTED" || event.type === "GAME_STARTED") {
      aplicarDadosRodada(event);
      const id = event.rodadaId || event.id || rodadaIdRef.current;
      setStatusRodada("EM_ANDAMENTO");
      filaRef.current = [];
      iniciarContagemRodada(id);
      return;
    }

    if (event.type === "ROUND_PAUSED") {
      setStatusRodada("PAUSADA");
      setMensagem("Rodada pausada.");
      setCountdown(null);
      setFaseAnimacao("idle");
      contagemCanceladaRef.current = true;
      filaRef.current = [];
      return;
    }

    if (
      event.type === "ROUND_RESUMED" ||
      event.type === "ROUND_CONTINUED" ||
      event.type === "GAME_RESUMED"
    ) {
      aplicarDadosRodada(event);
      setStatusRodada("EM_ANDAMENTO");
      setMensagem("Rodada retomada. Boa sorte a todos!");
      contagemCanceladaRef.current = false;
      return;
    }

    if (event.type === "ROUND_FINISHED") {
      setStatusRodada("FINALIZADA");
      setMensagem("Rodada encerrada.");
      setCountdown(null);
      setFaseAnimacao("idle");
      contagemCanceladaRef.current = true;
      filaRef.current = [];
    }
  };

  useWebSocket({
    sessaoId: sessaoId,
    rodadaId: rodadaId,
    onMessage: handleWsMessage,
  });

  useEffect(function sincronizarRefs() {
    somLiberadoRef.current = somLiberado;
    sessaoIdRef.current = sessaoId;
    rodadaIdRef.current = rodadaId;
    premioAtualRef.current = premioAtual;
  }, [somLiberado, sessaoId, rodadaId, premioAtual]);

  useEffect(function sincronizarCarregadores() {
    carregarSessaoDaSalaRef.current = carregarSessaoDaSala;
    carregarRodadaAtivaRef.current = carregarRodadaAtiva;
  });

  useEffect(function prepararVozes() {
    if (!("speechSynthesis" in window)) return undefined;
    const carregar = function carregar() {
      window.speechSynthesis.getVoices();
    };
    carregar();
    window.speechSynthesis.addEventListener("voiceschanged", carregar);
    return function remover() {
      window.speechSynthesis.removeEventListener("voiceschanged", carregar);
    };
  }, []);

  useEffect(function carregarSalasDisponiveis() {
    let ativo = true;
    async function iniciar() {
      setCarregando(true);
      setErroInicial("");
      try {
        const response = await api.get("/salas");
        if (!ativo) return;
        const lista = extrairLista(response.data).filter(function somenteAtivas(sala) {
          return sala.ativa !== false;
        });
        setSalas(lista);

        const idSalvo = Number(localStorage.getItem("tvSalaSelecionadaId"));
        const escolhida =
          lista.find(function pelaRota(sala) {
            return salaIdDaRota && Number(sala.id) === salaIdDaRota;
          }) ||
          lista.find(function pelaMemoria(sala) {
            return !salaIdDaRota && idSalvo && Number(sala.id) === idSalvo;
          }) ||
          (lista.length === 1 ? lista[0] : null);

        if (salaIdDaRota && !escolhida) {
          setErroInicial("Esta sala não existe ou não está liberada para este acesso.");
          return;
        }
        if (!escolhida) {
          setSelecionandoSala(true);
          setCarregando(false);
          return;
        }

        setSelecionandoSala(false);
        setSalaSelecionada(escolhida);
        localStorage.setItem("tvSalaSelecionadaId", String(escolhida.id));
        await carregarSessaoDaSalaRef.current(escolhida);
      } catch (error) {
        if (!ativo) return;
        const status = error && error.response && error.response.status;
        setErroInicial(
          status === 401 || status === 403
            ? "Faça login neste aparelho para escolher a sala da TV."
            : "Não foi possível carregar as salas disponíveis."
        );
        setCarregando(false);
      }
    }
    iniciar();
    return function cancelar() {
      ativo = false;
    };
  }, [salaIdDaRota]);

  useEffect(function aguardarSessaoDaSala() {
    if (!salaSelecionada || sessaoId || erroInicial) return undefined;
    const intervalo = window.setInterval(async function verificar() {
      try {
        const response = await api.get("/sessoes");
        const sessao = extrairLista(response.data).find(function buscar(item) {
          return (
            Number(item.salaId) === Number(salaSelecionada.id) &&
            STATUS_SESSAO_ATIVA.has(String(item.status || "").toUpperCase())
          );
        });
        if (!sessao) return;
        setSessaoId(sessao.id);
        sessaoIdRef.current = Number(sessao.id);
        await carregarRodadaAtivaRef.current(sessao.id);
      } catch {
        // mantém a TV aguardando sem interromper a transmissão
      }
    }, 6000);
    return function parar() {
      window.clearInterval(intervalo);
    };
  }, [salaSelecionada, sessaoId, erroInicial]);

  function selecionarSala(id) {
    const sala = salas.find(function encontrar(item) {
      return Number(item.id) === Number(id);
    });
    if (!sala) return;
    localStorage.setItem("tvSalaSelecionadaId", String(sala.id));
    setSalaSelecionada(sala);
    setSelecionandoSala(false);
    navigate("/tv/sala/" + sala.id, { replace: true });
  }

  useEffect(function limparAoSair() {
    const voiceAudio = voiceAudioRef.current;
    const countdownAudio = countdownAudioRef.current;
    return function limpar() {
      if (voiceAudio) voiceAudio.pause();
      if (countdownAudio) countdownAudio.pause();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  if (erroInicial) {
    return (
      <main className="broadcast-launcher">
        <section className="broadcast-launcher-card broadcast-error-card">
          <span className="broadcast-launcher-kicker">Bingo Beneficente</span>
          <h1>TV não conectada</h1>
          <p>{erroInicial}</p>
          <button type="button" onClick={function irLogin() { navigate("/"); }}>
            Ir para o login
          </button>
        </section>
      </main>
    );
  }

  if (selecionandoSala) {
    return (
      <main className="broadcast-launcher">
        <section className="broadcast-launcher-card">
          <span className="broadcast-launcher-kicker">Bingo Beneficente</span>
          <h1>Qual sala esta TV vai exibir?</h1>
          <p>Cada aparelho recebe apenas os sorteios da sala escolhida.</p>
          <div className="broadcast-room-grid">
            {salas.map(function renderSala(sala) {
              return (
                <button
                  type="button"
                  className="broadcast-room-option"
                  key={sala.id}
                  onClick={function escolher() { selecionarSala(sala.id); }}
                >
                  <strong>{sala.nome}</strong>
                  <span>{sala.local || "Sala " + sala.id}</span>
                </button>
              );
            })}
          </div>
        </section>
      </main>
    );
  }

  if (carregando && !salaSelecionada) {
    return (
      <main className="broadcast-launcher">
        <div className="broadcast-loader" aria-label="Carregando transmissão" />
      </main>
    );
  }

  return (
    <main className={"broadcast-page phase-" + faseAnimacao}>
      <audio ref={voiceAudioRef} preload="auto" />
      <audio ref={countdownAudioRef} preload="auto" />

      {!somLiberado && (
        <div className="broadcast-sound-gate">
          <section>
            <span>Transmissão da sala</span>
            <h1>{salaSelecionada ? salaSelecionada.nome : "Bingo Beneficente"}</h1>
            <p>
              O navegador da TV exige uma confirmação antes de liberar a
              locução das bolas.
            </p>
            <button type="button" onClick={liberarSom} disabled={ativandoSom}>
              <span className="broadcast-sound-icon" aria-hidden="true">♪</span>
              {ativandoSom ? "Ativando..." : "Ativar transmissão com som"}
            </button>
            <small>Use o controle remoto, mouse ou toque na tela.</small>
          </section>
        </div>
      )}

      {faseAnimacao === "countdown" && countdown !== null && (
        <div className="broadcast-countdown">
          <span>Preparem-se</span>
          <strong>{countdown}</strong>
          <small>A rodada vai começar</small>
        </div>
      )}

      <header className="broadcast-header">
        <div className="broadcast-brand">
          <span>Bingo</span>
          <strong>Beneficente</strong>
        </div>

        <div className="broadcast-room">
          <span>Sala em transmissão</span>
          <strong>{salaSelecionada ? salaSelecionada.nome : "--"}</strong>
          <small>{salaSelecionada && salaSelecionada.local}</small>
        </div>

        <div className="broadcast-header-stat">
          <span>Rodada</span>
          <strong>{"#" + (numeroRodada || rodadaId || "--")}</strong>
        </div>

        <div className="broadcast-header-stat">
          <span>Bolas cantadas</span>
          <strong>{historico.length}<small>/75</small></strong>
        </div>

        <div className={"broadcast-status status-" + String(statusRodada).toLowerCase()}>
          <i />
          <span>{formatarStatus(statusRodada)}</span>
        </div>
      </header>

      <div className="broadcast-main-grid">
        <section className="broadcast-left-column">
          <article className="broadcast-panel broadcast-board-panel">
            <div className="broadcast-panel-heading">
              <div>
                <span>Painel da rodada</span>
                <strong>Números sorteados</strong>
              </div>
              <small>Os números acesos já foram cantados</small>
            </div>

            <div className="broadcast-number-board">
              {FAIXAS_NUMEROS.map(function renderFaixa(faixa) {
                return (
                  <div className="broadcast-number-band" key={faixa.letra}>
                    <strong className={"broadcast-letter letter-" + faixa.letra.toLowerCase()}>
                      {faixa.letra}
                    </strong>
                    <div className="broadcast-band-numbers">
                      {faixa.numeros.map(function renderNumero(numero) {
                        const sorteado = historicoSet.has(numero);
                        const atual = numeroAtual === numero;
                        return (
                          <span
                            key={numero}
                            className={(sorteado ? "drawn " : "") + (atual ? "current" : "")}
                          >
                            {formatarNumero(numero)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="broadcast-panel broadcast-prizes-panel">
            <div className="broadcast-current-prize">
              <span>Concorrendo agora</span>
              <strong>{NOMES_PREMIO[premioAtual] || premioAtual}</strong>
              <em>{valorPremioAtual(premioAtual)}</em>
            </div>

            <div className="broadcast-prize-list">
              {premios.map(function renderPremio(premio) {
                const ativo = premio.codigo === premioAtual;
                return (
                  <div
                    key={premio.codigo}
                    className={"broadcast-prize-card " + (ativo ? "active" : "")}
                  >
                    <span>{premio.titulo}</span>
                    <strong>{premio.valor}</strong>
                  </div>
                );
              })}
            </div>
          </article>
        </section>

        <section className="broadcast-right-column">
          <article className="broadcast-panel broadcast-machine-panel">
            <div className="broadcast-machine-heading">
              <span>Bolinheira oficial</span>
              <i>{faseAnimacao === "spinning" ? "Sorteando..." : "Ao vivo"}</i>
            </div>
            <BingoGlobe3D
              numeroAtual={numeroAtual}
              numeroAnimado={numeroAnimado}
              faseAnimacao={faseAnimacao}
            />
          </article>

          <article className="broadcast-now-card">
            <div>
              <span>Última bola cantada</span>
              <strong>
                {numeroAtual ? (
                  <>
                    <em>{letraDoNumero(numeroAtual)}</em>
                    {formatarNumero(numeroAtual)}
                  </>
                ) : (
                  "--"
                )}
              </strong>
            </div>
            <small>{historico.length ? historico.length + "ª bola da rodada" : "Aguardando sorteio"}</small>
          </article>

          <article className="broadcast-panel broadcast-last-panel">
            <div className="broadcast-last-heading">
              <span>Últimos números</span>
              <small>mais recente primeiro</small>
            </div>
            <div className="broadcast-last-balls">
              {Array.from({ length: 8 }, function renderUltima(_, indice) {
                const numero = ultimasBolas[indice];
                return (
                  <div
                    className={
                      "broadcast-mini-ball " +
                      (indice === 0 && numero ? "active " : "") +
                      (!numero ? "empty" : "")
                    }
                    key={numero || "empty-" + indice}
                  >
                    <small>{numero ? letraDoNumero(numero) : ""}</small>
                    <strong>{numero ? formatarNumero(numero) : "--"}</strong>
                  </div>
                );
              })}
            </div>
          </article>
        </section>
      </div>

      <footer className="broadcast-footer">
        <div className="broadcast-message">
          <i />
          <span>{mensagem || "Boa sorte a todos!"}</span>
        </div>

        <div className="broadcast-footer-actions">
          {salas.length > 1 && (
            <label>
              <span>Sala</span>
              <select
                value={salaSelecionada ? salaSelecionada.id : ""}
                onChange={function trocar(event) { selecionarSala(event.target.value); }}
              >
                {salas.map(function opcao(sala) {
                  return <option value={sala.id} key={sala.id}>{sala.nome}</option>;
                })}
              </select>
            </label>
          )}
          <button
            type="button"
            className={somLiberado ? "sound-on" : ""}
            onClick={liberarSom}
          >
            {somLiberado ? "Som ativo" : "Ativar som"}
          </button>
        </div>
      </footer>
    </main>
  );
}
