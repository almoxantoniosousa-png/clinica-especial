"use client";

import { useRef, useState, useEffect } from "react";
import { Eraser } from "lucide-react";

export function AssinaturaPad({ onSalvar, salvando }: { onSalvar: (base64: string) => void; salvando?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const vazio = useRef(true);
  const [temTraco, setTemTraco] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e293b";
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function iniciar(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    desenhando.current = true;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  function mover(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!desenhando.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (vazio.current) { vazio.current = false; setTemTraco(true); }
  }
  function soltar() { desenhando.current = false; }

  function limpar() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    vazio.current = true;
    setTemTraco(false);
  }

  function salvar() {
    const canvas = canvasRef.current;
    if (!canvas || vazio.current) return;
    onSalvar(canvas.toDataURL("image/png"));
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        className="w-full h-36 rounded-xl border-2 border-dashed border-slate-300 bg-white touch-none cursor-crosshair"
        onPointerDown={iniciar}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerLeave={soltar}
      />
      <div className="flex gap-2">
        <button type="button" onClick={limpar}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 px-2 py-1.5">
          <Eraser className="h-3.5 w-3.5" />
          Limpar
        </button>
        <button type="button" onClick={salvar} disabled={!temTraco || salvando}
          className="flex-1 h-9 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition disabled:opacity-40">
          {salvando ? "Salvando..." : "Confirmar e assinar"}
        </button>
      </div>
      <p className="text-[11px] text-slate-400">Desenhe sua assinatura na área acima (com o dedo ou o mouse).</p>
    </div>
  );
}
