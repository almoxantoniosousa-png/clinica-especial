"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useGravacao } from "@/contexts/gravacao-context";

type Gravacao = {
  id: string;
  descricao: string;
  autor_email: string;
  autor_nome: string | null;
  storage_path: string;
  created_at: string;
};

export default function GravacoesPage() {
  const [usuarioEmail, setUsuarioEmail] = useState("");
  const [usuarioNome, setUsuarioNome] = useState("");
  const [usuarioRole, setUsuarioRole] = useState("");
  const [carregandoRole, setCarregandoRole] = useState(true);

  const [desbloqueado, setDesbloqueado] = useState(false);
  const [senha, setSenha] = useState("");
  const [verificando, setVerificando] = useState(false);
  const [erroSenha, setErroSenha] = useState("");

  const { gravando, segundos, videoBlob, erro, iniciarGravacao, pararGravacao, descartarGravacao, limparErro } = useGravacao();

  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  const [gravacoes, setGravacoes] = useState<Gravacao[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(false);

  useEffect(() => {
    async function identificar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { setCarregandoRole(false); return; }
      setUsuarioEmail(user.email);
      const { data: u } = await supabase.from("usuarios").select("role, nome").eq("email", user.email).maybeSingle();
      if (u?.role) {
        setUsuarioNome(u.nome || "");
        setUsuarioRole((u.role || "").toString().trim().toLowerCase());
        setCarregandoRole(false);
        return;
      }
      const { data: a } = await supabase.from("atendentes").select("role, nome").eq("email", user.email).maybeSingle();
      setUsuarioNome(a?.nome || "");
      setUsuarioRole((a?.role || "").toString().trim().toLowerCase());
      setCarregandoRole(false);
    }
    identificar();
  }, []);

  const podeAcessar = usuarioRole === "adm" || usuarioRole === "admin" || usuarioRole === "gestao";

  async function confirmarSenha(e: React.FormEvent) {
    e.preventDefault();
    if (!senha) return;
    setVerificando(true);
    setErroSenha("");
    const { error } = await supabase.auth.signInWithPassword({ email: usuarioEmail, password: senha });
    setVerificando(false);
    if (error) {
      setErroSenha("Senha incorreta.");
      return;
    }
    setSenha("");
    setDesbloqueado(true);
    carregarGravacoes();
  }

  async function carregarGravacoes() {
    setCarregandoLista(true);
    const { data } = await supabase.from("gravacoes").select("*").order("created_at", { ascending: false });
    setGravacoes((data ?? []) as Gravacao[]);
    setCarregandoLista(false);
  }

  async function handleIniciar() {
    setFeedback(null);
    setDescricao("");
    await iniciarGravacao();
  }

  async function salvarGravacao() {
    if (!videoBlob || !descricao.trim()) return;
    setSalvando(true);
    setFeedback(null);
    const nomeArquivo = `${crypto.randomUUID()}.webm`;
    const { error: erroUpload } = await supabase.storage.from("gravacoes-privadas").upload(nomeArquivo, videoBlob, { contentType: "video/webm" });
    if (erroUpload) {
      setFeedback({ tipo: "erro", msg: "Erro ao enviar: " + erroUpload.message });
      setSalvando(false);
      return;
    }
    const { error: erroInsert } = await supabase.from("gravacoes").insert([{
      descricao: descricao.trim(),
      autor_email: usuarioEmail,
      autor_nome: usuarioNome,
      storage_path: nomeArquivo,
    }]);
    setSalvando(false);
    if (erroInsert) {
      setFeedback({ tipo: "erro", msg: "Erro ao salvar: " + erroInsert.message });
      return;
    }
    setFeedback({ tipo: "sucesso", msg: "Gravação salva." });
    setDescricao("");
    descartarGravacao();
    carregarGravacoes();
  }

  async function assistir(path: string) {
    const { data } = await supabase.storage.from("gravacoes-privadas").createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  async function excluirGravacao(id: string, path: string) {
    if (!confirm("Excluir esta gravação? Não tem como desfazer.")) return;
    await supabase.storage.from("gravacoes-privadas").remove([path]);
    await supabase.from("gravacoes").delete().eq("id", id);
    carregarGravacoes();
  }

  function formatarTempo(s: number) {
    const m = Math.floor(s / 60);
    const seg = s % 60;
    return `${m}:${seg.toString().padStart(2, "0")}`;
  }

  if (carregandoRole) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!podeAcessar) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
        <span className="text-4xl">🔒</span>
        <p className="text-sm text-slate-500 font-medium">Você não tem acesso a essa área.</p>
      </div>
    );
  }

  if (!desbloqueado) {
    return (
      <div className="flex items-center justify-center py-20 px-4">
        <form onSubmit={confirmarSenha} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 w-full max-w-sm space-y-4">
          <div className="text-center space-y-1">
            <span className="text-3xl">🔒</span>
            <h1 className="text-base font-bold text-slate-800">Área restrita</h1>
            <p className="text-xs text-slate-400">Confirme sua senha pra continuar.</p>
          </div>
          <input type="password" required autoFocus placeholder="Sua senha" value={senha} onChange={(e) => setSenha(e.target.value)}
            className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {erroSenha && <p className="text-xs text-red-600 font-medium">{erroSenha}</p>}
          <button type="submit" disabled={verificando}
            className="w-full h-11 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold disabled:opacity-50 transition">
            {verificando ? "Verificando..." : "Confirmar"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Record</h1>
        <p className="text-xs text-slate-400 mt-0.5">Acesso restrito — ADM e Gestão. A gravação continua mesmo se você navegar pra outro menu.</p>
      </div>

      {(feedback || erro) && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
          ${feedback?.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          <span>{feedback?.tipo === "sucesso" ? "✓" : "✕"}</span>
          {feedback?.msg || erro}
          {erro && (
            <button onClick={limparErro} className="ml-auto text-xs underline opacity-70 hover:opacity-100">fechar</button>
          )}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
        {gravando && (
          <div className="flex items-center justify-center gap-2 py-6">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-semibold text-slate-600">{formatarTempo(segundos)}</span>
          </div>
        )}

        {!gravando && !videoBlob && (
          <button onClick={handleIniciar}
            className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition">
            Record
          </button>
        )}
        {gravando && (
          <button onClick={pararGravacao}
            className="w-full h-12 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold transition">
            Stop
          </button>
        )}

        {videoBlob && !gravando && (
          <div className="space-y-3">
            <video src={URL.createObjectURL(videoBlob)} controls className="w-full rounded-xl bg-black" />
            <input type="text" required placeholder="Descrição (ex: Reunião com Fulana — 01/08)" value={descricao} onChange={(e) => setDescricao(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex gap-2">
              <button onClick={() => { descartarGravacao(); setDescricao(""); }}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                Descartar
              </button>
              <button onClick={salvarGravacao} disabled={salvando || !descricao.trim()}
                className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 transition">
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700 text-sm">Gravações salvas</h2>
        </div>
        {carregandoLista ? (
          <div className="py-10 text-center text-sm text-slate-400">Carregando...</div>
        ) : gravacoes.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">Nenhuma gravação ainda.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {gravacoes.map((g) => (
              <li key={g.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{g.descricao}</p>
                  <p className="text-xs text-slate-400">{g.autor_nome || g.autor_email} · {new Date(g.created_at).toLocaleString("pt-BR")}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => assistir(g.storage_path)}
                    className="h-8 px-3 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100 transition">
                    Assistir
                  </button>
                  <button onClick={() => excluirGravacao(g.id, g.storage_path)}
                    className="h-8 px-3 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-100 transition">
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
