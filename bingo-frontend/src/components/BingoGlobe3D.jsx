import { useEffect, useMemo, useRef, useState } from "react";

export default function BingoGlobe3D({
  numeroAtual,
  numeroAnimado,
  faseAnimacao = "idle",
}) {
  const videoRef = useRef(null);
  const [videoPronto, setVideoPronto] = useState(false);

  const [bolaCaindo, setBolaCaindo] = useState(null);
  const [quedaKey, setQuedaKey] = useState(0);

  const ultimoNumeroAnimadoRef = useRef(null);
  const timeoutRef = useRef(null);

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
        // vídeo muted normalmente toca sozinho
      }
    }

    tentarTocarVideo();
  }, [faseAnimacao]);

  useEffect(() => {
    const numeroValido =
      numeroExibido !== null &&
      numeroExibido !== undefined &&
      numeroExibido !== "";

    if (!numeroValido) {
      setBolaCaindo(null);
      ultimoNumeroAnimadoRef.current = null;
      return;
    }

    if (faseAnimacao !== "dropping") {
      return;
    }

    if (ultimoNumeroAnimadoRef.current === numeroExibido) {
      return;
    }

    ultimoNumeroAnimadoRef.current = numeroExibido;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setQuedaKey((prev) => prev + 1);
    setBolaCaindo(numeroExibido);

    timeoutRef.current = setTimeout(() => {
      setBolaCaindo(null);
    }, 720);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [numeroExibido, faseAnimacao]);

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
          <div className="bingo-video-globe-loading">Carregando globo...</div>
        )}

        <div className="bingo-video-glass-overlay"></div>

        <div className="bingo-video-exit-tube">
          {bolaCaindo !== null && bolaCaindo !== undefined && (
            <div
              key={quedaKey}
              className="bingo-fixed-falling-ball"
            >
              <span>{formatarNumero(bolaCaindo)}</span>
            </div>
          )}

          <div className="bingo-fixed-current-ball">
            <span>{formatarNumero(numeroExibido)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}