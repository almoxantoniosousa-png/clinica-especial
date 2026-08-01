"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type GravacaoContextType = {
  gravando: boolean;
  segundos: number;
  videoBlob: Blob | null;
  erro: string | null;
  iniciarGravacao: () => Promise<void>;
  pararGravacao: () => void;
  descartarGravacao: () => void;
  limparErro: () => void;
};

const GravacaoContext = createContext<GravacaoContextType | null>(null);

// Fica no layout (não numa page) justamente pra sobreviver quando o usuário
// navega pra outro menu — a gravação continua rodando em segundo plano até
// ela mesma parar e salvar, em vez de morrer junto com a tela /gravacoes.
export function GravacaoProvider({ children }: { children: ReactNode }) {
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pararStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const iniciarGravacao = useCallback(async () => {
    setVideoBlob(null);
    setErro(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch {
      setErro("Não foi possível acessar a câmera/microfone. Verifique as permissões do navegador.");
      return;
    }
    streamRef.current = stream;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setVideoBlob(blob);
    };
    recorder.start();
    recorderRef.current = recorder;
    setGravando(true);
    setSegundos(0);
    timerRef.current = setInterval(() => setSegundos((s) => s + 1), 1000);
  }, []);

  const pararGravacao = useCallback(() => {
    recorderRef.current?.stop();
    setGravando(false);
    if (timerRef.current) clearInterval(timerRef.current);
    pararStream();
  }, [pararStream]);

  const descartarGravacao = useCallback(() => {
    setVideoBlob(null);
    setSegundos(0);
  }, []);

  const limparErro = useCallback(() => setErro(null), []);

  // Só protege contra fechar/atualizar a aba de vez — navegar entre menus
  // dentro do sistema agora é seguro, a gravação continua.
  useEffect(() => {
    const temAlgoPraPerder = gravando || !!videoBlob;
    if (!temAlgoPraPerder) return;
    function avisar(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [gravando, videoBlob]);

  return (
    <GravacaoContext.Provider value={{ gravando, segundos, videoBlob, erro, iniciarGravacao, pararGravacao, descartarGravacao, limparErro }}>
      {children}
    </GravacaoContext.Provider>
  );
}

export function useGravacao() {
  const ctx = useContext(GravacaoContext);
  if (!ctx) throw new Error("useGravacao precisa estar dentro de GravacaoProvider");
  return ctx;
}
