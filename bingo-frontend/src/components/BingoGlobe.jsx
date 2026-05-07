const bolinhasFake = Array.from({ length: 28 }, (_, index) => ({
  id: index,
  numero: Math.floor(Math.random() * 75) + 1,
  left: 18 + Math.random() * 64,
  top: 18 + Math.random() * 58,
  delay: Math.random() * 1.8,
  speed: 1.2 + Math.random() * 1.5,
}));

export default function BingoGlobe({ numeroAtual }) {
  return (
    <div className="globe-stage">
      <div className="bingo-machine">
        <div className="glass-globe">
          <div className="globe-light" />

          <div className="popcorn-area">
            {bolinhasFake.map((bolinha) => (
              <span
                key={bolinha.id}
                className="globe-mini-ball"
                style={{
                  left: `${bolinha.left}%`,
                  top: `${bolinha.top}%`,
                  animationDelay: `${bolinha.delay}s`,
                  animationDuration: `${bolinha.speed}s`,
                }}
              >
                {bolinha.numero}
              </span>
            ))}
          </div>
        </div>

        <div className="globe-tube" />
        <div className="globe-base" />
      </div>

      {numeroAtual && (
        <div key={numeroAtual} className="falling-bingo-ball">
          <span>{numeroAtual}</span>
        </div>
      )}
    </div>
  );
}