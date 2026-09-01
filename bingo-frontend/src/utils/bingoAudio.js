const BASE_LOCUCOES = "/sounds/locucoes";
const BASE_AVISOS = "/sounds/geral";

export const MODOS_LOCUCAO = [
  { value: "rodizio", label: "Rodízio (5 vozes)" },
  { value: "loc0", label: "Voz 1" },
  { value: "loc1", label: "Voz 2" },
  { value: "loc2", label: "Voz 3" },
  { value: "loc3", label: "Voz 4" },
  { value: "loc4", label: "Voz 5" },
];

export const AVISOS_GERAIS = [
  { value: "encerrado", label: "Encerrado" },
  { value: "keno", label: "Keno" },
  { value: "kina", label: "Kina" },
  { value: "kuadra", label: "Kuadra" },
  { value: "rd", label: "RD" },
  { value: "ru", label: "RU" },
  { value: "sorteio-acumulado", label: "Sorteio acumulado" },
  { value: "termino-compras", label: "Término das compras" },
];

const LOCUTORES = ["loc0", "loc1", "loc2", "loc3", "loc4"];
const AVISOS_VALIDOS = new Set(AVISOS_GERAIS.map((aviso) => aviso.value));

export function modoLocucaoValido(modo) {
  return modo === "rodizio" || LOCUTORES.includes(modo);
}

export function caminhoLocucao(numero, modo = "rodizio", ordem = 1) {
  const valor = Number(numero);

  if (!Number.isInteger(valor) || valor < 1 || valor > 75) {
    return null;
  }

  const indice = Math.max(0, Number(ordem) - 1) % LOCUTORES.length;
  const locutor = modo === "rodizio" ? LOCUTORES[indice] : modo;
  const locutorSeguro = LOCUTORES.includes(locutor) ? locutor : LOCUTORES[0];
  const prefixo = locutorSeguro === "loc0" ? "n" : "a";
  const numeroFormatado = String(valor).padStart(2, "0");

  return `${BASE_LOCUCOES}/${locutorSeguro}/${prefixo}${numeroFormatado}.mp3`;
}

export function caminhoAviso(chave) {
  if (!AVISOS_VALIDOS.has(chave)) return null;
  return `${BASE_AVISOS}/${chave}.mp3`;
}
