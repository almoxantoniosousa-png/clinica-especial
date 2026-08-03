"use client";

import { useState } from "react";
import { Paperclip, X, FileText, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

export type DocumentoAnexo = { nome: string; url: string };

// O Supabase Storage recusa certos caracteres na chave do arquivo (acento,
// espaço, símbolo) com erro "Invalid key" — sanitiza só o nome usado no
// armazenamento; o nome original (com acento) continua aparecendo pro
// usuário normalmente.
function sanitizarNomeArquivo(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

interface AnexoDocumentosProps {
  pastaId: string; // pasta única no bucket — geralmente o id do cadastro
  documentos: DocumentoAnexo[];
  onChange: (documentos: DocumentoAnexo[]) => void;
  disabled?: boolean;
}

// Upload/lista de documentos opcionais anexados a um cadastro (Acompanhante,
// Especialista, Colaboradora Interna ou Criança) — reaproveitado nas 4 telas.
export function AnexoDocumentos({ pastaId, documentos, onChange, disabled }: AnexoDocumentosProps) {
  const supabase = createSupabaseBrowserClient();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function handleArquivos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setEnviando(true);
    setErro("");
    const novos: DocumentoAnexo[] = [];
    for (const file of Array.from(files)) {
      const caminho = `${pastaId}/${Date.now()}-${sanitizarNomeArquivo(file.name)}`;
      const { error } = await supabase.storage.from("documentos-cadastro").upload(caminho, file);
      if (error) {
        setErro(`Falha ao enviar "${file.name}": ${error.message}`);
        continue;
      }
      const { data } = supabase.storage.from("documentos-cadastro").getPublicUrl(caminho);
      novos.push({ nome: file.name, url: data.publicUrl });
    }
    if (novos.length > 0) onChange([...documentos, ...novos]);
    setEnviando(false);
  }

  function remover(index: number) {
    onChange(documentos.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
        <Paperclip size={13} /> Documentos (opcional)
      </label>

      {documentos.length > 0 && (
        <ul className="space-y-1.5">
          {documentos.map((doc, i) => (
            <li key={`${doc.url}-${i}`} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <FileText size={14} className="text-blue-500 flex-shrink-0" />
              <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-blue-700 hover:underline">
                {doc.nome}
              </a>
              {!disabled && (
                <button type="button" onClick={() => remover(i)} className="p-0.5 rounded hover:bg-red-100 text-red-500 flex-shrink-0" title="Remover">
                  <X size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!disabled && (
        <label className={`flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-dashed text-sm font-semibold transition
          ${enviando ? "border-slate-200 text-slate-400 cursor-wait" : "border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 cursor-pointer"}`}>
          {enviando ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
          {enviando ? "Enviando..." : "Anexar arquivo"}
          <input type="file" multiple className="hidden" disabled={enviando}
            onChange={(e) => { handleArquivos(e.target.files); e.target.value = ""; }} />
        </label>
      )}
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
}
