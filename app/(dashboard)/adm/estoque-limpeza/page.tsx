"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Droplets, Plus, History, PackagePlus, Pencil, ArrowUp, ArrowDown } from "lucide-react";

type Material = {
  id: string;
  nome: string;
  unidade: string;
  quantidade_atual: number;
  quantidade_minima: number | null;
  foto_url: string | null;
};

type Movimentacao = {
  id: string;
  material_id: string;
  tipo: "entrada" | "saida";
  quantidade: number;
  responsavel_nome: string;
  observacao: string | null;
  created_at: string;
  valor_unitario: number | null;
};

// Alguns links do Google Imagens bloqueiam o carregamento fora do site de
// origem ("hotlink") -- em vez de deixar o icone de imagem quebrada
// aparecer, cai pro icone padrao assim que o navegador acusa a falha.
function FotoProduto({ url, nome, tamanhoIcone = 28 }: { url: string | null; nome: string; tamanhoIcone?: number }) {
  const [erro, setErro] = useState(false);
  if (!url || erro) return <Droplets size={tamanhoIcone} className="text-stone-400" />;
  return <img src={url} alt={nome} className="w-full h-full object-cover" onError={() => setErro(true)} />;
}

export default function EstoqueLimpezaPage() {
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [precosPorMaterial, setPrecosPorMaterial] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [lancando, setLancando] = useState<Material | null>(null);
  const [quantidade, setQuantidade] = useState("1");
  const [valorPago, setValorPago] = useState("");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [historicoAberto, setHistoricoAberto] = useState(false);

  const [produtoModalAberto, setProdutoModalAberto] = useState(false);
  const [produtoEditId, setProdutoEditId] = useState<string | null>(null);
  const [pNome, setPNome] = useState("");
  const [pUnidade, setPUnidade] = useState("un");
  const [pQtdMinima, setPQtdMinima] = useState("");
  const [pFotoAtual, setPFotoAtual] = useState<string | null>(null);
  const [pFotoFile, setPFotoFile] = useState<File | null>(null);
  const [pFotoUrl, setPFotoUrl] = useState("");
  const [salvandoProduto, setSalvandoProduto] = useState(false);
  const [editandoValorMov, setEditandoValorMov] = useState<Movimentacao | null>(null);
  const [novoValorMov, setNovoValorMov] = useState("");
  const [salvandoValorMov, setSalvandoValorMov] = useState(false);

  async function carregar() {
    setLoading(true);
    const [{ data: mats }, { data: movs }, { data: precos }] = await Promise.all([
      supabase.from("materiais_limpeza").select("id, nome, unidade, quantidade_atual, quantidade_minima, foto_url").eq("ativo", true).order("nome"),
      supabase.from("materiais_limpeza_movimentacoes").select("id, material_id, tipo, quantidade, responsavel_nome, observacao, created_at, valor_unitario").order("created_at", { ascending: false }).limit(50),
      supabase.from("materiais_limpeza_movimentacoes").select("material_id, valor_unitario, created_at").eq("tipo", "entrada").not("valor_unitario", "is", null).order("created_at", { ascending: false }),
    ]);
    setMateriais(mats || []);
    setMovimentacoes(movs || []);

    const porMaterial: Record<string, number[]> = {};
    (precos || []).forEach((p: any) => {
      if (!porMaterial[p.material_id]) porMaterial[p.material_id] = [];
      if (porMaterial[p.material_id].length < 2) porMaterial[p.material_id].push(Number(p.valor_unitario));
    });
    setPrecosPorMaterial(porMaterial);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  function abrirEntrada(m: Material) {
    setLancando(m);
    setQuantidade("1");
    setValorPago("");
    setObservacao("");
  }

  async function confirmarEntrada() {
    if (!lancando) return;
    const qtd = Number(quantidade);
    if (!qtd || qtd <= 0) {
      setMsg({ tipo: "erro", texto: "Informe uma quantidade válida." });
      return;
    }
    setSalvando(true);
    const { error } = await supabase.rpc("registrar_movimentacao_material", {
      p_material_id: lancando.id,
      p_tipo: "entrada",
      p_quantidade: qtd,
      p_observacao: observacao.trim() || null,
      p_valor_unitario: valorPago ? Number(valorPago) : null,
    });
    setSalvando(false);
    if (error) {
      setMsg({ tipo: "erro", texto: "Erro ao registrar: " + error.message });
      return;
    }
    setMsg({ tipo: "sucesso", texto: `Entrada de ${lancando.nome} registrada.` });
    setLancando(null);
    carregar();
    setTimeout(() => setMsg(null), 4000);
  }

  function nomeDoMaterial(id: string) {
    return materiais.find((m) => m.id === id)?.nome || "—";
  }

  function abrirEdicaoValor(mv: Movimentacao) {
    setEditandoValorMov(mv);
    setNovoValorMov(mv.valor_unitario != null ? String(mv.valor_unitario) : "");
  }

  async function confirmarNovoValor() {
    if (!editandoValorMov) return;
    const valor = novoValorMov ? Number(novoValorMov) : null;
    setSalvandoValorMov(true);
    const { error } = await supabase.from("materiais_limpeza_movimentacoes").update({ valor_unitario: valor }).eq("id", editandoValorMov.id);
    setSalvandoValorMov(false);
    if (error) {
      setMsg({ tipo: "erro", texto: "Erro ao corrigir: " + error.message });
      return;
    }
    setMsg({ tipo: "sucesso", texto: "Valor corrigido." });
    setEditandoValorMov(null);
    carregar();
    setTimeout(() => setMsg(null), 4000);
  }

  function abrirNovoProduto() {
    setProdutoEditId(null);
    setPNome("");
    setPUnidade("un");
    setPQtdMinima("");
    setPFotoAtual(null);
    setPFotoFile(null);
    setPFotoUrl("");
    setProdutoModalAberto(true);
  }

  function abrirEditarProduto(m: Material) {
    setProdutoEditId(m.id);
    setPNome(m.nome);
    setPUnidade(m.unidade);
    setPQtdMinima(m.quantidade_minima != null ? String(m.quantidade_minima) : "");
    setPFotoAtual(m.foto_url);
    setPFotoFile(null);
    setPFotoUrl("");
    setProdutoModalAberto(true);
  }

  async function uploadFotoProduto(file: File, materialId: string): Promise<string | null> {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${materialId}/foto.${ext}`;
    const { error } = await supabase.storage.from("materiais-limpeza-fotos").upload(path, file, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from("materiais-limpeza-fotos").getPublicUrl(path);
    return `${data.publicUrl}?t=${Date.now()}`;
  }

  async function confirmarProduto() {
    if (!pNome.trim()) {
      setMsg({ tipo: "erro", texto: "Informe o nome do produto." });
      return;
    }
    setSalvandoProduto(true);

    const payload: any = {
      nome: pNome.trim(),
      unidade: pUnidade.trim() || "un",
      quantidade_minima: pQtdMinima ? Number(pQtdMinima) : null,
    };
    // Link colado (ex: copiado do Google Imagens) tem prioridade sobre arquivo
    // se os dois forem preenchidos por engano.
    if (pFotoUrl.trim() && !pFotoFile) payload.foto_url = pFotoUrl.trim();

    let materialId = produtoEditId;
    let erro: string | null = null;

    if (materialId) {
      const { error } = await supabase.from("materiais_limpeza").update(payload).eq("id", materialId);
      erro = error?.message || null;
    } else {
      const { data, error } = await supabase.from("materiais_limpeza").insert(payload).select("id").single();
      erro = error?.message || null;
      materialId = data?.id || null;
    }

    if (!erro && materialId && pFotoFile) {
      const url = await uploadFotoProduto(pFotoFile, materialId);
      if (url) {
        await supabase.from("materiais_limpeza").update({ foto_url: url }).eq("id", materialId);
      }
    }

    setSalvandoProduto(false);
    if (erro) {
      setMsg({ tipo: "erro", texto: "Erro ao salvar: " + erro });
      return;
    }
    setMsg({ tipo: "sucesso", texto: `${pNome.trim()} ${produtoEditId ? "atualizado" : "cadastrado"}.` });
    setProdutoModalAberto(false);
    carregar();
    setTimeout(() => setMsg(null), 4000);
  }

  return (
    <div className="min-h-screen bg-transparent px-4 py-6 md:px-8 md:py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Estoque de Materiais de Limpeza</h1>
          <p className="text-xs text-slate-400 mt-0.5">Acompanhe o estoque, os preços e registre entradas de compra</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={abrirNovoProduto}
            className="h-9 px-3 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold transition flex items-center gap-1.5">
            <PackagePlus size={14} /> Novo produto
          </button>
          <button onClick={() => setHistoricoAberto((v) => !v)}
            className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition flex items-center gap-1.5">
            <History size={14} /> {historicoAberto ? "Ver estoque" : "Ver histórico"}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
          ${msg.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          <span>{msg.tipo === "sucesso" ? "✓" : "✕"}</span>
          {msg.texto}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : historicoAberto ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="divide-y divide-slate-100">
            {movimentacoes.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">Nenhuma movimentação ainda.</p>
            ) : (
              movimentacoes.map((mv) => (
                <div key={mv.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-700">
                      {nomeDoMaterial(mv.material_id)}
                      {mv.valor_unitario != null && <span className="text-slate-400 font-normal"> · R$ {Number(mv.valor_unitario).toFixed(2)}/un</span>}
                      {mv.observacao && <span className="text-slate-400 font-normal"> — {mv.observacao}</span>}
                    </p>
                    <p className="text-xs text-slate-400">{mv.responsavel_nome} · {new Date(mv.created_at).toLocaleString("pt-BR")}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-sm font-bold ${mv.tipo === "entrada" ? "text-emerald-600" : "text-red-500"}`}>
                      {mv.tipo === "entrada" ? "+" : "−"}{mv.quantidade}
                    </span>
                    {mv.tipo === "entrada" && (
                      <button onClick={() => abrirEdicaoValor(mv)} title="Corrigir valor"
                        className="w-6 h-6 rounded-lg hover:bg-slate-100 flex items-center justify-center transition">
                        <Pencil size={11} className="text-slate-400" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {materiais.map((m) => {
            const baixo = m.quantidade_minima != null && m.quantidade_atual <= m.quantidade_minima;
            const precos = precosPorMaterial[m.id] || [];
            const [precoAtual, precoAnterior] = precos;
            const subiu = precoAtual != null && precoAnterior != null && precoAtual > precoAnterior;
            const desceu = precoAtual != null && precoAnterior != null && precoAtual < precoAnterior;
            return (
              <div key={m.id} className="bg-stone-100 border border-stone-300 rounded-2xl overflow-hidden flex flex-col">
                <div className="relative aspect-square bg-stone-200 flex items-center justify-center">
                  <FotoProduto url={m.foto_url} nome={m.nome} />
                  <button onClick={() => abrirEditarProduto(m)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-white/90 hover:bg-white flex items-center justify-center shadow-sm transition">
                    <Pencil size={11} className="text-slate-600" />
                  </button>
                </div>
                <div className="p-2.5 flex flex-col gap-1.5 flex-1">
                  <p className="font-medium text-xs text-slate-700 leading-snug line-clamp-2">{m.nome}</p>
                  <p className={`text-xs ${baixo ? "text-red-500 font-semibold" : "text-slate-400"}`}>
                    {m.quantidade_atual} {m.unidade}{baixo ? " · baixo" : ""}
                  </p>
                  {precoAtual != null ? (
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-slate-800">R$ {precoAtual.toFixed(2)}</span>
                      {subiu && <ArrowUp size={13} className="text-red-500" />}
                      {desceu && <ArrowDown size={13} className="text-emerald-600" />}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-300">sem preço ainda</span>
                  )}
                  <button
                    onClick={() => abrirEntrada(m)}
                    className="mt-auto h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition active:scale-95 flex items-center justify-center gap-1">
                    <Plus size={11} /> Entrada
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lancando && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={(e) => { if (e.target === e.currentTarget) setLancando(null); }}>
          <div className="w-full sm:max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Registrar entrada — {lancando.nome}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Tem {lancando.quantidade_atual} {lancando.unidade} no estoque</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase">Quantidade comprada ({lancando.unidade})</label>
              <input type="number" min="1" step="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase">Valor pago (por {lancando.unidade}, opcional)</label>
              <input type="number" min="0" step="0.01" value={valorPago} onChange={(e) => setValorPago(e.target.value)} placeholder="Ex: 5,90"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase">Observação (opcional)</label>
              <input type="text" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex: compra do mercado X"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setLancando(null)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={confirmarEntrada} disabled={salvando}
                className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition disabled:opacity-50">
                {salvando ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {produtoModalAberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={(e) => { if (e.target === e.currentTarget) setProdutoModalAberto(false); }}>
          <div className="w-full sm:max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="font-bold text-slate-800 text-base">{produtoEditId ? "Editar produto" : "Novo produto"}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{produtoEditId ? "Atualize os dados ou a foto do produto" : "Cadastra um item novo no estoque, começando com 0"}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-stone-100 border border-stone-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                <FotoProduto
                  key={pFotoFile ? pFotoFile.name : pFotoUrl.trim() || pFotoAtual || "vazio"}
                  url={pFotoFile ? URL.createObjectURL(pFotoFile) : pFotoUrl.trim() || pFotoAtual}
                  nome={pNome || "produto"}
                  tamanhoIcone={22}
                />
              </div>
              <label className="flex-1 h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition flex items-center justify-center cursor-pointer">
                Escolher foto
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { setPFotoFile(e.target.files?.[0] || null); setPFotoUrl(""); }} />
              </label>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase">Ou cole o link de uma imagem</label>
              <input type="text" value={pFotoUrl} onChange={(e) => { setPFotoUrl(e.target.value); setPFotoFile(null); }} placeholder="Ex: link copiado do Google Imagens"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase">Nome</label>
              <input type="text" value={pNome} onChange={(e) => setPNome(e.target.value)} placeholder="Ex: Álcool em gel"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase">Unidade</label>
              <input type="text" value={pUnidade} onChange={(e) => setPUnidade(e.target.value)} placeholder="un, pacote, rolo, litro..."
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase">Estoque mínimo (opcional)</label>
              <input type="number" min="0" step="1" value={pQtdMinima} onChange={(e) => setPQtdMinima(e.target.value)} placeholder="Avisa quando chegar nesse número"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setProdutoModalAberto(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={confirmarProduto} disabled={salvandoProduto}
                className="flex-1 h-11 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold transition disabled:opacity-50">
                {salvandoProduto ? "Salvando..." : produtoEditId ? "Salvar" : "Cadastrar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editandoValorMov && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={(e) => { if (e.target === e.currentTarget) setEditandoValorMov(null); }}>
          <div className="w-full sm:max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Corrigir valor</h3>
              <p className="text-xs text-slate-400 mt-0.5">{nomeDoMaterial(editandoValorMov.material_id)} — entrada de {editandoValorMov.quantidade} em {new Date(editandoValorMov.created_at).toLocaleDateString("pt-BR")}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase">Valor pago (por unidade)</label>
              <input type="number" min="0" step="0.01" value={novoValorMov} onChange={(e) => setNovoValorMov(e.target.value)} placeholder="Ex: 5,90"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditandoValorMov(null)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={confirmarNovoValor} disabled={salvandoValorMov}
                className="flex-1 h-11 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold transition disabled:opacity-50">
                {salvandoValorMov ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
