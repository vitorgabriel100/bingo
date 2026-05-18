import { useEffect, useState } from "react";

export default function NumberBall({ number }) {
  const [animationKey, setAnimationKey] = useState(0);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (number !== null && number !== undefined) {
      setAnimate(false);

      const timer = setTimeout(() => {
        setAnimationKey((prev) => prev + 1);
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

      <div
        key={animationKey}
        className={`bingo-ball ${animate ? "drop" : ""}`}
      >
        <span>{number ?? "--"}</span>
      </div>

      <div className={`impact-light ${animate ? "show" : ""}`}></div>
    </div>
  );
}