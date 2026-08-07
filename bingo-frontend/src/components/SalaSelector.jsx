export default function SalaSelector({
  salas,
  value,
  onChange,
  disabled = false,
  label = "Sala em uso",
}) {
  return (
    <label className="room-selector">
      <span>{label}</span>
      <select
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || salas.length === 0}
      >
        {salas.length === 0 && <option value="">Nenhuma sala</option>}
        {salas.map((sala) => (
          <option value={sala.id} key={sala.id}>
            {sala.nome}
          </option>
        ))}
      </select>
    </label>
  );
}
