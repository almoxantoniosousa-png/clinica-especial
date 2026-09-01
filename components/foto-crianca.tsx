"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

// Só o marcador do bucket fotos-criancas: URLs de outros buckets (ex:
// materiais-adaptados, quando o mural usa upload próprio em vez da foto da
// criança) passam direto, sem tentar assinar.
const MARCADOR_BUCKET = "/object/public/fotos-criancas/";

async function resolverUrlFoto(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  url: string | null | undefined
): Promise<string | null> {
  if (!url) return null;
  const idx = url.indexOf(MARCADOR_BUCKET);
  if (idx === -1) return url;
  const path = url.slice(idx + MARCADOR_BUCKET.length);
  const { data, error } = await supabase.storage.from("fotos-criancas").createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return url;
  return data.signedUrl;
}

interface FotoCriancaProps {
  url: string | null | undefined;
  alt: string;
  className?: string;
}

// Wrapper de <img> pra foto de criança: resolve a URL pública guardada no
// banco pra uma URL assinada e temporária na hora de exibir, em vez de usar
// a URL fixa direto. Enquanto o bucket fotos-criancas ainda for público,
// isso não muda nada visualmente (cai no fallback da própria URL); quando o
// bucket virar privado, continua funcionando sem precisar tocar em cada tela de novo.
export function FotoCrianca({ url, alt, className }: FotoCriancaProps) {
  const [src, setSrc] = useState<string | null>(url ?? null);

  useEffect(() => {
    let ativo = true;
    const supabase = createSupabaseBrowserClient();
    resolverUrlFoto(supabase, url).then(resolvido => {
      if (ativo) setSrc(resolvido);
    });
    return () => { ativo = false; };
  }, [url]);

  if (!src) return null;
  return <img src={src} alt={alt} className={className} />;
}
