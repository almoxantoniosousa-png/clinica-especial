"use client";

import { EscalaManager } from "@/components/escala-manager";

export default function EscalaPage() {
  return (
    <EscalaManager
      rolesPermitidos={["especialista", "atendente"]}
      titulo="Escala"
      subtitulo="Cadastro semanal de atendimentos — Especialistas e Acompanhantes Terapêuticos"
    />
  );
}
