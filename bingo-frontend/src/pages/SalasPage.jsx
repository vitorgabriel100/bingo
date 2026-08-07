import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";

const FORM_INICIAL = {
  nome: "",
  local: "",
  slug: "",
  serieCartela: 8,
  cartelaInicial: 701,
  cartelaFinal: 800,
};

const ACESSO_INICIAL = {
  nome: "",
  email: "",
  senha: "",
  perfil: "OPERADOR",
};

export default function SalasPage() {
  const { user } = useAuth();
  const [salas, setSalas] = useState([]);
  const [salaSelecionadaId, setSalaSelecionadaId] = useState(null);
  const [participantes, setParticipantes] = useState([]);
  const [cartelas, setCartelas] = useState([]);
  const [mostrarCartelas, setMostrarCartelas] = useState(false);
  const [carregandoCartelas, setCarregandoCartelas] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [acesso, setAcesso] = useState(ACESSO_INICIAL);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const salaSelecionada = useMemo(
    () => salas.find((sala) => sala.id === salaSelecionadaId) || null,
    [salas, salaSelecionadaId]
  );

  async function carregarSalas() {
    const response = await api.get("/salas");
    const lista = Array.isArray(response.data) ? response.data : [];
    setSalas(lista);
    setSalaSelecionadaId((atual) => atual || lista[0]?.id || null);
  }

  useEffect(() => {
    async function iniciar() {
      try {
        await carregarSalas();
      } catch (error) {
        setErro(error?.response?.data?.mensagem || "Erro ao carregar salas.");
      } finally {
        setCarregando(false);
      }
    }

    iniciar();
  }, []);

  useEffect(() => {
    async function carregarParticipantes() {
      if (!salaSelecionadaId) {
        setParticipantes([]);
        return;
      }

      try {
        const response = await api.get(
          `/salas/${salaSelecionadaId}/participantes`
        );
        setParticipantes(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        setErro(
          error?.response?.data?.mensagem || "Erro ao carregar participantes."
        );
      }
    }

    carregarParticipantes();
  }, [salaSelecionadaId]);

  function atualizarCampo(event) {
    const { name, value, type } = event.target;
    setForm((atual) => ({
      ...atual,
      [name]: type === "number" ? Number(value) : value,
    }));
  }

  function selecionarSala(event) {
    setSalaSelecionadaId(Number(event.target.value));
    setCartelas([]);
    setMostrarCartelas(false);
  }

  async function criarSala(event) {
    event.preventDefault();
    setErro("");
    setMensagem("");
    setSalvando(true);

    try {
      const response = await api.post("/salas", form);
      setForm(FORM_INICIAL);
      await carregarSalas();
      setSalaSelecionadaId(response.data.id);
      setCartelas([]);
      setMostrarCartelas(false);
      setMensagem(
        `Sala criada com as cartelas ${response.data.cartelaInicial}–${response.data.cartelaFinal}.`
      );
    } catch (error) {
      setErro(error?.response?.data?.mensagem || "Erro ao criar sala.");
    } finally {
      setSalvando(false);
    }
  }

  function atualizarAcesso(event) {
    const { name, value } = event.target;
    setAcesso((atual) => ({ ...atual, [name]: value }));
  }

  async function criarAcesso(event) {
    event.preventDefault();
    if (!salaSelecionadaId) return;

    setErro("");
    setMensagem("");
    setSalvando(true);

    try {
      const response = await api.post(
        `/salas/${salaSelecionadaId}/acessos`,
        acesso
      );
      setAcesso(ACESSO_INICIAL);
      setMensagem(
        response.data.usuarioCriado
          ? `Login ${response.data.email} criado e vinculado à sala.`
          : `O login ${response.data.email} já existia e foi vinculado a esta sala.`
      );
    } catch (error) {
      setErro(error?.response?.data?.mensagem || "Erro ao criar acesso.");
    } finally {
      setSalvando(false);
    }
  }

  async function copiarLink() {
    if (!salaSelecionada) return;

    const link = `${window.location.origin}${salaSelecionada.linkCadastro}`;
    await navigator.clipboard.writeText(link);
    setMensagem("Link de cadastro copiado.");
  }

  async function alternarCartelas() {
    if (mostrarCartelas) {
      setMostrarCartelas(false);
      return;
    }

    if (cartelas.length === 0) {
      setCarregandoCartelas(true);
      setErro("");

      try {
        const response = await api.get(
          `/salas/${salaSelecionadaId}/cartelas`,
          { params: { serie: salaSelecionada.serieCartela } }
        );
        setCartelas(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        setErro(
          error?.response?.data?.mensagem || "Erro ao carregar cartelas."
        );
        return;
      } finally {
        setCarregandoCartelas(false);
      }
    }

    setMostrarCartelas(true);
  }

  return (
    <Layout title="Salas e participantes">
      <div className="rooms-page">
        {user?.perfil === "ADMIN" && (
          <form className="room-create-card" onSubmit={criarSala}>
            <div>
              <span>Nova casa/ponto</span>
              <h2>Criar sala</h2>
            </div>

            <div className="room-form-grid">
              <label>
                Nome da sala
                <input
                  name="nome"
                  value={form.nome}
                  onChange={atualizarCampo}
                  placeholder="Praça de Moema"
                  required
                />
              </label>

              <label>
                Local
                <input
                  name="local"
                  value={form.local}
                  onChange={atualizarCampo}
                  placeholder="São Paulo - SP"
                />
              </label>

              <label>
                Endereço curto (opcional)
                <input
                  name="slug"
                  value={form.slug}
                  onChange={atualizarCampo}
                  placeholder="praca-de-moema"
                />
              </label>

              <label>
                Série
                <input
                  type="number"
                  min="1"
                  name="serieCartela"
                  value={form.serieCartela}
                  onChange={atualizarCampo}
                  required
                />
              </label>

              <label>
                Cartela inicial
                <input
                  type="number"
                  min="1"
                  name="cartelaInicial"
                  value={form.cartelaInicial}
                  onChange={atualizarCampo}
                  required
                />
              </label>

              <label>
                Cartela final
                <input
                  type="number"
                  min="1"
                  name="cartelaFinal"
                  value={form.cartelaFinal}
                  onChange={atualizarCampo}
                  required
                />
              </label>
            </div>

            <button type="submit" disabled={salvando}>
              {salvando ? "Criando e gerando cartelas..." : "Criar sala"}
            </button>
          </form>
        )}

        {erro && <p className="room-feedback error">{erro}</p>}
        {mensagem && <p className="room-feedback success">{mensagem}</p>}

        <section className="room-management-card">
          <div className="room-management-header">
            <div>
              <span>Casa/ponto atual</span>
              <h2>{salaSelecionada?.nome || "Nenhuma sala cadastrada"}</h2>
            </div>

            {salas.length > 0 && (
              <select
                value={salaSelecionadaId || ""}
                onChange={selecionarSala}
              >
                {salas.map((sala) => (
                  <option value={sala.id} key={sala.id}>
                    {sala.nome}
                  </option>
                ))}
              </select>
            )}
          </div>

          {carregando ? (
            <p>Carregando...</p>
          ) : salaSelecionada ? (
            <>
              <div className="room-summary-grid">
                <div>
                  <span>Série</span>
                  <strong>{salaSelecionada.serieCartela}</strong>
                </div>
                <div>
                  <span>Cartelas</span>
                  <strong>
                    {salaSelecionada.cartelaInicial}–{salaSelecionada.cartelaFinal}
                  </strong>
                </div>
                <div>
                  <span>Cadastros</span>
                  <strong>{participantes.length}</strong>
                </div>
              </div>

              <div className="room-registration-link">
                <code>
                  {window.location.origin}
                  {salaSelecionada.linkCadastro}
                </code>
                <button onClick={copiarLink}>Copiar link</button>
              </div>

              {user?.perfil === "ADMIN" && (
                <form className="room-access-form" onSubmit={criarAcesso}>
                  <div>
                    <span>Login da casa/ponto</span>
                    <strong>Criar ou vincular acesso</strong>
                  </div>

                  <input
                    name="nome"
                    value={acesso.nome}
                    onChange={atualizarAcesso}
                    placeholder="Nome do responsável"
                    required
                  />
                  <input
                    type="email"
                    name="email"
                    value={acesso.email}
                    onChange={atualizarAcesso}
                    placeholder="E-mail de acesso"
                    required
                  />
                  <input
                    type="password"
                    name="senha"
                    value={acesso.senha}
                    onChange={atualizarAcesso}
                    placeholder="Senha (mínimo 6 caracteres)"
                    minLength={6}
                    required
                  />
                  <select
                    name="perfil"
                    value={acesso.perfil}
                    onChange={atualizarAcesso}
                  >
                    <option value="OPERADOR">Operador</option>
                    <option value="GERENTE">Gerente</option>
                  </select>
                  <button type="submit" disabled={salvando}>
                    Criar acesso
                  </button>
                </form>
              )}

              <div className="room-cards-toolbar">
                <div>
                  <span>Conferência das cartelas</span>
                  <strong>
                    Série {salaSelecionada.serieCartela} · {salaSelecionada.cartelaInicial}–
                    {salaSelecionada.cartelaFinal}
                  </strong>
                </div>
                <button onClick={alternarCartelas} disabled={carregandoCartelas}>
                  {carregandoCartelas
                    ? "Carregando..."
                    : mostrarCartelas
                      ? "Ocultar cartelas"
                      : "Visualizar cartelas"}
                </button>
              </div>

              {mostrarCartelas && (
                <div className="generated-cards-grid">
                  {cartelas.map((cartela) => (
                    <article className="generated-bingo-card" key={cartela.id}>
                      <header>
                        <strong>Cartela {cartela.numero}</strong>
                        <span>Série {cartela.serie}</span>
                      </header>
                      <div className="generated-card-letters">
                        {["B", "I", "N", "G", "O"].map((letra) => (
                          <b key={letra}>{letra}</b>
                        ))}
                      </div>
                      <div className="generated-card-numbers">
                        {cartela.grade.map((numero, posicao) => (
                          <span
                            className={numero === null ? "free" : ""}
                            key={`${cartela.id}-${posicao}`}
                          >
                            {numero === null ? "★" : numero}
                          </span>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}

              <div className="participants-table-wrap">
                <table className="participants-table">
                  <thead>
                    <tr>
                      <th>Nome completo</th>
                      <th>Apelido</th>
                      <th>Telefone</th>
                      <th>Cadastro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participantes.map((participante) => (
                      <tr key={participante.id}>
                        <td>{participante.nomeCompleto}</td>
                        <td>{participante.apelido}</td>
                        <td>{participante.telefone}</td>
                        <td>
                          {new Date(participante.criadoEm).toLocaleDateString(
                            "pt-BR"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {participantes.length === 0 && (
                  <p className="participants-empty">
                    Nenhum participante cadastrado nesta sala.
                  </p>
                )}
              </div>
            </>
          ) : (
            <p>Crie a primeira sala para começar.</p>
          )}
        </section>
      </div>
    </Layout>
  );
}
