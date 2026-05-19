"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "../../../../lib/supabaseBrowserClient";

export default function CadastrarAtendentePage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  
  const [loading, setLoading] = useState(false);
  const [atendentes, setAtendentes] = useState<any[]>([]);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [registro, setRegistro] = useState(""); // Novo campo de Registro Profissional

  const carregarAtendentes = async () => {
    const { data } = await supabase.from("atendentes").select("*").order("nome");
    setAtendentes(data || []);
  };

  useEffect(() => { 
    carregarAtendentes(); 
  }, [supabase]);

  const handleCadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("atendentes").insert([
      { 
        nome, 
        email, 
        especialidade, 
        whatsapp, 
        registro_profissional: registro, // Salvando o número do registro
        role: "atendente" 
      }
    ]);

    if (error) {
      alert("Erro ao cadastrar: " + error.message);
    } else {
      alert("Atendente cadastrado com sucesso!");
      setNome(""); setEmail(""); setEspecialidade(""); setWhatsapp(""); setRegistro("");
      carregarAtendentes();
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: "30px", backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      
      <div style={{ backgroundColor: "#fff", padding: "25px", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", marginBottom: "30px", borderTop: "4px solid #10b981" }}>
        <h2 style={{ color: "#1e293b", marginBottom: "20px" }}>Novo Atendente</h2>
        <form onSubmit={handleCadastrar} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "15px" }}>
          <input style={inputStyle} placeholder="Nome Completo" value={nome} onChange={(e) => setNome(e.target.value)} required />
          <input style={inputStyle} type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input style={inputStyle} placeholder="Especialidade" value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} />
          <input style={inputStyle} placeholder="Registro (CRP/CRM)" value={registro} onChange={(e) => setRegistro(e.target.value)} />
          <input style={inputStyle} placeholder="WhatsApp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? "Processando..." : "Cadastrar Agora"}
          </button>
        </form>
      </div>

      <div style={{ backgroundColor: "#fff", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", overflow: "hidden" }}>
        <div style={{ padding: "15px", backgroundColor: "#3b82f6", color: "#fff", fontWeight: "bold" }}>
          Lista de Profissionais
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ backgroundColor: "#f1f5f9" }}>
            <tr>
              <th style={tdStyle}>Nome</th>
              <th style={tdStyle}>Registro</th>
              <th style={tdStyle}>Especialidade</th>
              <th style={tdStyle}>WhatsApp</th>
            </tr>
          </thead>
          <tbody>
            {atendentes.map((at) => (
              <tr key={at.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={tdStyle}>{at.nome}</td>
                <td style={tdStyle}>{at.registro_profissional || "---"}</td>
                <td style={tdStyle}>{at.especialidade || "---"}</td>
                <td style={tdStyle}>{at.whatsapp || "---"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inputStyle = { padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1" };
const buttonStyle = { backgroundColor: "#10b981", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", padding: "12px" };
const tdStyle = { padding: "12px", textAlign: "left" as "left" };