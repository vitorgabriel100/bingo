export default function NumberBoard({ drawnNumbers }) {
  return (
    <div className="board">
      {Array.from({ length: 90 }, (_, i) => {
        const n = i + 1;
        const isDrawn = drawnNumbers.includes(n);

        return (
          <div key={n} className={`cell ${isDrawn ? "drawn" : ""}`}>
            {n}
          </div>
        );
      })}
    </div>
  );
}