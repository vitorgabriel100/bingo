export function falarNumeroSorteado(numero) {
  if (!numero && numero !== 0) return;
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const numeroTexto = String(numero);
  const digitos = numeroTexto.split("").join(" e ");

  const texto = `Número ${numero}, ${digitos}`;

  const fala = new SpeechSynthesisUtterance(texto);
  fala.lang = "pt-BR";
  fala.rate = 0.9;
  fala.pitch = 0.65;
  fala.volume = 1;

  const vozes = window.speechSynthesis.getVoices();

  const vozMasculina =
    vozes.find(
      (voz) =>
        voz.lang === "pt-BR" &&
        /daniel|felipe|antonio|male|masculino|google/i.test(voz.name)
    ) ||
    vozes.find((voz) => voz.lang === "pt-BR") ||
    vozes.find((voz) => voz.lang?.startsWith("pt"));

  if (vozMasculina) {
    fala.voice = vozMasculina;
  }

  window.speechSynthesis.speak(fala);
}