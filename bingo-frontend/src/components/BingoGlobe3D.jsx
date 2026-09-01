import { useEffect, useMemo, useRef, useState } from "react";

const VIDEO_SRC = "/videos/bingo-globo.mp4?v=4";

function formatarNumero(numero) {
  if (numero === null || numero === undefined || numero === "") return "--";
  const valor = Number(numero);
  return Number.isFinite(valor) ? String(valor).padStart(2, "0") : "--";
}

export default function BingoGlobe3D({
  numeroAtual,
  numeroAnimado,
  faseAnimacao = "idle",
}) {
  const videoRef = useRef(null);
  const [videoPronto, setVideoPronto] = useState(false);
  const [videoErro, setVideoErro] = useState(false);

  const numeroExibido = useMemo(function obterNumero() {
    if (
      numeroAnimado !== null &&
      numeroAnimado !== undefined &&
      numeroAnimado !== ""
    ) {
      return numeroAnimado;
    }
    return numeroAtual;
  }, [numeroAtual, numeroAnimado]);

  useEffect(function prepararVideo() {
    const video = videoRef.current;
    if (!video) return undefined;
    let montado = true;
    const pronto = function pronto() {
      if (!montado) return;
      setVideoPronto(true);
      setVideoErro(false);
    };
    const erro = function erro(evento) {
      console.error("Erro ao carregar vídeo da bolinheira:", evento);
      if (!montado) return;
      setVideoErro(true);
      setVideoPronto(true);
    };

    video.addEventListener("loadeddata", pronto);
    video.addEventListener("canplay", pronto);
    video.addEventListener("playing", pronto);
    video.addEventListener("error", erro);
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.load();
    video.play().then(pronto).catch(function liberarImagem() {
      pronto();
    });

    const fallback = window.setTimeout(pronto, 1800);
    return function limpar() {
      montado = false;
      window.clearTimeout(fallback);
      video.removeEventListener("loadeddata", pronto);
      video.removeEventListener("canplay", pronto);
      video.removeEventListener("playing", pronto);
      video.removeEventListener("error", erro);
    };
  }, []);

  useEffect(function ajustarVelocidade() {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = faseAnimacao === "spinning" ? 1.2 : 1;
  }, [faseAnimacao]);

  const numeroFormatado = formatarNumero(numeroExibido);
  const mostrarQueda =
    faseAnimacao === "dropping" && numeroFormatado !== "--";

  return (
    <div className={"bingo-video-globe-wrapper fase-" + faseAnimacao}>
      <div className="bingo-video-globe-aura" />
      <div className="bingo-video-globe-stage">
        <video
          ref={videoRef}
          className={"bingo-video-globe " + (videoPronto ? "loaded" : "")}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          controls={false}
          disablePictureInPicture
          aria-label="Bolinheira do bingo em movimento"
        >
          <source src={VIDEO_SRC} type="video/mp4" />
        </video>

        {!videoPronto && !videoErro && (
          <div className="bingo-video-globe-loading">Carregando bolinheira...</div>
        )}
        {videoErro && (
          <div className="bingo-video-globe-loading">Bolinheira indisponível</div>
        )}

        {mostrarQueda && (
          <div className="bingo-video-exit-tube" aria-label={"Bola sorteada " + numeroFormatado}>
            <div
              key={String(numeroExibido) + "-" + faseAnimacao}
              className="bingo-fixed-falling-ball"
            >
              <span>{numeroFormatado}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
