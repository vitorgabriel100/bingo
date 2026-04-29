import { useEffect, useState } from "react";

export default function NumberBall({ number }) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (number !== null && number !== undefined) {
      setAnimate(false);

      const timer = setTimeout(() => {
        setAnimate(true);
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [number]);

  return (
    <div className={`bingo-ball ${animate ? "explode" : ""}`}>
      <span>{number ?? "--"}</span>
    </div>
  );
}