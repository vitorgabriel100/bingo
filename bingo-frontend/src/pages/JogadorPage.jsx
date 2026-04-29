import { useCallback, useState } from "react";
import Layout from "../components/Layout";
import NumberBoard from "../components/NumberBoard";
import useWebSocket from "../hooks/useWebSocket";
import NumberBall from "../components/NumberBall";

export default function JogadorPage() {
  const [sessaoId] = useState(2);
  const [numeroAtual, setNumeroAtual] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [status, setStatus] = useState("Aguardando números...");
  const [saldo] = useState(25.0);
  const [quantidade, setQuantidade] = useState(0);

  const cartelas = [
    { id: "02834", nome: "VITOR GABRIEL", numeros: [12, 34, 52, 60, 83, 1, 27, 36, 68, 71, 9, 41, 56, 73, 85] },
    { id: "05285", nome: "VITOR GABRIEL", numeros: [10, 25, 48, 65, 71, 5, 12, 49, 50, 83, 28, 33, 51, 75, 84] },
    { id: "10336", nome: "VITOR GABRIEL", numeros: [15, 31, 43, 68, 71, 7, 17, 34, 54, 83, 29, 48, 59, 75, 88] },
    { id: "18698", nome: "VITOR GABRIEL", numeros: [1, 11, 30, 57, 80, 9, 38, 41, 69, 73, 19, 20, 43, 77, 88] },
  ];

  const saldoFormatado = saldo.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const handleWsMessage = useCallback((event) => {
    if (event.type === "NUMBER_DRAWN") {
      setNumeroAtual(event.numero);
      setHistorico((prev) => [...prev, event.numero]);
      setStatus(`Número ${event.numero} sorteado`);
    }

    if (event.type === "ROUND_STARTED") setStatus(`Rodada ${event.numeroRodada} em andamento`);
    if (event.type === "ROUND_PAUSED") setStatus("Rodada pausada");
    if (event.type === "ROUND_FINISHED") setStatus("Rodada encerrada");
  }, []);

  useWebSocket([`/topic/sessao/${sessaoId}`], handleWsMessage);

  return (
    <Layout title="BINGO">
      <div className="player-bingo-page">
        <section className="player-buy-panel">
          <div className="quick-values">
            {[1, 5, 10, 20, 30, 40, 50, 100].map((valor) => (
              <button key={valor}>{valor}</button>
            ))}
          </div>

          <div className="buy-row">
            <button onClick={() => setQuantidade((q) => Math.max(0, q - 1))}>-</button>
            <strong>{quantidade}</strong>
            <button onClick={() => setQuantidade((q) => q + 1)}>+</button>
            <span>R$ 0,00</span>
            <button className="buy-button">COMPRAR</button>
          </div>
        </section>

        <section className="player-status-bar">
          <span>SALDO <strong>{saldoFormatado}</strong></span>
          <span>COMPRADAS <strong>{cartelas.length}</strong></span>
        </section>

        <section className="player-current">
  <small>{status}</small>
  <NumberBall number={numeroAtual} />
</section>

        <NumberBoard drawnNumbers={historico} />

        <section className="player-cards-grid">
          {cartelas.map((cartela) => (
            <article className="player-card" key={cartela.id}>
              <header>{cartela.nome}</header>

              <div className="player-card-numbers">
                {cartela.numeros.map((numero, index) => (
                  <span
                    key={`${cartela.id}-${numero}-${index}`}
                    className={historico.includes(numero) ? "marked" : ""}
                  >
                    {String(numero).padStart(2, "0")}
                  </span>
                ))}
              </div>

              <footer>{cartela.id}</footer>
            </article>
          ))}
        </section>

        <button className="bingo-button">PEDIR BINGO</button>
      </div>
    </Layout>
  );
}