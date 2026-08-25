import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";

function moeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataHora(valor) {
  if (!valor) return "Data a definir";
  return new Date(valor).toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short" });
}

function statusPedido(status) {
  const mapa = { AGUARDANDO_PAGAMENTO: "Aguardando Pix", PAGO: "Pagamento confirmado", CANCELADO: "Cancelado", EXPIRADO: "Reserva expirada" };
  return mapa[status] || status;
}

export default function JogadorPage() {
  const { user, logout } = useAuth();
  const [programacao, setProgramacao] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [rodadaId, setRodadaId] = useState(null);
  const [quantidade, setQuantidade] = useState(1);
  const [pedidoAtual, setPedidoAtual] = useState(null);
  const [erro, setErro] = useState("");
  const [comprando, setComprando] = useState(false);

  const carregar = useCallback(async () => {
    setErro("");
    try {
      const [programacaoResponse, pedidosResponse] = await Promise.all([
        api.get("/compras/catalogo"),
        api.get("/compras/minhas"),
      ]);
      const agenda = (Array.isArray(programacaoResponse.data) ? programacaoResponse.data : [])
        .filter((item) => item.vendaAberta);
      setProgramacao(agenda);
      setPedidos(Array.isArray(pedidosResponse.data) ? pedidosResponse.data : []);
      setRodadaId((atual) => atual || agenda[0]?.id || null);
    } catch (error) {
      setErro(error?.response?.data?.mensagem || "Não foi possível carregar sua área de jogo.");
    }
  }, []);

  useEffect(() => {
    let ativo = true;
    Promise.resolve().then(() => { if (ativo) carregar(); });
    return () => { ativo = false; };
  }, [carregar]);

  const rodada = useMemo(
    () => programacao.find((item) => Number(item.id) === Number(rodadaId)) || null,
    [programacao, rodadaId]
  );

  async function comprar() {
    if (!rodada) return;
    setComprando(true);
    setErro("");
    try {
      const response = await api.post("/compras", { rodadaId: rodada.id, quantidade });
      setPedidoAtual(response.data);
      await carregar();
    } catch (error) {
      setErro(error?.response?.data?.mensagem || "Não foi possível reservar as cartelas.");
    } finally {
      setComprando(false);
    }
  }

  return (
    <main className="shop-page">
      <header className="shop-header">
        <div><span>B</span><div><strong>Bingo Beneficente</strong><small>Programação e cartelas</small></div></div>
        <div className="shop-user"><span>Olá, <strong>{user?.nome}</strong></span><button onClick={logout}>Sair</button></div>
      </header>

      <section className="shop-hero">
        <div><span className="ui-kicker">Próximas partidas</span><h1>Escolha sua rodada e garanta suas cartelas</h1><p>O valor antecipado é aplicado automaticamente até o prazo definido pelo operador.</p></div>
        {rodada?.especial && <div className="shop-special-badge"><span>Especial</span><strong>{moeda(rodada.premiacaoTotal)}</strong><small>em prêmios</small></div>}
      </section>

      {erro && <div className="ui-alert error shop-alert">{erro}</div>}

      <section className="shop-content">
        <div className="shop-games">
          {programacao.map((item) => (
            <button key={item.id} className={`shop-game-card ${rodadaId === item.id ? "selected" : ""} ${item.especial ? "special" : ""}`} onClick={() => setRodadaId(item.id)}>
              <div><span>{item.especial ? "Rodada especial" : "Próxima rodada"}</span><h2>{item.titulo || `Rodada ${item.numeroRodada}`}</h2><p>{dataHora(item.agendadaPara)}</p></div>
              <div className="shop-game-prizes"><span>Linha <strong>{moeda(item.premioLinha)}</strong></span><span>Bingo <strong>{moeda(item.premioBingo)}</strong></span><span>Duplo <strong>{moeda(item.premioDuploBingo)}</strong></span></div>
              <footer><span>Cartela agora</span><strong>{moeda(item.precoAtual)}</strong></footer>
            </button>
          ))}
          {!programacao.length && <div className="ui-panel empty-state">Não há rodadas com venda aberta no momento.</div>}
        </div>

        <aside className="shop-checkout ui-panel">
          <span className="ui-kicker">Sua compra</span>
          <h2>{rodada?.titulo || "Selecione uma rodada"}</h2>
          {rodada && <><p>{dataHora(rodada.agendadaPara)}</p><div className="shop-price-comparison"><div><span>Antecipado</span><strong>{moeda(rodada.precoAntecipado)}</strong></div><div><span>No dia</span><strong>{moeda(rodada.precoNoDia)}</strong></div></div><label>Quantidade de cartelas<div className="shop-quantity"><button onClick={() => setQuantidade((valor) => Math.max(1, valor - 1))}>−</button><strong>{quantidade}</strong><button onClick={() => setQuantidade((valor) => Math.min(100, valor + 1))}>+</button></div></label><div className="shop-total"><span>Total</span><strong>{moeda(Number(rodada.precoAtual || 0) * quantidade)}</strong></div><button className="ui-button primary shop-buy-button" onClick={comprar} disabled={comprando}>{comprando ? "Reservando..." : "Comprar cartelas"}</button></>}
        </aside>
      </section>

      {pedidoAtual && <section className="shop-payment ui-panel"><div><span className="ui-kicker">Pedido #{pedidoAtual.id}</span><h2>Cartelas reservadas</h2><p>{pedidoAtual.cartelas?.join(", ")}</p></div><div><span>Valor do Pix</span><strong>{moeda(pedidoAtual.valorTotal)}</strong><small>{pedidoAtual.recebedorPix}</small></div><div><span>Chave Pix</span><code>{pedidoAtual.chavePix || "O operador ainda precisa configurar BINGO_PIX_KEY"}</code><button className="ui-button ghost" onClick={() => navigator.clipboard?.writeText(pedidoAtual.chavePix || "")}>Copiar chave</button></div><p>{pedidoAtual.instrucoesPagamento} A reserva expira às {new Date(pedidoAtual.expiraEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.</p></section>}

      <section className="shop-orders ui-panel">
        <div className="ui-panel-header"><div><span className="ui-kicker">Histórico</span><h2>Meus pedidos</h2></div><strong className="ui-count">{pedidos.length}</strong></div>
        <div className="responsive-table-wrap"><table className="clean-table"><thead><tr><th>Pedido</th><th>Rodada</th><th>Cartelas</th><th>Total</th><th>Status</th></tr></thead><tbody>{pedidos.map((pedido) => <tr key={pedido.id}><td>#{pedido.id}</td><td><strong>{pedido.tituloRodada}</strong><small>{dataHora(pedido.agendadaPara)}</small></td><td>{pedido.cartelas?.join(", ")}</td><td>{moeda(pedido.valorTotal)}</td><td><span className={`order-status status-${pedido.status?.toLowerCase()}`}>{statusPedido(pedido.status)}</span></td></tr>)}</tbody></table>{!pedidos.length && <p className="empty-state">Você ainda não fez nenhuma compra.</p>}</div>
      </section>
    </main>
  );
}
