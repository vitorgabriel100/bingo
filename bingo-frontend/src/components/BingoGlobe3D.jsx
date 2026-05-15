import { useEffect, useMemo, useRef, useState } from "react";

export default function BingoGlobe3D({
  numeroAtual,
  numeroAnimado,
  faseAnimacao = "idle",
}) {
  const videoRef = useRef(null);
  const [videoPronto, setVideoPronto] = useState(false);

  const numeroExibido = useMemo(() => {
    if (numeroAnimado !== null && numeroAnimado !== undefined) {
      return numeroAnimado;
    }

    return numeroAtual;
  }, [numeroAtual, numeroAnimado]);

  function formatarNumero(numero) {
    if (numero === null || numero === undefined || numero === "") return "--";
    return String(Number(numero)).padStart(2, "0");
  }

  useEffect(() => {
    async function tentarTocarVideo() {
      try {
        if (!videoRef.current) return;

        videoRef.current.playbackRate =
          faseAnimacao === "dropping" || faseAnimacao === "revealed" ? 1.25 : 1;

        await videoRef.current.play();
      } catch {
        // alguns navegadores só liberam depois de interação, mas muted geralmente toca
      }
    }

    tentarTocarVideo();
  }, [faseAnimacao]);

  return (
    <div className={`bingo-video-globe-wrapper fase-${faseAnimacao}`}>
      <div className="bingo-video-globe-aura"></div>

      <div className="bingo-video-globe-stage">
        <video
          ref={videoRef}
          className={`bingo-video-globe ${videoPronto ? "loaded" : ""}`}
          src="/videos/bingo-globo.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onCanPlay={() => setVideoPronto(true)}
        />

        {!videoPronto && (
          <div className="bingo-video-globe-loading">
            Carregando globo...
          </div>
        )}

        <div className="bingo-video-glass-overlay"></div>

        <div className="bingo-video-exit-tube">
          <div
            key={numeroExibido ?? "empty"}
            className={`bingo-video-output-ball ${
              faseAnimacao === "dropping" ? "dropping" : ""
            } ${faseAnimacao === "revealed" ? "revealed" : ""}`}
          >
            <span>{formatarNumero(numeroExibido)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}