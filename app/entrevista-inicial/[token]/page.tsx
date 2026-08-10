"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

const ETAPAS = [
  "Identificação",
  "Histórico Médico",
  "Escola e Comportamento",
  "Casa e Comunicação",
  "Habilidades",
  "Objetivos e Envio",
];

const FORM_VAZIO = {
  nome_crianca: "", idade: "", data_nascimento: "", local: "", nome_pais: "",
  endereco: "", telefone: "", email: "", como_soube: "", como_soube_outro: "",
  alergia: "", alergia_obs: "",
  tem_diagnostico: "", diagnostico: "", gestacao: "", gestacao_intercorrencia: "", parto: "", primeiros_meses: "", acompanhamento_atual: "",
  terapias_anteriores: "", terapias_anteriores_melhora: "", medicacoes_texto: "", tem_medicacao: "",
  queixa: "", relato_escola: "", aprendizado_academico: "", leitura: "",
  motora_fina: "", motora_ampla: "", atencao: "", habilidade_social: "",
  escola_nome: "", escola_telefone: "", escola_professora: "", escola_local: "",
  escola_obs: "", dias_semana_escola: "", horas_dia_escola: "",
  pessoas_casa: "", pais_separados: "", guarda: "", frequencia_outro_pai: "",
  capaz_brincar_fisicamente: "", capaz_atividades_dia_a_dia: "", usa_banheiro_sozinho: "",
  habilidade_comer: "", habilidades_seguranca: "",
  problemas_comportamento: "", duracao_comportamento: "", pontos_fortes: "", pontos_fracos: "",
  objetivos_aba: "", reforcadores: "", rotina_sono: "", disponibilidade_familia: "",
  consentimento_lgpd: false, consentimento_imagem: false, responsavel_preencheu: "",
};

const SERVICOS_OPCOES = [
  "Acompanhante Terapêutica", "Sala de Recursos", "Plano Comportamental",
  "Plano de Ensino Individualizado", "Fonoaudióloga", "Terapia Ocupacional", "Educador Físico",
];

export default function EntrevistaInicialPage() {
  const { token } = useParams<{ token: string }>();
  const supabase = createSupabaseBrowserClient();

  const [carregando, setCarregando] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [jaRespondido, setJaRespondido] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [nomePreenchido, setNomePreenchido] = useState("");
  const [etapa, setEtapa] = useState(0);
  const [form, setForm] = useState(FORM_VAZIO);
  const [servicos, setServicos] = useState<string[]>([]);
  const [queixaAreas, setQueixaAreas] = useState<string[]>([]);
  const [marcosDesenvolvimento, setMarcosDesenvolvimento] = useState<string[]>([]);

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase.from("entrevistas_iniciais").select("status, nome_crianca_preenchido").eq("token", token).maybeSingle();
      if (!data) { setNaoEncontrado(true); setCarregando(false); return; }
      setNomePreenchido(data.nome_crianca_preenchido || "");
      if (data.status !== "aguardando") setJaRespondido(true);
      setCarregando(false);
    }
    carregar();
  }, [token]);

  function set<K extends keyof typeof FORM_VAZIO>(campo: K, valor: (typeof FORM_VAZIO)[K]) {
    setForm(f => ({ ...f, [campo]: valor }));
  }

  function toggleServico(s: string) {
    setServicos(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  function toggleQueixaArea(s: string) {
    setQueixaAreas(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  function toggleMarco(s: string) {
    setMarcosDesenvolvimento(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  function avancar() {
    if (etapa === 0 && (!form.nome_crianca.trim() || !form.telefone.trim())) {
      setErro("Preencha ao menos o nome da criança e um telefone de contato.");
      return;
    }
    setErro("");
    setEtapa(e => Math.min(ETAPAS.length - 1, e + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function voltar() {
    setEtapa(e => Math.max(0, e - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function enviar() {
    if (!form.consentimento_lgpd) {
      setErro("Precisamos do seu consentimento (LGPD) pra poder registrar essas informações.");
      return;
    }
    if (!form.responsavel_preencheu.trim()) {
      setErro("Informe seu nome (quem está respondendo).");
      return;
    }
    setErro("");
    setEnviando(true);
    const { error } = await supabase.from("entrevistas_iniciais")
      .update({
        ...form,
        queixa: queixaAreas.join(", "),
        primeiros_meses: marcosDesenvolvimento.join(", "),
        data_nascimento: form.data_nascimento || null, // "" quebra coluna date
        servicos_recebidos: servicos,
        status: "respondido",
        respondido_em: new Date().toISOString(),
      })
      .eq("token", token);
    setEnviando(false);
    if (error) { setErro("Não conseguimos salvar: " + error.message); return; }
    setEnviado(true);
  }

  const inputClass = "w-full h-12 px-4 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:text-slate-400";
  const taClass = "w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:text-slate-400 resize-none";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide";
  const botaoOpcao = (ativo: boolean) =>
    `px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition ${ativo ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-600"}`;

  // Pergunta sim/não — usada em quase todo o formulário pra manter rápido e
  // objetivo pros pais responderem; a Simone explora cada item com calma
  // durante a entrevista presencial.
  function CampoSimNao({ label, campo, sub }: { label: string; campo: keyof typeof FORM_VAZIO; sub?: React.ReactNode }) {
    const valor = form[campo];
    return (
      <div className="space-y-2">
        <label className={labelClass}>{label}</label>
        <div className="grid grid-cols-2 gap-2">
          {["sim", "nao"].map(op => (
            <button key={op} type="button" onClick={() => set(campo, op as never)} className={botaoOpcao(valor === op)}>
              {op === "sim" ? "Sim" : "Não"}
            </button>
          ))}
        </div>
        {sub && valor === "sim" && sub}
      </div>
    );
  }

  // Pergunta de múltipla escolha (uma opção só)
  function CampoOpcoes({ label, campo, opcoes }: { label: string; campo: keyof typeof FORM_VAZIO; opcoes: string[] }) {
    return (
      <div className="space-y-2">
        <label className={labelClass}>{label}</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {opcoes.map(op => (
            <button key={op} type="button" onClick={() => set(campo, op as never)} className={botaoOpcao(form[campo] === op)}>
              {op}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (carregando) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Carregando...</div>;
  }

  if (naoEncontrado) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5 bg-slate-50">
        <div className="max-w-sm text-center space-y-2">
          <span className="text-5xl">🔗</span>
          <p className="font-bold text-slate-700">Link não encontrado</p>
          <p className="text-sm text-slate-500">Confira se o link foi copiado certinho, ou peça um novo pra Clínica Abraço.</p>
        </div>
      </div>
    );
  }

  if (jaRespondido || enviado) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5 bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800">
        <div className="max-w-sm w-full bg-white rounded-3xl shadow-2xl p-8 text-center space-y-3">
          <span className="text-5xl">💙</span>
          <h1 className="font-black text-lg text-slate-800">Recebemos, obrigado!</h1>
          <p className="text-sm text-slate-500">
            {enviado
              ? "Sua entrevista foi enviada com sucesso. A equipe da Clínica Abraço vai analisar e entrar em contato."
              : "Essa entrevista já foi respondida anteriormente. Qualquer dúvida, entre em contato com a clínica."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* CABEÇALHO */}
      <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 px-5 pt-8 pb-6">
        <div className="max-w-xl mx-auto">
          <h1 className="text-white font-black text-lg">Entrevista Inicial</h1>
          <p className="text-blue-300 text-xs mt-0.5">Clínica Abraço — ABA, Intervenção Comportamental</p>
          {nomePreenchido && <p className="text-blue-200 text-sm mt-3">Sobre: <span className="font-semibold">{nomePreenchido}</span></p>}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-5 -mt-3">
        {/* PROGRESSO */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 text-sm">{ETAPAS[etapa]}</span>
            <span className="text-xs font-bold text-slate-400">Passo {etapa + 1} de {ETAPAS.length}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${((etapa + 1) / ETAPAS.length) * 100}%` }} />
          </div>
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4">{erro}</div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-5">

          {etapa === 0 && (
            <>
              <p className="text-xs text-slate-400">Conte um pouco sobre a criança e como podemos entrar em contato.</p>
              <div className="space-y-2">
                <label className={labelClass}>Nome da criança *</label>
                <input className={inputClass} value={form.nome_crianca} onChange={e => set("nome_crianca", e.target.value)} placeholder="Nome completo" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className={labelClass}>Idade</label>
                  <input className={inputClass} value={form.idade} onChange={e => set("idade", e.target.value)} placeholder="Ex: 6 anos" />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Data de nascimento</label>
                  <input type="date" className={inputClass} value={form.data_nascimento} onChange={e => set("data_nascimento", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Nome do(s) responsável(is)</label>
                <input className={inputClass} value={form.nome_pais} onChange={e => set("nome_pais", e.target.value)} placeholder="Pais / responsáveis" />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Endereço</label>
                <input className={inputClass} value={form.endereco} onChange={e => set("endereco", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className={labelClass}>Telefone *</label>
                  <input className={inputClass} value={form.telefone} onChange={e => set("telefone", e.target.value)} placeholder="(71) 9...." />
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>E-mail</label>
                  <input type="email" className={inputClass} value={form.email} onChange={e => set("email", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Como ficou sabendo da clínica?</label>
                <select className={inputClass + " bg-white"} value={form.como_soube} onChange={e => set("como_soube", e.target.value)}>
                  <option value="">Selecione...</option>
                  <option value="indicacao">Indicação de clientes</option>
                  <option value="redes_sociais">Redes sociais</option>
                  <option value="cursos_palestras">Cursos, palestras</option>
                  <option value="outros">Outros</option>
                </select>
                {form.como_soube === "outros" && (
                  <input className={inputClass} value={form.como_soube_outro} onChange={e => set("como_soube_outro", e.target.value)} placeholder="Qual?" />
                )}
              </div>
              <div className="space-y-2">
                <label className={labelClass}>A criança é alérgica a algo?</label>
                <div className="grid grid-cols-3 gap-2">
                  {["sim", "nao", "nao_ha_relato"].map(op => (
                    <button key={op} type="button" onClick={() => set("alergia", op)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition ${form.alergia === op ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-600"}`}>
                      {op === "sim" ? "Sim" : op === "nao" ? "Não" : "Não há relato"}
                    </button>
                  ))}
                </div>
                {form.alergia === "sim" && (
                  <input className={inputClass} value={form.alergia_obs} onChange={e => set("alergia_obs", e.target.value)} placeholder="A quê?" />
                )}
              </div>
            </>
          )}

          {etapa === 1 && (
            <>
              <p className="text-xs text-slate-400">Histórico de saúde e desenvolvimento da criança. Marque as opções — a equipe aprofunda cada item na entrevista.</p>

              <CampoSimNao label="Já tem diagnóstico?" campo="tem_diagnostico" sub={
                <input className={inputClass + " mt-2"} value={form.diagnostico} onChange={e => set("diagnostico", e.target.value)} placeholder="Qual?" />
              } />

              <CampoSimNao label="A gestação foi planejada?" campo="gestacao" />
              <CampoSimNao label="Teve algum risco ou intercorrência na gestação?" campo="gestacao_intercorrencia" />

              <CampoOpcoes label="Tipo de parto" campo="parto" opcoes={["Normal", "Cesárea", "Fórceps ou outro"]} />

              <div className="space-y-2">
                <label className={labelClass}>Nos primeiros 12 meses, aconteceu no tempo esperado:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {["Sentou", "Engatinhou", "Andou", "Balbuciou", "Falou as primeiras palavras"].map(m => (
                    <button key={m} type="button" onClick={() => toggleMarco(m)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition text-left ${marcosDesenvolvimento.includes(m) ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-600"}`}>
                      {marcosDesenvolvimento.includes(m) ? "✓ " : ""}{m}
                    </button>
                  ))}
                </div>
              </div>

              <CampoSimNao label="Tem acompanhamento médico atualmente?" campo="acompanhamento_atual" />
              <CampoSimNao label="Já fez terapia antes?" campo="terapias_anteriores" />
              {form.terapias_anteriores === "sim" && (
                <CampoOpcoes label="Sentiu melhora?" campo="terapias_anteriores_melhora" opcoes={["Sim", "Não", "Não sei"]} />
              )}

              <CampoSimNao label="Toma alguma medicação?" campo="tem_medicacao" sub={
                <input className={inputClass + " mt-2"} value={form.medicacoes_texto} onChange={e => set("medicacoes_texto", e.target.value)} placeholder="Qual(is)?" />
              } />
            </>
          )}

          {etapa === 2 && (
            <>
              <p className="text-xs text-slate-400">Sobre a rotina escolar e comportamentos observados.</p>
              <div className="space-y-2">
                <label className={labelClass}>Qual a área da queixa principal? (marque quantas quiser)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {["Comunicação", "Comportamento", "Atenção/Concentração", "Interação social", "Aprendizado/Escola", "Rotina/Autonomia", "Outro"].map(op => (
                    <button key={op} type="button" onClick={() => toggleQueixaArea(op)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition text-left ${queixaAreas.includes(op) ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-600"}`}>
                      {queixaAreas.includes(op) ? "✓ " : ""}{op}
                    </button>
                  ))}
                </div>
              </div>

              <CampoSimNao label="Apresenta comportamento-problema na escola?" campo="relato_escola" />
              <CampoSimNao label="Tem dificuldade de aprendizado acadêmico?" campo="aprendizado_academico" />
              <CampoSimNao label="Tem dificuldade em leitura, escrita ou matemática?" campo="leitura" />
              <CampoSimNao label="Tem dificuldade de coordenação motora fina (segurar lápis, abotoar)?" campo="motora_fina" />
              <CampoSimNao label="Tem dificuldade de coordenação motora ampla (correr, pular, escalar)?" campo="motora_ampla" />
              <CampoSimNao label="Tem dificuldade de atenção/concentração?" campo="atencao" />
              <CampoSimNao label="Brinca com pares durante o recreio?" campo="habilidade_social" />
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <p className="text-xs font-bold text-slate-600 uppercase">Dados da escola</p>
                <div className="grid grid-cols-2 gap-3">
                  <input className={inputClass} placeholder="Nome da escola" value={form.escola_nome} onChange={e => set("escola_nome", e.target.value)} />
                  <input className={inputClass} placeholder="Telefone da escola" value={form.escola_telefone} onChange={e => set("escola_telefone", e.target.value)} />
                </div>
                <input className={inputClass} placeholder="Nome da professora" value={form.escola_professora} onChange={e => set("escola_professora", e.target.value)} />
                <select className={inputClass + " bg-white"} value={form.escola_local} onChange={e => set("escola_local", e.target.value)}>
                  <option value="">Escola regular ou especial?</option>
                  <option value="regular">Escola Regular</option>
                  <option value="especial">Educação Especial</option>
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <input className={inputClass} placeholder="Dias por semana" value={form.dias_semana_escola} onChange={e => set("dias_semana_escola", e.target.value)} />
                  <input className={inputClass} placeholder="Horas por dia" value={form.horas_dia_escola} onChange={e => set("horas_dia_escola", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <label className={labelClass}>A criança já recebe algum desses serviços?</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SERVICOS_OPCOES.map(op => (
                    <button key={op} type="button" onClick={() => toggleServico(op)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition text-left ${servicos.includes(op) ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-600"}`}>
                      {servicos.includes(op) ? "✓ " : ""}{op}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {etapa === 3 && (
            <>
              <p className="text-xs text-slate-400">Sobre a casa, a família e como a criança se comunica.</p>
              <div className="space-y-2">
                <label className={labelClass}>Quem mora com a criança? (nome, parentesco, idade)</label>
                <textarea rows={2} className={taClass} value={form.pessoas_casa} onChange={e => set("pessoas_casa", e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Os pais são separados?</label>
                <div className="grid grid-cols-2 gap-2">
                  {["sim", "nao"].map(op => (
                    <button key={op} type="button" onClick={() => set("pais_separados", op)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition ${form.pais_separados === op ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-600"}`}>
                      {op === "sim" ? "Sim" : "Não"}
                    </button>
                  ))}
                </div>
                {form.pais_separados === "sim" && (
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inputClass} placeholder="Quem tem a guarda?" value={form.guarda} onChange={e => set("guarda", e.target.value)} />
                    <input className={inputClass} placeholder="Frequência que o outro vê" value={form.frequencia_outro_pai} onChange={e => set("frequencia_outro_pai", e.target.value)} />
                  </div>
                )}
              </div>
            </>
          )}

          {etapa === 4 && (
            <>
              <p className="text-xs text-slate-400">Habilidades do dia a dia e comportamentos que precisam de atenção.</p>
              <CampoSimNao label="Consegue brincar fisicamente (correr, escalar, amarrar sapato)?" campo="capaz_brincar_fisicamente" />
              <CampoSimNao label="Consegue fazer atividades do dia a dia sozinha (vestir-se, tomar banho)?" campo="capaz_atividades_dia_a_dia" />
              <CampoSimNao label="Usa o banheiro sozinha?" campo="usa_banheiro_sozinho" />
              <CampoOpcoes label="Habilidade de comer" campo="habilidade_comer" opcoes={["Come sozinha", "Precisa de ajuda parcial", "Precisa de ajuda total"]} />
              <CampoSimNao label="Tem noção de segurança (rua, estranhos, cozinha)?" campo="habilidades_seguranca" />
              <CampoSimNao label="Tem problemas de comportamento (agressão, destruir objetos, seletividade alimentar)?" campo="problemas_comportamento" />
              <div className="space-y-2">
                <label className={labelClass}>Pontos fortes da criança (2-3 palavras)</label>
                <input className={inputClass} value={form.pontos_fortes} onChange={e => set("pontos_fortes", e.target.value)} placeholder="Ex: carinhosa, curiosa, persistente" />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Pontos fracos da criança (2-3 palavras)</label>
                <input className={inputClass} value={form.pontos_fracos} onChange={e => set("pontos_fracos", e.target.value)} placeholder="Ex: teimosia, baixa tolerância à frustração" />
              </div>
            </>
          )}

          {etapa === 5 && (
            <>
              <p className="text-xs text-slate-400">Últimas informações antes de enviar.</p>
              <div className="space-y-2">
                <label className={labelClass}>O que você gostaria que ela aprendesse ou mudasse com a Terapia ABA?</label>
                <textarea rows={3} className={taClass} value={form.objetivos_aba} onChange={e => set("objetivos_aba", e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Do que ela mais gosta? (comida, brinquedo, atividade, música, tela)</label>
                <textarea rows={2} className={taClass} value={form.reforcadores} onChange={e => set("reforcadores", e.target.value)} placeholder="Isso nos ajuda a motivar ela desde o primeiro dia" />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Como é a rotina de sono?</label>
                <textarea rows={2} className={taClass} value={form.rotina_sono} onChange={e => set("rotina_sono", e.target.value)} placeholder="Horário de dormir/acordar, qualidade do sono" />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Quais dias/horários a família tem disponível pra atendimento?</label>
                <textarea rows={2} className={taClass} value={form.disponibilidade_familia} onChange={e => set("disponibilidade_familia", e.target.value)} />
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.consentimento_lgpd} onChange={e => set("consentimento_lgpd", e.target.checked)} className="w-5 h-5 mt-0.5 accent-blue-600" />
                  <span className="text-sm text-slate-700">Autorizo a Clínica Abraço a registrar essas informações pra fins de avaliação e tratamento, conforme a LGPD. *</span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.consentimento_imagem} onChange={e => set("consentimento_imagem", e.target.checked)} className="w-5 h-5 mt-0.5 accent-blue-600" />
                  <span className="text-sm text-slate-700">Autorizo o uso de imagem/vídeo da criança durante o atendimento, exclusivamente para fins terapêuticos.</span>
                </label>
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Seu nome (responsável que está preenchendo) *</label>
                <input className={inputClass} value={form.responsavel_preencheu} onChange={e => set("responsavel_preencheu", e.target.value)} />
              </div>
            </>
          )}

        </div>

        <div className="flex gap-3 mt-4">
          {etapa > 0 && (
            <button onClick={voltar} className="flex-1 h-12 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
              ← Voltar
            </button>
          )}
          {etapa < ETAPAS.length - 1 ? (
            <button onClick={avancar} className="flex-grow h-12 bg-blue-900 hover:bg-blue-800 text-white font-semibold text-sm rounded-xl transition">
              Continuar →
            </button>
          ) : (
            <button onClick={enviar} disabled={enviando} className="flex-grow h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition disabled:opacity-50">
              {enviando ? "Enviando..." : "✓ Enviar Entrevista"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
