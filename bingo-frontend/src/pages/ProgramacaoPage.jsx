import { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import SalaSelector from "../components/SalaSelector";
import useSalas from "../hooks/useSalas";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

const FORM_INICIAL = {
  titulo: "",
  agendadaPara: "",
  premioLinha: "",
  premioBingo: "",
  premioDuploBingo: "",
  precoAntecipado: "",
  precoNoDia: "",
  fimPrecoAntecipado: "",
  limiteCartelas: "100",
  especial: false,
  vendaAberta: true,
};

function moeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataHora(valor) {
  if (!valor) return "--";
  return new Date(valor).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function paraInput(valor) {
  return valor ? String(valor).slice(0, 16) : "";
}

export default function ProgramacaoPage() {
  const navigate = useNavigate();
  const { salas, salaSelecionadaId, selecionarSala, carregandoSalas, erroSalas } = useSalas();
  const [programacao, setProgramacao] = useState([]);
  const [pendentes, setPendentes] = useState([]);
  const [form, setForm] = useState(FORM_INICIAL);
  const [editandoId, setEditandoId] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    if (!salaSelecionadaId) return;
    setErro("");
    try {
      const [programacaoResponse, pendentesResponse] = await Promise.all([
        api.get(`/programacao/salas/${salaSelecionadaId}`),
        api.get("/compras/operador", { params: { salaId: salaSelecionadaId } }),
      ]);
      setProgramacao(Array.isArray(programacaoResponse.data) ? programacaoResponse.data : []);
      setPendentes(Array.isArray(pendentesResponse.data) ? pendentesResponse.data : []);
    } catch (error) {
      setErro(error?.response?.data?.mensagem || "Não foi possível carregar a programação.");
    }
  }, [salaSelecionadaId]);

  useEffect(() => {
    let ativo = true;
    Promise.resolve().then(() => { if (ativo) carregar(); });
    return () => { ativo = false; };
  }, [carregar]);

  const totalPremios = useMemo(() =>
    Number(form.premioLinha || 0) + Number(form.premioBingo || 0) + Number(form.premioDuploBingo || 0),
  [form.premioLinha, form.premioBingo, form.premioDuploBingo]);

  function alterar(event) {
    const { name, value, type, checked } = event.target;
    setForm((atual) => ({ ...atual, [name]: type === "checkbox" ? checked : value }));
  }

  function limpar() {
    setForm(FORM_INICIAL);
    setEditandoId(null);
  }

  function editar(item) {
    setEditandoId(item.id);
    setForm({
      titulo: item.titulo || "",
      agendadaPara: paraInput(item.agendadaPara),
      premioLinha: item.premioLinha ?? "",
      premioBingo: item.premioBingo ?? "",
      premioDuploBingo: item.premioDuploBingo ?? "",
      precoAntecipado: item.precoAntecipado ?? "",
      precoNoDia: item.precoNoDia ?? "",
      fimPrecoAntecipado: paraInput(item.fimPrecoAntecipado),
      limiteCartelas: item.limiteCartelas ?? "100",
      especial: Boolean(item.especial),
      vendaAberta: Boolean(item.vendaAberta),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function salvar(event) {
    event.preventDefault();
    setSalvando(true);
    setErro("");
    setMensagem("");
    const payload = {
      ...form,
      premioLinha: Number(form.premioLinha),
      premioBingo: Number(form.premioBingo),
      premioDuploBingo: Number(form.premioDuploBingo),
      precoAntecipado: Number(form.precoAntecipado),
      precoNoDia: Number(form.precoNoDia),
      limiteCartelas: Number(form.limiteCartelas),
    };
    try {
      if (editandoId) {
        await api.patch(`/rodadas/${editandoId}`, payload);
      } else {
        const sessao = await api.get("/sessoes/ativa", { params: { salaId: salaSelecionadaId } });
        await api.post(`/rodadas/sessao/${sessao.data.id}`, payload);
      }
      setMensagem(editandoId ? "Programação atualizada." : "Rodada adicionada à programação.");
      limpar();
      await carregar();
    } catch (error) {
      setErro(error?.response?.data?.mensagem || "Não foi possível salvar a rodada.");
    } finally {
      setSalvando(false);
    }
  }

  async function atualizarPedido(id, acao) {
    setErro("");
    try {
      await api.patch(`/compras/${id}/${acao}`);
      setMensagem(acao === "confirmar" ? "Pagamento confirmado e cartelas ativadas." : "Pedido cancelado.");
      await carregar();
    } catch (error) {
      setErro(error?.response?.data?.mensagem || "Não foi possível atualizar o pedido.");
    }
  }

  async function iniciarRodada(id) {
    setErro("");
    try {
      await api.patch(`/rodadas/${id}/iniciar`);
      navigate("/rodada");
    } catch (error) {
      setErro(error?.response?.data?.mensagem || "Não foi possível iniciar a rodada.");
    }
  }

  return (
    <Layout
      title="Programação e vendas"
      subtitle="Defina datas, horários, premiações e preços; confirme os pedidos pagos pelo site."
      actions={<SalaSelector salas={salas} value={salaSelecionadaId} onChange={selecionarSala} disabled={carregandoSalas} />}
    >
      {(erroSalas || erro) && <div className="ui-alert error">{erroSalas || erro}</div>}
      {mensagem && <div className="ui-alert success">{mensagem}</div>}

      <section className="ui-panel schedule-editor">
        <div className="ui-panel-header"><div><span className="ui-kicker">{editandoId ? "Edição" : "Nova rodada"}</span><h2>{editandoId ? "Atualizar programação" : "Programar partida"}</h2></div><strong>{moeda(totalPremios)} em prêmios</strong></div>
        <form onSubmit={salvar} className="schedule-form">
          <label className="span-2">Título<input name="titulo" value={form.titulo} onChange={alterar} placeholder="Ex.: Bingo especial beneficente" required /></label>
          <label>Data e horário<input type="datetime-local" name="agendadaPara" value={form.agendadaPara} onChange={alterar} required /></label>
          <label>Preço antecipado<input type="number" min="0" step="0.01" name="precoAntecipado" value={form.precoAntecipado} onChange={alterar} required /></label>
          <label>Antecipado até<input type="datetime-local" name="fimPrecoAntecipado" value={form.fimPrecoAntecipado} onChange={alterar} required /></label>
          <label>Preço no dia<input type="number" min="0" step="0.01" name="precoNoDia" value={form.precoNoDia} onChange={alterar} required /></label>
          <label>Prêmio linha<input type="number" min="0" step="0.01" name="premioLinha" value={form.premioLinha} onChange={alterar} required /></label>
          <label>Prêmio bingo<input type="number" min="0" step="0.01" name="premioBingo" value={form.premioBingo} onChange={alterar} required /></label>
          <label>Prêmio duplo bingo<input type="number" min="0" step="0.01" name="premioDuploBingo" value={form.premioDuploBingo} onChange={alterar} required /></label>
          <label>Limite de cartelas<input type="number" min="1" name="limiteCartelas" value={form.limiteCartelas} onChange={alterar} required /></label>
          <label className="schedule-check"><input type="checkbox" name="especial" checked={form.especial} onChange={alterar} /> Rodada especial</label>
          <label className="schedule-check"><input type="checkbox" name="vendaAberta" checked={form.vendaAberta} onChange={alterar} /> Venda aberta</label>
          <div className="schedule-actions span-2"><button className="ui-button primary" disabled={salvando}>{salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Criar rodada"}</button>{editandoId && <button type="button" className="ui-button ghost" onClick={limpar}>Cancelar edição</button>}</div>
        </form>
      </section>

      <section className="ui-panel schedule-list-panel">
        <div className="ui-panel-header"><div><span className="ui-kicker">Calendário</span><h2>Rodadas programadas</h2></div><strong className="ui-count">{programacao.length}</strong></div>
        <div className="schedule-card-grid">
          {programacao.map((item) => <article key={item.id} className={`schedule-card ${item.especial ? "special" : ""}`}><div><span>{item.especial ? "Rodada especial" : "Rodada regular"}</span><h3>{item.titulo || `Rodada ${item.numeroRodada}`}</h3><strong>{dataHora(item.agendadaPara)}</strong></div><dl><div><dt>Linha</dt><dd>{moeda(item.premioLinha)}</dd></div><div><dt>Bingo</dt><dd>{moeda(item.premioBingo)}</dd></div><div><dt>Duplo</dt><dd>{moeda(item.premioDuploBingo)}</dd></div><div><dt>Antecipado</dt><dd>{moeda(item.precoAntecipado)}</dd></div><div><dt>No dia</dt><dd>{moeda(item.precoNoDia)}</dd></div></dl><footer><span className={item.vendaAberta ? "sale-open" : "sale-closed"}>{item.vendaAberta ? "Venda aberta" : "Venda fechada"}</span><div className="inline-actions"><button className="ui-button ghost" onClick={() => editar(item)}>Editar</button>{["AGENDADA", "CRIADA"].includes(item.status) && <button className="ui-button primary" onClick={() => iniciarRodada(item.id)}>Iniciar na TV</button>}</div></footer></article>)}
          {!programacao.length && <p className="empty-state">Nenhuma rodada programada nesta sala.</p>}
        </div>
      </section>

      <section className="ui-panel pending-orders-panel">
        <div className="ui-panel-header"><div><span className="ui-kicker">Pagamentos</span><h2>Pedidos aguardando confirmação</h2></div><strong className="ui-count">{pendentes.length}</strong></div>
        <div className="responsive-table-wrap"><table className="clean-table"><thead><tr><th>Pedido</th><th>Jogador</th><th>Rodada</th><th>Cartelas</th><th>Total</th><th>Ações</th></tr></thead><tbody>{pendentes.map((pedido) => <tr key={pedido.id}><td>#{pedido.id}</td><td><strong>{pedido.participanteApelido}</strong></td><td>{pedido.tituloRodada || pedido.rodadaId}</td><td>{pedido.cartelas?.join(", ")}</td><td>{moeda(pedido.valorTotal)}</td><td><div className="inline-actions"><button className="ui-button primary" onClick={() => atualizarPedido(pedido.id, "confirmar")}>Confirmar Pix</button><button className="ui-button ghost" onClick={() => atualizarPedido(pedido.id, "cancelar")}>Cancelar</button></div></td></tr>)}</tbody></table>{!pendentes.length && <p className="empty-state">Nenhum pagamento pendente.</p>}</div>
      </section>
    </Layout>
  );
}
