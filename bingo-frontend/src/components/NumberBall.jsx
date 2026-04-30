import { useEffect, useState } from "react";

export default function NumberBall({ number }) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (number !== null && number !== undefined) {
      setAnimate(false);

      const timer = setTimeout(() => {
        setAnimate(true);
      }, 80);

      return () => clearTimeout(timer);
    }
  }, [number]);

  return (
    <div className="bingo-stage">
      <div className="bingo-tube">
        <div className="tube-glow"></div>
      </div>

      <div className={`bingo-ball ${animate ? "drop" : ""}`}>
        <span>{number ?? "--"}</span>
      </div>

      <div className={`impact-light ${animate ? "show" : ""}`}></div>
    </div>
  );
}