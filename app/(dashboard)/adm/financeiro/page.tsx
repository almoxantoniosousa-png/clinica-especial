"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "../../../../lib/supabaseBrowserClient";

export default function FinanceiroPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [registros, setRegistros] = useState<any[]>([]);
  const [mesAno, setMesAno] = useState("2026-05"); 
  const [buscaNome, setBuscaNome] = useState("");
  const [carregando, setCarregando] = useState(false);

  // Carrega os dados direto do Supabase
  const carregarDados = async () => {
    const [ano, mes] = mesAno.split("-");
    const primeiroDia = `${ano}-${mes}-01`;
    const ultimoDia = `${ano}-${mes}-31`;

    const { data, error } = await supabase
      .from("financeiro")
      .select(`*, atendentes ( id, nome ), crianca`) 
      .gte("data", primeiroDia)
      .lte("data", ultimoDia)
      .order("data", { ascending: false });

    if (error) {
      console.error("Erro ao carregar financeiro:", error.message);
    } else {
      setRegistros(data || []);
    }
  };

  useEffect(() => { 
    carregarDados(); 
  }, [mesAno, supabase]);

  // Grava o pagamento direto na tabela 'financeiro' do Supabase, sem passar pela Action travada
  const handlePagarAtendente = async (atendenteId: string, nomeAtendente: string) => {
    if (!atendenteId) return alert("Erro: ID do atendente não encontrado.");

    const confirmar = window.confirm(`Deseja confirmar o pagamento de todas as horas do mês de ${mesAno} para ${nomeAtendente}?`);
    if (!confirmar) return;

    setCarregando(true);
    const [ano, mes] = mesAno.split("-");
    const primeiroDia = `${ano}-${mes}-01`;
    const ultimoDia = `${ano}-${mes}-31`;

    // Atualiza direto o banco de dados na nuvem
    const { error } = await supabase
      .from("financeiro")
      .update({ status: "pago" })
      .eq("atendente_id", atendenteId)
      .gte("data", primeiroDia)
      .lte("data", ultimoDia);

    setCarregando(false);

    if (error) {
      alert(`Erro ao salvar no banco do Supabase: ${error.message}`);
    } else {
      alert(`Sucesso! Pagamento de ${nomeAtendente} salvo permanentemente na nuvem.`);
      carregarDados(); // Recarrega a tela com os dados atualizados do banco
    }
  };

  // Agrupa os registros para montar os cards
  const cardsAtendentes = useMemo(() => {
    const grupos: any = {};
    
    registros.forEach(reg => {
      const nomeProfissional = reg.atendentes?.nome || "Não Identificado";
      const nomeCrianca = reg.crianca || "Não informada";
      const idProfissional = reg.atendente_id || reg.atendentes?.id; 

      if (!grupos[nomeProfissional]) {
        grupos[nomeProfissional] = { 
          id: idProfissional,
          nome: nomeProfissional, 
          criancas: new Set(), 
          horas: 0, 
          total: 0, 
          pendente: false 
        };
      }
      grupos[nomeProfissional].horas += Number(reg.horas) || 0;
      grupos[nomeProfissional].total += Number(reg.valor_total) || 0;
      grupos[nomeProfissional].criancas.add(nomeCrianca); 
      
      if (reg.status === "pendente") {
        grupos[nomeProfissional].pendente = true;
      }
    });

    return Object.values(grupos).filter((a: any) => 
      a.nome.toLowerCase().includes(buscaNome.toLowerCase())
    );
  }, [registros, buscaNome]);

  return (
    <div style={{ padding: "30px", backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px" }}>
        <h1 style={{ color: "#1e293b" }}>Financeiro Clínica ABRAÇO</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <input type="month" value={mesAno} onChange={(e) => setMesAno(e.target.value)} style={filterStyle} />
          <input type="text" placeholder="Buscar profissional..." value={buscaNome} onChange={(e) => setBuscaNome(e.target.value)} style={filterStyle} />
        </div>
      </div>

      {/* CARDS INDIVIDUAIS POR ATENDENTE */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px", marginBottom: "40px" }}>
        {cardsAtendentes.map((at: any) => (
          <div key={at.nome} style={{ ...cardStyle, borderLeft: at.pendente ? "6px solid #f59e0b" : "6px solid #10b981", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <h3 style={{ margin: "0" }}>{at.nome}</h3>
              <p style={{ fontSize: "12px", color: "#64748b", marginTop: "5px" }}>
                Atendidos: {Array.from(at.criancas).join(", ")}
              </p>
              <hr style={{ border: "0", borderTop: "1px solid #f1f5f9", margin: "10px 0" }} />
              <p style={{ margin: "5px 0" }}>Horas: <strong>{at.horas.toFixed(2)}h</strong></p>
              <p style={{ fontSize: "18px", fontWeight: "bold", color: "#0f172a", margin: "0 0 15px 0" }}>
                R$ {at.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {at.pendente ? (
              <button 
                onClick={() => handlePagarAtendente(at.id, at.nome)} 
                disabled={carregando}
                style={{...btnPagarStyle, opacity: carregando ? 0.5 : 1}}
              >
                {carregando ? "Salvando..." : "Confirmar Pagamento"}
              </button>
            ) : (
              <div style={badgePagoStyle}>✓ Tudo Pago</div>
            )}
          </div>
        ))}
      </div>

      {/* TABELA DE REGISTROS */}
      <div style={{ backgroundColor: "#fff", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ backgroundColor: "#f1f5f9" }}>
            <tr>
              <th style={th}>Data</th>
              <th style={th}>Atendente</th>
              <th style={th}>Criança</th> 
              <th style={th}>Local</th>
              <th style={th}>Total Despesa</th>
              <th style={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {registros.map(r => (
              <tr key={r.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={td}>{new Date(r.data + "T12:00:00").toLocaleDateString('pt-BR')}</td>
                <td style={td}><strong>{r.atendentes?.nome || "Não Identificado"}</strong></td>
                <td style={td}>{r.crianca || "---"}</td> 
                <td style={td}>{r.local}</td>
                <td style={td}>R$ {Number(r.valor_total).toFixed(2)}</td>
                <td style={td}>
                  <span style={{
                    padding: "4px 8px", 
                    borderRadius: "6px", 
                    fontSize: "12px", 
                    fontWeight: "bold",
                    backgroundColor: r.status === "pendente" ? "#fef3c7" : "#d1fae5",
                    color: r.status === "pendente" ? "#d97706" : "#059669"
                  }}>
                    {r.status === "pendente" ? "Pendente" : "Pago"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const filterStyle = { padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" };
const cardStyle = { backgroundColor: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" };
const th = { padding: "15px", textAlign: "left" as "left", color: "#64748b" };
const td = { padding: "15px", color: "#1e293b" };
const btnPagarStyle = { width: "100%", padding: "10px", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold" as "bold", cursor: "pointer" };
const badgePagoStyle = { width: "100%", padding: "10px", backgroundColor: "#d1fae5", color: "#065f46", textAlign: "center" as "center", borderRadius: "8px", fontWeight: "bold" as "bold", fontSize: "14px" };