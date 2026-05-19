"use client";

import { useState, useEffect, useTransition } from "react";
import { supabase } from "@/lib/supabaseClient";
import { createCrianca } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdmCriancasPage() {
  const [criancas, setCriancas] = useState<any[]>([]);
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  async function carregarCriancas() {
    setLoading(true);

    const { data, error } = await supabase
      .from("criancas")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      alert("Erro ao carregar: " + error.message);
      console.error(error);
    }
    if (data) setCriancas(data);

    setLoading(false);
  }

  useEffect(() => {
    carregarCriancas();
  }, []);

  function salvarCrianca(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;

    startTransition(async () => {
      const res = await createCrianca({ nome });

      if (res?.error) {
        alert("Erro ao cadastrar: " + res.error);
        console.error(res.error);
        return;
      }

      setNome("");
      carregarCriancas();
      alert("Criança cadastrada com sucesso!");
    });
  }

  async function excluirCrianca(id: string) {
    const { error } = await supabase.from("criancas").delete().eq("id", id);
    if (error) {
      alert("Erro ao excluir: " + error.message);
      console.error(error);
    } else {
      carregarCriancas();
      alert("Criança removida da lista.");
    }
  }

  async function editarCrianca(id: string) {
    const novoNome = prompt("Digite o novo nome:");
    if (!novoNome) return;

    const { error } = await supabase
      .from("criancas")
      .update({ nome: novoNome })
      .eq("id", id);

    if (error) {
      alert("Erro ao editar: " + error.message);
      console.error(error);
    } else {
      carregarCriancas();
      alert("Nome da criança atualizado com sucesso!");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6 md:p-10 space-y-10">

      {/* HEADER */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-blue-900 tracking-tight">
          Gestão de Crianças
        </h1>
        <p className="text-slate-500 text-sm">
          Cadastre e gerencie os nomes utilizados no atendimento e faturamento.
        </p>
      </div>

      {/* CARD FORM */}
      <div className="max-w-xl bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            Nova Criança
          </h2>
          <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
            Cadastro rápido
          </span>
        </div>

        <form onSubmit={salvarCrianca} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-700 font-medium">
              Nome completo
            </Label>
            <Input
              placeholder="Ex: Maria Eduarda Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="h-11 rounded-xl border-slate-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-11 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-semibold transition-all shadow-sm"
          >
            {isPending ? "Salvando..." : "Cadastrar criança"}
          </Button>
        </form>
      </div>

      {/* LISTA */}
      <div className="max-w-xl bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b bg-slate-50">
          <h3 className="font-semibold text-slate-700">
            Crianças cadastradas
          </h3>
        </div>

        <div className="divide-y">
          {loading ? (
            <div className="p-6 text-sm text-slate-400">Carregando...</div>
          ) : criancas.length === 0 ? (
            <div className="p-6 text-sm text-slate-400">
              Nenhuma criança cadastrada.
            </div>
          ) : (
            criancas.map((c) => (
              <div
                key={c.id}
                className="px-6 py-3 flex justify-between items-center hover:bg-slate-50"
              >
                {/* Avatar com iniciais */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold">
                    {c.nome.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-slate-800">{c.nome}</span>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => editarCrianca(c.id)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="text-xs"
                    onClick={() => excluirCrianca(c.id)}
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
