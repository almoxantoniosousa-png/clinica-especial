import type { MockupTipo } from "@/components/ajuda-mockups";

export interface AjudaItem {
  icone: string;
  titulo: string;
  texto: string;
  mockup: MockupTipo;
}

export interface AjudaConteudo {
  roleLabel: string;
  intro: string;
  itens: AjudaItem[];
}

const ADM: AjudaConteudo = {
  roleLabel: "Administrador(a)",
  intro: "Aqui você encontra uma explicação rápida de cada tela do menu. Clique em um item para abrir os detalhes.",
  itens: [
    {
      icone: "📊", titulo: "Dashboard", mockup: "dashboard",
      texto: "Tela inicial com os indicadores do dia: atendimentos de hoje, valores aguardando pagamento, custo acumulado no mês e atendimentos já pagos.\n\nMostra também os aniversariantes do mês (com destaque para quem faz aniversário hoje ou nos próximos 7 dias) e gráficos de custo por dia, atendimentos por semana, receita vs. despesa, planos de saúde das crianças e ranking dos profissionais mais ativos.\n\nOs dados são atualizados automaticamente sempre que a página é aberta."
    },
    {
      icone: "👶", titulo: "Crianças", mockup: "lista-cards",
      texto: "Lista de todas as crianças atendidas pela clínica, com cadastro completo: dados pessoais, responsável, escola, plano de saúde, diagnóstico/CID, alergias e medicações.\n\nClique no lápis para editar os dados de uma criança, na lixeira para excluir (pede confirmação) e no botão \"Ficha\" para gerar a ficha completa da criança pronta para impressão/PDF."
    },
    {
      icone: "🏫", titulo: "Escolas", mockup: "form-lista",
      texto: "Cadastro das escolas parceiras onde as crianças são atendidas.\n\nClique em \"Nova escola\" para cadastrar (nome, coordenação, telefone e endereço). Use o lápis para editar e a lixeira para excluir (com confirmação). O campo de busca ajuda a encontrar uma escola rapidamente."
    },
    {
      icone: "👨‍👩‍👧", titulo: "Família", mockup: "form-lista",
      texto: "Portal da Família — aqui você cadastra os responsáveis que terão acesso ao portal para acompanhar a criança (diário, avisos, fotos e evolução).\n\nClique em \"Novo\" para cadastrar (nome, e-mail de login, vínculo com a criança, CPF, telefone, endereço). Use \"Ativar\"/\"Desativar\" para controlar o acesso ao portal, o lápis para editar e a lixeira para remover."
    },
    {
      icone: "📢", titulo: "Mural", mockup: "mural",
      texto: "Mural de comunicados internos, visível para a equipe.\n\nClique em \"+ Novo Comunicado\" para publicar um aviso (título, mensagem e destinatário: Para todos / Apenas Atendentes / Apenas ADM). Marque \"📌 Fixar no topo\" para avisos importantes que devem aparecer sempre primeiro.\n\nVocê pode fixar/desafixar e excluir qualquer comunicado."
    },
    {
      icone: "📜", titulo: "Protocolos", mockup: "protocolos",
      texto: "Documentos com diretrizes de conduta para cada cargo da clínica (Especialista, AT, Supervisora, Auxiliar Administrativo, Gestão, Financeiro etc.).\n\nClique em \"Novo Protocolo\" para criar um (escolha o cargo, título e conteúdo). Use \"Enviar\" para mandar pelo chat, \"Imprimir\" para gerar uma versão em PDF com campos de assinatura, e acompanhe quem já confirmou a leitura de cada protocolo."
    },
    {
      icone: "💬", titulo: "Chat", mockup: "chat",
      texto: "Conversas internas, no estilo de um aplicativo de mensagens.\n\nClique no ícone de lápis (✎) para iniciar uma nova conversa. Você pode enviar texto, arquivos, imagens e áudios, e reagir às mensagens com emojis (👍 ❤️ 😂 😮 😢 🙏). Use a busca para encontrar conversas antigas."
    },
    {
      icone: "📅", titulo: "Escala", mockup: "escala",
      texto: "Escala semanal de atendimentos, organizada por dia e horário.\n\nUse os filtros de criança e tipo de serviço para visualizar atendimentos específicos. Clique em \"+ Novo atendimento\" para cadastrar um horário (dia, horário, criança, serviço e profissional). Use o lápis/lixeira para editar ou excluir. A legenda no final mostra a cor de cada tipo de serviço."
    },
    {
      icone: "🔍", titulo: "Auditoria", mockup: "tabela",
      texto: "Histórico de tudo que acontece no sistema: quem criou, editou, excluiu, pagou uma conta, fez login etc., com data e hora.\n\nUse a busca e os filtros (ação e período) para investigar uma alteração específica. O \"Resumo por usuário\" mostra quantas ações cada pessoa realizou — clique em um nome para filtrar só as ações dessa pessoa."
    },
    {
      icone: "👤", titulo: "Acompanhantes (Colaboradores)", mockup: "form-lista",
      texto: "Cadastro dos Acompanhantes Terapêuticos (ATs).\n\nPreencha o formulário no topo (nome, e-mail, CPF, RG, data de nascimento, WhatsApp, especialidade, registro profissional e endereço) e clique em \"Cadastrar Acompanhante\". O CPF é formatado e validado automaticamente. Na lista abaixo, use \"Editar\" ou \"Excluir\" para gerenciar os já cadastrados."
    },
    {
      icone: "🩺", titulo: "Especialistas (Colaboradores)", mockup: "form-lista",
      texto: "Cadastro dos especialistas da clínica (psicólogos, fonoaudiólogos, terapeutas ocupacionais etc.).\n\nFunciona como o cadastro de Acompanhantes, mas com campos específicos de área de atuação e registro profissional (CRP, CRM, CREFONO etc.). Clique em \"Cadastrar Especialista\" para salvar, e use \"Editar\"/\"Excluir\" na lista."
    },
    {
      icone: "🏠", titulo: "Internas (Colaboradores)", mockup: "form-lista",
      texto: "Cadastro das colaboradoras internas (Auxiliar Administrativa e Agente de Limpeza).\n\nClique em \"Nova colaboradora\" para cadastrar (nome, cargo, CPF, RG, datas de nascimento e admissão, e-mail, WhatsApp e endereço). Use o lápis para editar e a lixeira para excluir."
    },
    {
      icone: "💰", titulo: "Faturamento (Financeiro)", mockup: "financeiro",
      texto: "Controle financeiro de Contas a Pagar e Contas a Receber da clínica.\n\nLance uma nova conta preenchendo descrição, categoria, valor e vencimento. Marque uma conta como \"Pago\" ou \"Recebido\" quando o pagamento acontecer. Todas essas ações ficam registradas automaticamente na Auditoria."
    },
    {
      icone: "💵", titulo: "Folha de Pagamento (Financeiro)", mockup: "financeiro",
      texto: "Controle do pagamento da equipe por período (mês/quinzena).\n\nAcompanhe os valores de cada colaborador, marque como pago, edite valores quando necessário, e use o ícone da impressora para gerar o holerite individual em PDF."
    },
  ],
};

const GESTAO: AjudaConteudo = {
  roleLabel: "Gestão",
  intro: "Aqui você encontra uma explicação rápida de cada tela do menu. Clique em um item para abrir os detalhes.",
  itens: [
    {
      icone: "📊", titulo: "Dashboard", mockup: "dashboard",
      texto: "Visão geral da clínica: crianças ativas, profissionais na equipe, atendimentos de hoje e do mês, e receita do mês. Avisa também sobre famílias com pagamento atrasado e liminares judiciais perto de vencer.\n\nMostra a equipe ativa, a agenda de hoje, os últimos relatórios enviados e gráficos de evolução dos atendimentos, profissionais mais ativos, modalidades (Liminar/Convênio/Particular) e planos de saúde.\n\nNo final há atalhos rápidos para Mural, Crianças, Agenda e Relatórios. Os dados são atualizados automaticamente."
    },
    {
      icone: "🗓️", titulo: "Minha Agenda", mockup: "agenda-semana",
      texto: "Sua agenda semanal pessoal de compromissos (treinos, atendimentos, reuniões etc.), organizada de segunda a domingo. Use as setas para navegar entre semanas.\n\nPara cada compromisso pendente, clique em \"Realizado\" ou \"Não realizei\" (que abre um campo opcional para escrever um recado, enviado automaticamente pelo chat para a auxiliar administrativa). Use \"Desfazer\" se marcar algo por engano."
    },
    {
      icone: "👶", titulo: "Crianças", mockup: "lista-cards",
      texto: "Lista de todas as crianças atendidas, em cartões com nome, idade, responsável, diagnóstico e modalidade.\n\nUse os filtros \"Ativos\"/\"Inativos\"/\"Todos\" e a busca por nome ou responsável. Em cada cartão há botões rápidos de WhatsApp, e-mail e Instagram da família."
    },
    {
      icone: "🏫", titulo: "Escolas", mockup: "lista-cards",
      texto: "Lista de escolas parceiras, com nome, coordenação e endereço (apenas consulta).\n\nUse a busca para filtrar por nome, coordenação ou bairro. Clique no endereço para abrir no Google Maps, no telefone para ligar, ou em \"WA\" para abrir o WhatsApp da escola."
    },
    {
      icone: "📅", titulo: "Agenda", mockup: "agenda-semana",
      texto: "Agenda geral de todos os atendimentos da clínica, organizada por semana e dia.\n\nNavegue entre semanas com as setas; cada dia mostra quantos atendimentos tem marcados. Clique em um dia para ver a lista detalhada (horário, criança, profissional, serviço e observações). Use \"Ir para hoje\" para voltar à data atual."
    },
    {
      icone: "📢", titulo: "Mural", mockup: "mural",
      texto: "Mural de comunicados internos da equipe. Os avisos fixados (📌) aparecem sempre no topo. Esta tela é apenas de consulta para o seu perfil."
    },
    {
      icone: "📜", titulo: "Protocolos", mockup: "protocolos",
      texto: "Diretrizes de conduta da sua função. Cada protocolo pode ser aberto para leitura — clique em \"Confirmar leitura\" para registrar que está ciente. Depois de confirmado, mostra a data da confirmação."
    },
    {
      icone: "📈", titulo: "Relatórios", mockup: "tabela",
      texto: "Reúne todos os prontuários e relatórios enviados pela equipe sobre os atendimentos das crianças.\n\nUse a busca (criança ou profissional) e o botão \"Filtros\" para refinar por profissional ou período (\"De\"/\"Até\"). Clique em um relatório para abrir e ver o conteúdo completo (Avaliação, Resultados, Intervenção, Avanços e Conclusão)."
    },
    {
      icone: "💬", titulo: "Chat", mockup: "chat",
      texto: "Conversas internas estilo aplicativo de mensagens. Clique no lápis para iniciar uma nova conversa, envie texto, arquivos, imagens ou áudios, e reaja com emojis."
    },
    {
      icone: "📅", titulo: "Escala", mockup: "escala",
      texto: "Quadro da escala semanal de atendimentos por dia e horário (apenas consulta). Use as setas para navegar entre os dias e os filtros de criança/serviço para visualizar atendimentos específicos. A legenda de cores no final indica o tipo de cada serviço."
    },
    {
      icone: "💬", titulo: "Comunicados (Família)", mockup: "abas",
      texto: "Tela para se comunicar diretamente com as famílias pelo Portal da Família, com duas abas:\n\n• Avisos — clique em \"📢 Novo aviso\" para publicar um recado para uma criança específica (criança, título e mensagem opcional).\n\n• Evolução — clique em \"📊 Novo registro\" para publicar um relato de evolução da criança (criança, título e conteúdo).\n\nTudo o que for publicado aqui aparece para a família no Portal da Família. Itens podem ser excluídos (com confirmação)."
    },
    {
      icone: "👥", titulo: "Colaboradores (Acompanhantes / Especialistas / Internas)", mockup: "lista-cards",
      texto: "Listas de consulta da equipe: Acompanhantes Terapêuticos, Especialistas e Colaboradoras Internas, com dados de contato (nome, e-mail, especialidade/cargo, WhatsApp etc.).\n\nUse a busca para filtrar por nome ou especialidade/cargo, e \"Ver mais\" para carregar mais resultados. Em cada cartão há botões para abrir WhatsApp ou e-mail diretamente."
    },
  ],
};

const SUPERVISORA: AjudaConteudo = {
  roleLabel: "Supervisora",
  intro: "Aqui você encontra uma explicação rápida de cada tela do menu. Clique em um item para abrir os detalhes.",
  itens: [
    {
      icone: "📋", titulo: "Comunicados", mockup: "abas",
      texto: "Seu painel principal, com 5 abas:\n\n• Dashboard — visão geral do dia: crianças em atendimento, comunicados pendentes de revisão, recebidos hoje, já enviados às famílias, agenda do dia e os últimos comunicados.\n\n• Comunicados Diários — lista os formulários enviados pela equipe, com filtros Pendentes/Enviados/Todos. Abra um registro, escreva uma observação se quiser, e clique em \"📨 Enviar para Família\" para liberá-lo no Portal da Família.\n\n• Momentos — clique em \"📸 Publicar momento\" para postar fotos do dia a dia das crianças (escolha a criança, a foto e uma descrição opcional).\n\n• Evolução — clique em \"📊 Novo registro\" para publicar uma observação de evolução/progresso de uma criança.\n\n• Avisos — clique em \"📢 Novo aviso\" para publicar um recado para a família de uma criança específica.\n\nDica: o alerta amarelo no Dashboard mostra quantos comunicados ainda precisam ser revisados — vale conferir todo dia."
    },
    {
      icone: "📜", titulo: "Protocolos", mockup: "protocolos",
      texto: "Diretrizes de conduta da sua função. Abra um protocolo, leia o conteúdo e clique em \"Confirmar leitura\" para registrar que está ciente."
    },
    {
      icone: "📢", titulo: "Mural", mockup: "mural",
      texto: "Mural de avisos da equipe, com os comunicados fixados (📌) sempre no topo."
    },
    {
      icone: "💬", titulo: "Chat", mockup: "chat",
      texto: "Conversas internas estilo aplicativo de mensagens. Clique no lápis para iniciar uma nova conversa, envie texto, arquivos, imagens ou áudios, e reaja com emojis."
    },
  ],
};

const ESPECIALISTA: AjudaConteudo = {
  roleLabel: "Especialista",
  intro: "Aqui você encontra uma explicação rápida de cada tela do menu. Clique em um item para abrir os detalhes.",
  itens: [
    {
      icone: "📅", titulo: "Minha Escala", mockup: "escala",
      texto: "Seus horários de atendimento da semana (Segunda a Sexta). Navegue entre os dias usando as setas ou clicando no nome do dia. Para cada dia, veja horário, criança e tipo de serviço (cada um com uma cor). No final aparece o total de atendimentos da semana. Tela apenas de consulta."
    },
    {
      icone: "📋", titulo: "Prontuário", mockup: "form-simples",
      texto: "Registro diário de cada sessão (\"Prontuário de Atendimento\"). Escolha a criança, a data e o tipo de sessão (Sessão, Avaliação ou Reunião), descreva o objetivo do atendimento e preencha os campos Avaliação, Resultados, Intervenção, Avanços e Conclusão.\n\nClique em \"Salvar e Enviar Prontuário\" para enviar para a Supervisora e a Gestão.\n\nDica: preencha os campos com asterisco (*) logo após cada sessão, enquanto os detalhes ainda estão frescos."
    },
    {
      icone: "📝", titulo: "Relatório", mockup: "tabela",
      texto: "Lista/histórico de tudo que você já enviou (prontuários e relatórios), com filtros por criança e por tipo. Clique em um item para abrir e ver os detalhes.\n\nUse \"+ Prontuário\" para ir ao registro diário de sessão, ou \"+ Relatório\" para preencher um Relatório de Evolução completo (período, evolução geral, objetivos trabalhados/alcançados, dificuldades e recomendações) — use este quando a supervisão/gestão solicitar."
    },
    {
      icone: "📜", titulo: "Protocolos", mockup: "protocolos",
      texto: "Diretrizes de conduta da sua função. Abra um protocolo, leia o conteúdo e clique em \"Confirmar leitura\"."
    },
    {
      icone: "📢", titulo: "Mural", mockup: "mural",
      texto: "Mural de avisos da equipe, com os comunicados fixados (📌) sempre no topo."
    },
    {
      icone: "💬", titulo: "Chat", mockup: "chat",
      texto: "Conversas internas. Clique no lápis para iniciar uma conversa, envie texto, arquivos, imagens ou áudios, e reaja com emojis."
    },
  ],
};

const FAMILIA: AjudaConteudo = {
  roleLabel: "Família",
  intro: "Bem-vindo(a) ao Portal da Família! Aqui você acompanha o dia a dia da criança na clínica.",
  itens: [
    {
      icone: "🏠", titulo: "Meu Portal", mockup: "abas",
      texto: "No topo você vê a foto, nome, idade e diagnóstico da criança.\n\nA tela tem 4 abas:\n\n• Diário — comunicados diários da equipe sobre o dia da criança (chegada, interação, autonomia/banheiro, recreio/lanche, atividades de sala, tarefa de casa e avisos urgentes em vermelho), organizados por mês. Clique em um dia para ver todos os detalhes.\n\n• Avisos — comunicados gerais da clínica para a família, organizados por mês. Clique para ler o conteúdo completo.\n\n• Momentos — galeria de fotos do dia a dia da criança, organizadas por mês. Clique em uma foto para ampliar.\n\n• Evolução — registros de evolução/progresso da criança ao longo do tempo, organizados por mês. Clique para ler o texto completo.\n\nDica: os meses mais recentes já vêm abertos automaticamente."
    },
  ],
};

const ATENDENTE: AjudaConteudo = {
  roleLabel: "Atendente / Acompanhante Terapêutico",
  intro: "Aqui você encontra uma explicação rápida de cada tela do menu. Clique em um item para abrir os detalhes.",
  itens: [
    {
      icone: "📝", titulo: "Novo Registro", mockup: "form-simples",
      texto: "Tela para registrar o atendimento do dia. Mostra cartões com o total de horas acumuladas e o valor a receber (pendente de pagamento).\n\nEscolha se o atendimento foi em \"Casa\" ou na \"Escola\", informe o responsável/escola, horário de entrada e saída, data, a criança atendida e um relato do dia (ocorrência). As horas e o valor (R$ 30,00/h) são calculados automaticamente. Clique em \"Enviar Registro\" para salvar.\n\nDica: preencha entrada e saída corretamente, pois é a partir delas que o valor a receber é calculado."
    },
    {
      icone: "📋", titulo: "Meus Atendimentos", mockup: "tabela",
      texto: "Histórico dos atendimentos já registrados, com filtro por mês e ano.\n\nNo topo você vê cartões resumo: quantidade de atendimentos, total de horas, valor pendente e valor já pago. Abaixo, a lista mostra cada atendimento com data, criança, local, horas, valor e o selo \"Pago\" ou \"Pendente\". Tela apenas de consulta."
    },
    {
      icone: "📄", titulo: "Comunicado Diário", mockup: "form-etapas",
      texto: "Formulário em 4 passos sobre o dia da criança na escola:\n\n1. Entrada e Interação\n2. Autonomia e Higiene\n3. Recreio e Socialização\n4. Agenda e Recados\n\nSelecione a criança, informe o horário de chegada, marque as opções pedidas em cada passo e, no último, escreva o conteúdo trabalhado em sala, tarefa de casa, avisos urgentes e observações. Use \"Continuar →\" e \"← Anterior\" para navegar, e \"✓ Enviar Comunicado\" no final.\n\nDica: o comunicado vai primeiro para a supervisora revisar antes de chegar à família — preencha com cuidado, principalmente os avisos urgentes."
    },
    {
      icone: "📬", titulo: "Meus Comunicados", mockup: "tabela",
      texto: "Histórico dos comunicados diários que você enviou.\n\nNo topo aparecem cartões com o total de comunicados, quantos estão \"Em revisão\" e quantos já foram \"Enviados para família\". Cada comunicado mostra a criança, a data e o status. Se a supervisora deixar uma observação, ela aparece destacada em azul. Tela apenas de consulta."
    },
    {
      icone: "📅", titulo: "Minha Escala", mockup: "escala",
      texto: "Seus horários de atendimento da semana (Segunda a Sexta), agrupados por faixa de horário (ex: \"13:00 – 13:30\"). Dentro de cada faixa, mostra quais crianças, serviços e profissionais estão envolvidos.\n\nNavegue entre os dias da semana, veja o total de atendimentos da semana e confira a legenda de cores dos serviços no final. Tela apenas de consulta."
    },
    {
      icone: "📜", titulo: "Protocolos", mockup: "protocolos",
      texto: "Diretrizes de conduta da sua função. Abra um protocolo para ler o conteúdo completo e clique em \"Confirmar leitura\" para registrar que você está ciente — depois de confirmado, fica marcado com a data."
    },
    {
      icone: "📢", titulo: "Mural", mockup: "mural",
      texto: "Mural de avisos da equipe. Os avisos fixados (📌) aparecem sempre no topo. Tela de consulta."
    },
    {
      icone: "💬", titulo: "Chat", mockup: "chat",
      texto: "Conversas internas. Clique no lápis para iniciar uma nova conversa (atendentes podem falar com ADM e Supervisora). Envie texto, arquivos, imagens ou áudios, e reaja com emojis."
    },
  ],
};

const FINANCEIRO: AjudaConteudo = {
  roleLabel: "Financeiro",
  intro: "Aqui você encontra uma explicação rápida de cada tela do menu. Clique em um item para abrir os detalhes.",
  itens: [
    {
      icone: "💰", titulo: "Faturamento", mockup: "financeiro",
      texto: "Controle de Contas a Pagar e Contas a Receber da clínica. Lance uma nova conta (descrição, categoria, valor, vencimento) e marque como \"Pago\"/\"Recebido\" quando o pagamento acontecer. Tudo fica registrado na Auditoria."
    },
    {
      icone: "💵", titulo: "Folha de Pagamento", mockup: "financeiro",
      texto: "Controle do pagamento da equipe por período. Acompanhe valores, marque como pago, edite quando necessário e use o ícone da impressora para gerar o holerite de cada colaborador."
    },
    {
      icone: "📜", titulo: "Protocolos", mockup: "protocolos",
      texto: "Diretrizes de conduta da sua função. Abra um protocolo, leia o conteúdo e clique em \"Confirmar leitura\"."
    },
    {
      icone: "💬", titulo: "Chat", mockup: "chat",
      texto: "Conversas internas. Clique no lápis para iniciar uma conversa, envie texto, arquivos, imagens ou áudios, e reaja com emojis."
    },
  ],
};

const AUX_ADM: AjudaConteudo = {
  roleLabel: "Aux. Administrativo",
  intro: "Aqui você encontra uma explicação rápida de cada tela do menu. Clique em um item para abrir os detalhes.",
  itens: [
    {
      icone: "🗓️", titulo: "Agenda Simone", mockup: "agenda-semana",
      texto: "Organize a agenda semanal da diretora.\n\nNo topo há cartões coloridos por tipo de compromisso (Treinamento, Atend. Clínica, Atend. Casa, Atend. Escola, Espiritual, Reunião, Feriado/Livre) — clique em um para abrir o formulário de novo compromisso (data, horário e \"com quem/o quê\").\n\nAbaixo, veja a semana inteira com os compromissos já cadastrados; use o lápis/lixeira para editar ou excluir. Compromissos marcados como \"não realizados\" aparecem em vermelho com um recado pedindo remarcação.\n\nUse \"Copiar pauta\" para gerar um texto com toda a agenda da semana, pronto para colar no WhatsApp."
    },
    {
      icone: "📜", titulo: "Protocolos", mockup: "protocolos",
      texto: "Diretrizes de conduta da sua função. Abra um protocolo, leia o conteúdo e clique em \"Confirmar leitura\"."
    },
    {
      icone: "📢", titulo: "Mural", mockup: "mural",
      texto: "Mural de avisos da equipe, com os comunicados fixados (📌) sempre no topo."
    },
    {
      icone: "💬", titulo: "Chat", mockup: "chat",
      texto: "Conversas internas. Clique no lápis para iniciar uma conversa, envie texto, arquivos, imagens ou áudios, e reaja com emojis."
    },
  ],
};

export function getAjudaConteudo(userRole: string): AjudaConteudo {
  const role = userRole ? userRole.trim().toLowerCase() : "";
  if (role === "adm" || role === "admin") return ADM;
  if (role === "gestao") return GESTAO;
  if (role === "supervisora") return SUPERVISORA;
  if (role === "especialista") return ESPECIALISTA;
  if (role === "familia") return FAMILIA;
  if (role === "financeiro") return FINANCEIRO;
  if (role === "aux_adm") return AUX_ADM;
  return ATENDENTE;
}
