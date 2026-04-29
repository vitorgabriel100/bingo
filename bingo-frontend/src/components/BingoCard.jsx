export default function BingoCard({ numbers, drawnNumbers }) {
  return (
    <div className="card">
      {numbers.map((n, i) => {
        const marked = drawnNumbers.includes(n);

        return (
          <div key={i} className={`card-number ${marked ? "marked" : ""}`}>
            {n}
          </div>
        );
      })}
    </div>
  );
}