export default function NumberBall({ number }) {
  const possuiNumero = number !== null && number !== undefined;

  return (
    <div className="bingo-stage">
      <div className="bingo-tube">
        <div className="tube-glow"></div>
      </div>

      <div
        key={possuiNumero ? number : "sem-numero"}
        className={`bingo-ball ${possuiNumero ? "drop" : ""}`}
      >
        <span>{number ?? "--"}</span>
      </div>

      <div className={`impact-light ${possuiNumero ? "show" : ""}`}></div>
    </div>
  );
}
