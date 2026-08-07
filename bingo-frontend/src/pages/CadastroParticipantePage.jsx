import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";

export default function CadastroParticipantePage() {
  const { slug } = useParams();
  const [sala, setSala] = useState(null);
  const [form, setForm] = useState({
    nomeCompleto: "",
    apelido: "",
    telefone: "",
  });
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  useEffect(() => {
    async function carregarSala() {
      try {
        const response = await api.get(`/public/salas/${slug}`);
        setSala(response.data);
      } catch (error) {
        setErro(
          error?.response?.data?.mensagem ||
            "Sala não encontrada ou indisponível para cadastro."
        );
      } finally {
        setCarregando(false);
      }
    }

    carregarSala();
  }, [slug]);

  function atualizarCampo(event) {
    const { name, value } = event.target;
    setForm((atual) => ({ ...atual, [name]: value }));
  }

  async function cadastrar(event) {
    event.preventDefault();
    setErro("");
    setSucesso("");
    setEnviando(true);

    try {
      const response = await api.post(
        `/public/salas/${slug}/participantes`,
        form
      );

      setSucesso(
        `${response.data.apelido}, seu cadastro foi realizado com sucesso!`
      );
      setForm({ nomeCompleto: "", apelido: "", telefone: "" });
    } catch (error) {
      setErro(
        error?.response?.data?.mensagem ||
          "Não foi possível concluir o cadastro."
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="public-registration-page">
      <section className="public-registration-card">
        <div className="public-registration-brand">B</div>

        {carregando ? (
          <p>Carregando sala...</p>
        ) : (
          <>
            <span className="public-registration-eyebrow">
              Cadastro de participante
            </span>
            <h1>{sala?.nome || "Bingo Beneficente"}</h1>
            {sala?.local && <p>{sala.local}</p>}

            {sala && (
              <form onSubmit={cadastrar} className="public-registration-form">
                <label>
                  Nome completo
                  <input
                    name="nomeCompleto"
                    value={form.nomeCompleto}
                    onChange={atualizarCampo}
                    maxLength={120}
                    autoComplete="name"
                    required
                  />
                </label>

                <label>
                  Apelido
                  <input
                    name="apelido"
                    value={form.apelido}
                    onChange={atualizarCampo}
                    maxLength={60}
                    required
                  />
                </label>

                <label>
                  Telefone com DDD
                  <input
                    name="telefone"
                    value={form.telefone}
                    onChange={atualizarCampo}
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={25}
                    placeholder="(11) 90000-0000"
                    required
                  />
                </label>

                {erro && <p className="registration-message error">{erro}</p>}
                {sucesso && (
                  <p className="registration-message success">{sucesso}</p>
                )}

                <button type="submit" disabled={enviando}>
                  {enviando ? "Cadastrando..." : "Fazer cadastro"}
                </button>
              </form>
            )}

            {!sala && erro && (
              <p className="registration-message error">{erro}</p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
