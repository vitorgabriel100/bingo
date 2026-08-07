import { useEffect, useMemo, useRef, useState } from "react";

const VIDEO_SRC = "/videos/bingo-globo.mp4?v=3";

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
  const timeoutQuedaRef = useRef(null);
  const fallbackLoadingRef = useRef(null);
  const jaTentouPlayRef = useRef(false);

  const numeroExibido = useMemo(() => {
    if (numeroAnimado !== null && numeroAnimado !== undefined && numeroAnimado !== "") {
      return numeroAnimado;
    }

    return numeroAtual;
  }, [numeroAtual, numeroAnimado]);

  function formatarNumero(numero) {
    if (numero === null || numero === undefined || numero === "") return "--";

    const numeroConvertido = Number(numero);

    if (Number.isNaN(numeroConvertido)) return "--";

    return String(numeroConvertido).padStart(2, "0");
  }

  function marcarVideoPronto() {
    setVideoPronto((anterior) => {
      if (anterior) return anterior;
      return true;
    });

    setVideoErro(false);
  }

  async function iniciarVideo() {
    const video = videoRef.current;

    if (!video) return;

    try {
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.autoplay = true;

      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");

      video.playbackRate = 1;

      const resultadoPlay = video.play();

      if (resultadoPlay && typeof resultadoPlay.then === "function") {
        await resultadoPlay;
      }

      marcarVideoPronto();
    } catch (error) {
      console.warn("TV não conseguiu iniciar o vídeo automaticamente:", error);

      /*
        Não fica tentando play em loop infinito.
        Em algumas TVs isso trava bastante.
        Mesmo se o vídeo não tocar, liberamos a tela para não ficar presa em "Carregando globo...".
      */
      marcarVideoPronto();
    }
  }

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    /*
      Fallback principal:
      Se a TV demorar ou falhar nos eventos do vídeo, remove o "Carregando globo..."
      para não deixar a tela preta presa.
    */
    fallbackLoadingRef.current = setTimeout(() => {
      marcarVideoPronto();
    }, 1800);

    const aoCarregar = () => {
      marcarVideoPronto();
    };

    const aoErro = (error) => {
      console.error("Erro ao carregar vídeo do globo:", error);
      setVideoErro(true);

      /*
        Mesmo com erro no vídeo, não deixa a TV pesada presa no loading.
        A bolinha e o restante da tela continuam funcionando.
      */
      setVideoPronto(true);
    };

    video.addEventListener("loadedmetadata", aoCarregar);
    video.addEventListener("loadeddata", aoCarregar);
    video.addEventListener("canplay", aoCarregar);
    video.addEventListener("canplaythrough", aoCarregar);
    video.addEventListener("playing", aoCarregar);
    video.addEventListener("error", aoErro);

    try {
      video.load();
    } catch {
      // Ignora falha de load em navegador antigo de TV.
    }

    if (!jaTentouPlayRef.current) {
      jaTentouPlayRef.current = true;
      iniciarVideo();
    }

    return () => {
      if (fallbackLoadingRef.current) {
        clearTimeout(fallbackLoadingRef.current);
      }

      video.removeEventListener("loadedmetadata", aoCarregar);
      video.removeEventListener("loadeddata", aoCarregar);
      video.removeEventListener("canplay", aoCarregar);
      video.removeEventListener("canplaythrough", aoCarregar);
      video.removeEventListener("playing", aoCarregar);
      video.removeEventListener("error", aoErro);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    /*
      Evita ficar chamando play toda hora.
      Só ajusta velocidade de reprodução quando o vídeo já existe.
    */
    try {
      if (faseAnimacao === "spinning") {
        video.playbackRate = 1.08;
      } else if (faseAnimacao === "dropping" || faseAnimacao === "revealed") {
        video.playbackRate = 1.12;
      } else {
        video.playbackRate = 1;
      }
    } catch {
      // Ignora falha em TVs antigas.
    }
  }, [faseAnimacao]);

  useEffect(() => {
    const numeroValido =
      numeroExibido !== null &&
      numeroExibido !== undefined &&
      numeroExibido !== "";

    if (!numeroValido) {
      ultimoNumeroAnimadoRef.current = null;
      const resetTimer = setTimeout(() => setBolaCaindo(null), 0);
      return () => clearTimeout(resetTimer);
    }

    if (faseAnimacao !== "dropping") {
      return;
    }

    if (ultimoNumeroAnimadoRef.current === numeroExibido) {
      return;
    }

    ultimoNumeroAnimadoRef.current = numeroExibido;

    if (timeoutQuedaRef.current) {
      clearTimeout(timeoutQuedaRef.current);
    }

    setQuedaKey((prev) => prev + 1);
    setBolaCaindo(numeroExibido);

    timeoutQuedaRef.current = setTimeout(() => {
      setBolaCaindo(null);
    }, 620);

    return () => {
      if (timeoutQuedaRef.current) {
        clearTimeout(timeoutQuedaRef.current);
      }
    };
  }, [numeroExibido, faseAnimacao]);

  const numeroFormatado = formatarNumero(numeroExibido);

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
          poster=""
        >
          <source src={VIDEO_SRC} type="video/mp4" />
        </video>

        {!videoPronto && !videoErro && (
          <div className="bingo-video-globe-loading">
            Carregando globo...
          </div>
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
            <span>{numeroFormatado}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
