export async function registrarLog(
    supabase: any,
    {
      usuario_email,
      usuario_nome,
      acao,
      tabela,
      registro_id,
      descricao,
    }: {
      usuario_email: string;
      usuario_nome?: string;
      acao: string;
      tabela?: string;
      registro_id?: string;
      descricao?: string;
    }
  ) {
    try {
      console.log("Registrando log:", { usuario_email, acao, descricao });
      const { error } = await supabase.from("log_auditoria").insert({
        usuario_email,
        usuario_nome,
        acao,
        tabela,
        registro_id,
        descricao,
      });
      if (error) console.error("Erro log:", error);
    } catch (e) {
      console.error("Erro ao registrar log:", e);
    }
  }