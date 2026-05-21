import { useEffect, useMemo, useRef, useState } from "react";

const VIDEO_SRC = "/videos/bingo-globo.mp4?v=2";

export default function BingoGlobe3D({
  numeroAtual,
  numeroAnimado,
  faseAnimacao = "idle",
}) {
  const videoRef = useRef(null);

  const [videoPronto, setVideoPronto] = useState(false);
  const [videoErro, setVideoErro] = useState(false);

  const [bolaCaindo, setBolaCaindo] = useState(null);
  const [quedaKey, setQuedaKey] = useState(0);

  const ultimoNumeroAnimadoRef = useRef(null);
  const timeoutRef = useRef(null);
  const tentativaPlayRef = useRef(null);

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

  function marcarVideoPronto() {
    setVideoPronto(true);
    setVideoErro(false);
  }

  async function tentarTocarVideo() {
    const video = videoRef.current;

    if (!video) return;

    try {
      video.muted = true;
      video.loop = true;
      video.playsInline = true;

      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");

      if (faseAnimacao === "spinning") {
        video.playbackRate = 1.2;
      } else if (faseAnimacao === "dropping" || faseAnimacao === "revealed") {
        video.playbackRate = 1.25;
      } else {
        video.playbackRate = 1;
      }

      await video.play();

      marcarVideoPronto();
    } catch (error) {
      console.warn("TV não conseguiu iniciar o vídeo do globo ainda:", error);

      if (tentativaPlayRef.current) {
        clearTimeout(tentativaPlayRef.current);
      }

      tentativaPlayRef.current = setTimeout(() => {
        tentarTocarVideo();
      }, 900);
    }
  }

  useEffect(() => {
    tentarTocarVideo();

    return () => {
      if (tentativaPlayRef.current) {
        clearTimeout(tentativaPlayRef.current);
      }
    };
  }, [faseAnimacao]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    try {
      video.load();
      tentarTocarVideo();
    } catch {
      // ignora falha de load em navegador antigo de TV
    }
  }, []);

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
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          controls={false}
          disablePictureInPicture
          onLoadedData={marcarVideoPronto}
          onCanPlay={marcarVideoPronto}
          onCanPlayThrough={marcarVideoPronto}
          onPlaying={marcarVideoPronto}
          onError={(error) => {
            console.error("Erro ao carregar vídeo do globo:", error);
            setVideoErro(true);
            setVideoPronto(false);
          }}
        >
          <source src={VIDEO_SRC} type="video/mp4" />
        </video>

        {!videoPronto && !videoErro && (
          <div className="bingo-video-globe-loading">Carregando globo...</div>
        )}

        {videoErro && (
          <div className="bingo-video-globe-loading">
            Globo indisponível
          </div>
        )}

        <div className="bingo-video-glass-overlay"></div>

        <div className="bingo-video-exit-tube">
          {bolaCaindo !== null && bolaCaindo !== undefined && (
            <div key={quedaKey} className="bingo-fixed-falling-ball">
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