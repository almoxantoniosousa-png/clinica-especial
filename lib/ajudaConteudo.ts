import type { MockupTipo } from "@/components/ajuda-mockups";

export interface AjudaItem {
  icone: string;
  titulo: string;
  texto: string;
  mockup: MockupTipo;
  reflexo?: string;
}

export interface AjudaConteudo {
  roleLabel: string;
  intro: string;
  itens: AjudaItem[];
  contato: string;
}

const ADM: AjudaConteudo = {
  roleLabel: "Administrador(a)",
  intro: "Aqui você encontra uma explicação rápida de cada tela do menu. Clique em um item para abrir os detalhes.",
  contato: "Encontrou um problema técnico ou tem uma sugestão de melhoria para o sistema? Entre em contato com o suporte técnico.",
  itens: [
    {
      icone: "📊", titulo: "Dashboard", mockup: "dashboard",
      texto: "Tela inicial com os indicadores do dia: atendimentos de hoje, valores aguardando pagamento, custo acumulado no mês e atendimentos já pagos.\n\nMostra também os aniversariantes do mês (com destaque para quem faz aniversário hoje ou nos próximos 7 dias) e gráficos de custo por dia, atendimentos por semana, receita vs. despesa, planos de saúde das crianças e ranking dos profissionais mais ativos.\n\nOs dados são atualizados automaticamente sempre que a página é aberta."
    },
    {
      icone: "🗓️", titulo: "Minha Agenda", mockup: "agenda-semana",
      texto: "Sua agenda pessoal e privada — ninguém mais no sistema consegue ver ou mexer nela, nem outro ADM. Mistura compromissos profissionais e particulares no mesmo lugar (reunião, cabeleireiro, aniversário de família, o que for).\n\nClique num dia da semana pra ver os compromissos dele, organizados por Manhã/Tarde/Noite. Use \"+ Novo compromisso\" pra cadastrar: data, horário (opcional), título, categoria (Clínica, Família, Pessoal ou Importante — cada uma com uma cor) e uma observação. Marque um lembrete (10 min, 30 min, 1h ou 1 dia antes) e o sistema te avisa na hora certa, em qualquer tela que você estiver — o aviso fica fixo até você confirmar que viu, e também mostra lembretes atrasados dos últimos dias.\n\nO círculo ao lado do horário marca o compromisso como feito (aparece riscado, com a etiqueta \"✓ Feito\"). O ícone 🔁 abre o compromisso pra remarcar rapidamente pra outra data/horário.",
      reflexo: "É só sua — não aparece pra Gestão, Supervisora nem ninguém mais. Diferente da Escala Administrativa, que é sobre horário de trabalho da equipe, essa aqui é sobre a sua vida."
    },
    {
      icone: "👶", titulo: "Crianças", mockup: "lista-cards",
      texto: "Lista de todas as crianças atendidas pela clínica, com cadastro completo: dados pessoais, filiação (nome da mãe e do pai), responsável, escola, série escolar, plano de saúde, diagnóstico/CID, alergias e medicações.\n\nClique no lápis para editar os dados de uma criança, na lixeira para excluir (pede confirmação) e no botão \"Ficha\" para gerar a ficha completa da criança pronta para impressão/PDF.",
      reflexo: "A criança cadastrada aqui passa a aparecer para a Gestão (lista de Crianças) e para os Atendentes e Especialistas, que podem selecioná-la ao registrar atendimentos, comunicados e prontuários."
    },
    {
      icone: "🏫", titulo: "Escolas", mockup: "form-lista",
      texto: "Cadastro das escolas parceiras onde as crianças são atendidas.\n\nClique em \"Nova escola\" para cadastrar (nome, coordenação, telefone e endereço). Use o lápis para editar e a lixeira para excluir (com confirmação). O campo de busca ajuda a encontrar uma escola rapidamente.",
      reflexo: "A escola cadastrada aqui fica disponível para vincular no cadastro de cada Criança, e passa a aparecer também na lista de Escolas da Gestão."
    },
    {
      icone: "👨‍👩‍👧", titulo: "Família", mockup: "form-lista",
      texto: "Portal da Família — aqui você cadastra os responsáveis que terão acesso ao portal para acompanhar a criança (diário, avisos, fotos e evolução).\n\nClique em \"Novo\" para cadastrar (nome, e-mail de login, vínculo com a criança, CPF, telefone, endereço). Use \"Ativar\"/\"Desativar\" para controlar o acesso ao portal, o lápis para editar e a lixeira para remover.",
      reflexo: "Ao ativar o acesso, o responsável passa a poder fazer login no Portal da Família e ver tudo o que a equipe publicar para aquela criança (Diário, Avisos, Momentos e Evolução)."
    },
    {
      icone: "📢", titulo: "Mural", mockup: "mural",
      texto: "Mural de comunicados internos, visível para a equipe.\n\nClique em \"+ Novo Comunicado\" para publicar um aviso (título, mensagem e destinatário: Para todos / Apenas Atendentes / Apenas ADM). Marque \"📌 Fixar no topo\" para avisos importantes que devem aparecer sempre primeiro.\n\nVocê pode fixar/desafixar e excluir qualquer comunicado.",
      reflexo: "O comunicado publicado aqui aparece automaticamente no Mural de todos os perfis (Gestão, Supervisora, Especialistas, Atendentes, Financeiro e Aux. Administrativo)."
    },
    {
      icone: "📜", titulo: "Protocolos", mockup: "protocolos",
      texto: "Documentos com diretrizes de conduta para cada cargo da clínica (Especialista, AT, Supervisora, Auxiliar Administrativo, Gestão, Financeiro etc.).\n\nClique em \"Novo Protocolo\" para criar um (escolha o cargo, título e conteúdo). Use \"Enviar\" para mandar pelo chat, \"Imprimir\" para gerar uma versão em PDF com campos de assinatura, e acompanhe quem já confirmou a leitura de cada protocolo.",
      reflexo: "O protocolo criado aqui aparece na tela Protocolos do cargo escolhido — cada pessoa precisa abrir e confirmar a leitura, e você acompanha aqui quem já confirmou."
    },
    {
      icone: "💬", titulo: "Chat", mockup: "chat",
      texto: "Conversas internas, no estilo de um aplicativo de mensagens.\n\nClique no ícone de lápis (✎) para iniciar uma nova conversa. Você pode enviar texto, arquivos, imagens e áudios, e reagir às mensagens com emojis (👍 ❤️ 😂 😮 😢 🙏). Use a busca para encontrar conversas antigas.\n\n🎥 Videochamada: dentro de uma conversa, toque no ícone de vídeo no topo para abrir uma sala de reunião por vídeo em uma nova aba — um cartão \"Videochamada\" com o botão \"Entrar na reunião\" é enviado automaticamente para a outra pessoa, que pode entrar quando quiser.\n\n🔔 Notificações: na primeira vez que abrir o Chat, toque em \"Ativar\" na faixa azul para receber notificações de novas mensagens (e avisos de reunião) mesmo com o Chat fechado."
    },
    {
      icone: "📅", titulo: "Escala", mockup: "escala",
      texto: "Escala semanal de atendimentos de especialistas e ATs, organizada por dia e horário — só para consulta.\n\nUse os filtros de criança e tipo de serviço para visualizar atendimentos específicos. A legenda no final mostra a cor de cada tipo de serviço. Quem cadastra e edita os horários é a Supervisora, na tela dela.",
      reflexo: "Quem monta a Escala das ATs e Especialistas é a Supervisora. Você acompanha aqui, e continua cuidando da Escala Administrativa (Aux. Adm e Limpeza) normalmente."
    },
    {
      icone: "🔍", titulo: "Auditoria", mockup: "tabela",
      texto: "Histórico de tudo que acontece no sistema: quem criou, editou, excluiu, pagou uma conta, fez login etc., com data e hora.\n\nUse a busca e os filtros (ação e período) para investigar uma alteração específica. O \"Resumo por usuário\" mostra quantas ações cada pessoa realizou — clique em um nome para filtrar só as ações dessa pessoa.\n\nTodas as funcionalidades do sistema registram eventos aqui: solicitações de brinquedos, retiradas, devoluções, requisições de compra, atualizações de status e muito mais.",
      reflexo: "Toda ação relevante feita nas demais telas do sistema (cadastros, edições, exclusões, pagamentos, login, brinquedos, requisições) gera automaticamente um registro aqui."
    },
    {
      icone: "👤", titulo: "Acompanhantes (Colaboradores)", mockup: "form-lista",
      texto: "Cadastro dos Acompanhantes Terapêuticos (ATs).\n\nPreencha o formulário no topo (nome, e-mail, CPF, RG, data de nascimento, WhatsApp, especialidade, registro profissional e endereço) e clique em \"Cadastrar Acompanhante\". O CPF é formatado e validado automaticamente. Na lista abaixo, use \"Editar\" ou \"Excluir\" para gerenciar os já cadastrados.",
      reflexo: "Depois de cadastrado, o Acompanhante pode fazer login no sistema, aparece na lista de Colaboradores da Gestão e pode ser escalado na tela Escala."
    },
    {
      icone: "🩺", titulo: "Especialistas (Colaboradores)", mockup: "form-lista",
      texto: "Cadastro dos especialistas da clínica (psicólogos, fonoaudiólogos, terapeutas ocupacionais etc.).\n\nFunciona como o cadastro de Acompanhantes, mas com campos específicos de área de atuação e registro profissional (CRP, CRM, CREFONO etc.). Clique em \"Cadastrar Especialista\" para salvar, e use \"Editar\"/\"Excluir\" na lista.",
      reflexo: "Depois de cadastrado, o Especialista pode fazer login no sistema, aparece na lista de Colaboradores da Gestão e pode ser escalado na tela Escala."
    },
    {
      icone: "🏠", titulo: "Internas (Colaboradores)", mockup: "form-lista",
      texto: "Cadastro das colaboradoras internas (Auxiliar Administrativa e Agente de Limpeza).\n\nClique em \"Nova colaboradora\" para cadastrar (nome, cargo, CPF, RG, datas de nascimento e admissão, e-mail, WhatsApp e endereço). Use o lápis para editar e a lixeira para excluir.",
      reflexo: "Depois de cadastrada, a colaboradora pode fazer login no sistema com o cargo definido (Auxiliar Administrativo ou Limpeza) e passa a aparecer na lista de Colaboradores da Gestão."
    },
    {
      icone: "🗓️", titulo: "Escala Administrativa", mockup: "tabela",
      texto: "Horário de trabalho de cada Auxiliar Administrativa e Agente de Limpeza. Clique em \"Nova escala\", escolha a colaboradora, marque os dias da semana e defina o horário de início e fim (padrão sugerido: Segunda a Sexta, 08h às 18h). Use o lápis para editar ou a lixeira para remover.",
      reflexo: "Diferente da Escala clínica (especialistas e ATs), essa tela é só sobre horário de trabalho — não tem criança nem serviço envolvido."
    },
    {
      icone: "💰", titulo: "Faturamento (Financeiro)", mockup: "financeiro",
      texto: "Controle financeiro de Contas a Pagar, Contas a Receber e Empréstimos da clínica.\n\nLance uma nova conta preenchendo descrição, categoria, valor e vencimento. Marque uma conta como \"Pago\" ou \"Recebido\" quando o pagamento acontecer — uma janela abre pra você escolher a data real do pagamento (vem preenchida com o dia de hoje, mas pode trocar). Todas essas ações ficam registradas automaticamente na Auditoria.\n\nErrou algo em uma fatura de Contas a Receber já lançada? Clique em \"Editar\" no card dela (funciona mesmo em faturas já recebidas) — não precisa excluir e lançar de novo.\n\nA aba Empréstimos controla dinheiro emprestado a colaboradores (qualquer cargo): escolha o colaborador (o CPF vem preenchido sozinho, editável), valor total e número de parcelas — o sistema calcula o valor de referência de cada parcela. Clique em \"Registrar pagamento\" a cada desconto no salário; valor, data e número da parcela já vêm preenchidos (data em sequência mensal a partir do início do empréstimo), mas tudo é editável — pra adiantar parcelas, pagar valor diferente ou ajustar a data. Dá pra anexar o comprovante que o colaborador enviou, e clicar em \"Gerar recibo\" pra criar o recibo de pagamento pronto pra imprimir/salvar em PDF, já preenchido com os dados da clínica. Quita sozinho quando a soma dos pagamentos bate o valor total. Empréstimos longos mostram só os 5 pagamentos mais recentes, com \"Ver todos\" pra expandir.",
      reflexo: "Ao marcar uma conta como Pago/Recebido, o valor entra nos gráficos de receita/despesa do Dashboard."
    },
    {
      icone: "💵", titulo: "Folha de Pagamento (Financeiro)", mockup: "financeiro",
      texto: "Controle do pagamento da equipe por período (mês/quinzena).\n\nAcompanhe os valores de cada colaborador, marque como pago, edite valores quando necessário, e use o ícone da impressora para gerar o holerite individual em PDF.\n\nPara as especialistas, cada card já mostra quantas presenças, faltas e faltas justificadas ela teve no mês (vindo do que ela marcou em \"Minha Escala\") — ajuda a decidir o valor antes de lançar, sem precisar checar em outra tela.",
      reflexo: "O pagamento marcado aqui também fica registrado na Auditoria, e o holerite gerado pode ser entregue ao colaborador."
    },
    {
      icone: "🩺", titulo: "Atendimentos Especialistas", mockup: "tabela",
      texto: "Mostra, por mês, quantos atendimentos cada especialista teve: P (presença), F (falta avisada em cima da hora — recebe) e FJ (falta avisada com antecedência — não recebe). Clique no nome pra ver o detalhe de cada atendimento.",
      reflexo: "Vem do que cada especialista marca em \"Minha Escala\" — use como referência pra lançar a Folha de Pagamento."
    },
    {
      icone: "📋", titulo: "Atendimentos ATs", mockup: "tabela",
      texto: "Mostra, por mês e agrupado por AT, todo atendimento registrado em \"Novo Registro\": criança, local (casa/escola), horas, valor e o relato completo do dia. Atualiza sozinha assim que o AT enviar um novo registro (aparece destacado por alguns segundos).\n\nNo topo, 4 cards somam o total geral (todas as ATs juntas): Total de horas, Valor total, A pagar (pendente + aprovado) e Já pago. Cada AT também mostra o próprio subtotal de horas e valor.",
      reflexo: "Antes só o próprio AT via esse detalhe em \"Meus Atendimentos\" — aqui o ADM e o Financeiro acompanham tudo sem precisar perguntar."
    },
    {
      icone: "🧸", titulo: "Brinquedos", mockup: "abas",
      texto: "Visão geral do sistema de empréstimo de brinquedos — as mesmas 5 abas da Aux. Adm.\n\n• Solicitações — pedidos da equipe aguardando retirada.\n• Em Posse — brinquedos que estão com as colaboradoras.\n• Histórico — empréstimos encerrados (devolvidos).\n• Catálogo — lista de brinquedos com fotos. Você pode adicionar, editar e registrar retiradas/devoluções.\n• Ranking — gráficos de brinquedos mais usados, colaboradoras e crianças.\n\nTodas as ações (solicitação, retirada, devolução, cadastro no catálogo) ficam registradas na Auditoria.",
      reflexo: "O catálogo cresce automaticamente quando alguém solicita um brinquedo novo — cada retirada e devolução fica rastreada na Auditoria."
    },
    {
      icone: "🛒", titulo: "Requisições de Compra", mockup: "abas",
      texto: "Central de pedidos de produtos da equipe (Supervisora, Gestão e Especialistas).\n\nOrganizado em 6 abas: Pendentes (com contador laranja), Em análise, Comprados, Entregues, Recusados e Todos.\n\nResumo no topo mostra quantos pedidos estão pendentes e em análise. Clique em \"Atualizar\" para mudar o status e adicionar uma observação visível ao solicitante.\n\nDica: monitore a aba Pendentes diariamente — cada mudança de status fica registrada na Auditoria.",
      reflexo: "Quando você altera o status ou adiciona uma observação, o solicitante vê a resposta direto na tela de Requisições dele. A ação fica registrada na Auditoria."
    },
    {
      icone: "📦", titulo: "Patrimônio", mockup: "abas",
      texto: "Inventário de bens da clínica (tombamento) e controle de manutenção de equipamentos, em duas abas.\n\n• Bens — clique em \"+ Cadastrar bem\" para tombar um item novo (nome, categoria, local, valor, fornecedor, foto e nota fiscal). Cada bem recebe um número de tombamento automático (T-0001, T-0002...). Abra um bem pra ver o histórico de manutenções, o custo acumulado gasto nele, e gerar a etiqueta com QR Code pra imprimir e colar no equipamento. Só o ADM pode dar baixa em um bem (perda, quebra irreparável, doação).\n\n• Manutenções — lista de chamados de defeito abertos por qualquer colaborador (escaneando o QR da etiqueta ou pela tela \"Reportar Defeito\"). Abra um chamado pra preencher local do conserto, técnico/fornecedor, custo, nota fiscal, garantia e o status (Aberto → Em Análise → Em Conserto → Concluído). Um aviso amarelo no topo lembra quando um bem está há mais de 6 meses sem conferência de inventário.",
      reflexo: "Ao informar um custo de conserto, o sistema lança automaticamente uma Conta a Pagar no Faturamento — não precisa lançar duas vezes. Quando alguém reporta um defeito, você recebe uma notificação (🔔) na hora."
    },
  ],
};

const GESTAO: AjudaConteudo = {
  roleLabel: "Gestão",
  intro: "Aqui você encontra uma explicação rápida de cada tela do menu. Clique em um item para abrir os detalhes.",
  contato: "Ainda com dúvidas? Use o Chat para falar com a Administração.",
  itens: [
    {
      icone: "📊", titulo: "Dashboard", mockup: "dashboard",
      texto: "Visão geral da clínica: crianças ativas, profissionais na equipe, atendimentos de hoje e do mês, e receita do mês. Avisa também sobre famílias com pagamento atrasado e liminares judiciais perto de vencer.\n\nMostra a equipe ativa, a agenda de hoje, os últimos relatórios enviados e gráficos de evolução dos atendimentos, profissionais mais ativos, modalidades (Liminar/Convênio/Particular) e planos de saúde.\n\nNo final há atalhos rápidos para Mural, Crianças, Agenda e Relatórios. Os dados são atualizados automaticamente."
    },
    {
      icone: "🗓️", titulo: "Minha Agenda", mockup: "agenda-semana",
      texto: "Sua agenda semanal pessoal de compromissos (treinos, atendimentos, reuniões etc.), organizada de segunda a domingo. Use as setas para navegar entre semanas.\n\nPara cada compromisso pendente, clique em \"Realizado\" ou \"Não realizei\" (que abre um campo opcional para escrever um recado, enviado automaticamente pelo chat para a auxiliar administrativa). Use \"Desfazer\" se marcar algo por engano.",
      reflexo: "Os compromissos desta agenda também podem ser cadastrados/editados pela Auxiliar Administrativa em \"Agenda Simone\". Quando você marca \"Não realizei\", o recado é enviado automaticamente pelo Chat para ela organizar a remarcação."
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
      icone: "📅", titulo: "Agenda Clínica", mockup: "agenda-semana",
      texto: "Agenda geral de todos os atendimentos da clínica, organizada por semana e dia.\n\nNavegue entre semanas com as setas; cada dia mostra quantos atendimentos tem marcados. Clique em um dia para ver a lista detalhada (horário, criança, profissional, serviço e observações). Use \"Ir para hoje\" para voltar à data atual."
    },
    {
      icone: "📢", titulo: "Mural", mockup: "mural",
      texto: "Mural de comunicados internos da equipe. Os avisos fixados (📌) aparecem sempre no topo. Esta tela é apenas de consulta para o seu perfil."
    },
    {
      icone: "📜", titulo: "Protocolos", mockup: "protocolos",
      texto: "Diretrizes de conduta da sua função. Cada protocolo pode ser aberto para leitura — clique em \"Confirmar leitura\" para registrar que está ciente. Depois de confirmado, mostra a data da confirmação.",
      reflexo: "Ao confirmar a leitura, o ADM passa a ver seu nome (e a data) na lista de confirmações desse protocolo."
    },
    {
      icone: "📈", titulo: "Relatórios", mockup: "tabela",
      texto: "Reúne todos os prontuários e relatórios enviados pela equipe sobre os atendimentos das crianças.\n\nUse a busca (criança ou profissional) e o botão \"Filtros\" para refinar por profissional ou período (\"De\"/\"Até\"). Clique em um relatório para abrir e ver o conteúdo completo (Avaliação, Resultados, Intervenção, Avanços e Conclusão)."
    },
    {
      icone: "🩺", titulo: "Atendimentos Especialistas", mockup: "tabela",
      texto: "Mostra, por mês, quantos atendimentos cada especialista teve: P (presença), F (falta avisada em cima da hora — profissional recebe) e FJ (falta avisada com antecedência — não recebe).\n\nEscolha o mês no seletor do topo. Clique no nome de uma especialista para ver o detalhe de cada atendimento (criança, data, status e o motivo da falta, quando houver).",
      reflexo: "Esses dados vêm do que cada especialista marca em \"Minha Escala\" — servem de referência pra saber quanto pagar no mês, junto com o Financeiro."
    },
    {
      icone: "💬", titulo: "Chat", mockup: "chat",
      texto: "Conversas internas estilo aplicativo de mensagens. Clique no lápis para iniciar uma nova conversa, envie texto, arquivos, imagens ou áudios, e reaja com emojis.\n\n🎥 Videochamada: dentro de uma conversa, toque no ícone de vídeo no topo para abrir uma sala de reunião por vídeo em uma nova aba — um cartão \"Videochamada\" com o botão \"Entrar na reunião\" é enviado automaticamente para a outra pessoa, que pode entrar quando quiser.\n\n🔔 Notificações: na primeira vez que abrir o Chat, toque em \"Ativar\" na faixa azul para receber notificações de novas mensagens (e avisos de reunião) mesmo com o Chat fechado.",
      reflexo: "Use a videochamada para avisar a equipe sobre reuniões — o cartão \"Entrar na reunião\" aparece automaticamente na conversa de quem você chamar, e quem tiver as notificações ativadas recebe um aviso na hora."
    },
    {
      icone: "💬", titulo: "Comunicados (Família)", mockup: "abas",
      texto: "Tela para se comunicar diretamente com as famílias pelo Portal da Família, com duas abas:\n\n• Avisos — clique em \"📢 Novo aviso\" para publicar um recado para uma criança específica (criança, título e mensagem opcional).\n\n• Evolução — clique em \"📊 Novo registro\" para publicar um relato de evolução da criança (criança, título e conteúdo).\n\nTudo o que for publicado aqui aparece para a família no Portal da Família. Itens podem ser excluídos (com confirmação).",
      reflexo: "Avisos publicados aqui aparecem na aba Avisos do Portal da Família, e os registros de evolução aparecem na aba Evolução — a família vê tudo isso assim que você publica."
    },
    {
      icone: "👥", titulo: "Colaboradores (Acompanhantes / Especialistas / Internas)", mockup: "lista-cards",
      texto: "Listas de consulta da equipe: Acompanhantes Terapêuticos, Especialistas e Colaboradoras Internas, com dados de contato (nome, e-mail, especialidade/cargo, WhatsApp etc.).\n\nUse a busca para filtrar por nome ou especialidade/cargo, e \"Ver mais\" para carregar mais resultados. Em cada cartão há botões para abrir WhatsApp ou e-mail diretamente."
    },
    {
      icone: "📚", titulo: "Materiais Adaptados", mockup: "abas",
      texto: "Biblioteca de materiais pedagógicos adaptados para as crianças atendidas, com 3 abas:\n\n• Acervo — materiais aprovados disponíveis para toda a equipe. Use a busca por título, matéria ou série.\n\n• Meus Materiais — materiais que você criou. Clique em \"+ Novo material\" para cadastrar (livro, matéria, série, criança, nível de adaptação e observações). Adicione fotos. Depois de salvar, clique em \"Enviar para revisão\" para a Supervisora avaliar.\n\n• Em Revisão — materiais enviados aguardando avaliação (visível para quem pode revisar).\n\nNíveis de adaptação: Pictogramas/CAA, Leitura Fácil, Texto Ampliado, Resumo Simplificado e Outro.",
      reflexo: "O material enviado para revisão aparece na aba Em Revisão da Supervisora e Gestão. Quando aprovado, entra automaticamente no Acervo para toda a equipe consultar."
    },
    {
      icone: "🧸", titulo: "Brinquedos", mockup: "tabela",
      texto: "Solicite brinquedos para usar com as crianças nos atendimentos.\n\nClique em \"Nova solicitação\" para abrir o formulário: escolha a criança, o brinquedo (com autocomplete do catálogo) e a urgência. Se o brinquedo não existir no catálogo, ele é adicionado automaticamente.\n\nAcompanhe o histórico das suas solicitações e o status de cada uma: Pendente → Em posse → Devolvido.",
      reflexo: "A Aux. Adm recebe sua solicitação, registra a retirada quando você buscar o brinquedo, e dá baixa quando ele for devolvido. Cada etapa fica registrada na Auditoria."
    },
    {
      icone: "🔧", titulo: "Reportar Defeito", mockup: "tabela",
      texto: "Encontrou um equipamento com defeito? Aponte a câmera do celular para o QR Code da etiqueta de tombamento, ou entre aqui e busque o item na lista.\n\nDescreva o problema (e anexe uma foto, se quiser) e clique em \"Enviar para a administração\".",
      reflexo: "O ADM recebe uma notificação na hora e acompanha o conserto na tela Patrimônio — você não precisa avisar por outro canal."
    },
    {
      icone: "🛒", titulo: "Requisições de Compra", mockup: "tabela",
      texto: "Solicite produtos ao ADM — materiais, equipamentos, itens de escritório, ou qualquer coisa que a clínica precise comprar.\n\nClique em \"Nova requisição\" para preencher: produto, quantidade, descrição (para que serve), link do produto (opcional, ex: Amazon ou Shopee) e urgência (Normal ou Urgente).\n\nAcompanhe o histórico e receba a resposta do ADM com o status atualizado: Pendente → Em análise → Comprado → Entregue.",
      reflexo: "O ADM vê sua requisição, atualiza o status e pode deixar uma observação para você — que aparece direto nesta tela. A ação fica registrada na Auditoria."
    },
  ],
};

const SUPERVISORA: AjudaConteudo = {
  roleLabel: "Supervisora",
  intro: "Aqui você encontra uma explicação rápida de cada tela do menu. Clique em um item para abrir os detalhes.",
  contato: "Ainda com dúvidas? Use o Chat para falar com a Administração.",
  itens: [
    {
      icone: "📋", titulo: "Comunicados", mockup: "abas",
      texto: "Seu painel principal, com 5 abas:\n\n• Dashboard — visão geral do dia: crianças ativas na clínica, comunicados pendentes de revisão, recebidos hoje, já enviados às famílias, agenda do dia e os últimos comunicados.\n\n• Comunicados Diários — lista os formulários enviados pela equipe, com filtros Pendentes/Enviados/Todos. \"Pendentes\" mostra tudo, sem limite de data; \"Enviados\" e \"Todos\" trazem por padrão o dia de hoje, com um seletor de data pra consultar dias anteriores. Abra um registro, escreva uma observação se quiser, e clique em \"📨 Enviar para Família\" para liberá-lo no Portal da Família.\n\n• Momentos — clique em \"📸 Publicar momento\" para postar fotos do dia a dia das crianças (escolha a criança, a foto e uma descrição opcional).\n\n• Evolução — aqui você revisa os Relatórios de Evolução que as especialistas enviam (abas Pendentes/Enviados), não escreve do zero. Abra um relatório pendente, veja o que a especialista escreveu (evolução geral, objetivos alcançados, dificuldades, recomendações), ajuste o título/texto que vai pra família se quiser, e clique em \"📨 Enviar para Família\".\n\n• Avisos — clique em \"📢 Novo aviso\" para publicar um recado para a família de uma criança específica. Use um dos modelos prontos (reunião, troca de AT — versão equipe e versão família, reposição, atraso, mudança de horário, avaliação, documento pendente, recesso, evento, item pra levar, novo protocolo, material p/ revisão) pra preencher o texto rapidinho — os trechos entre [colchetes] precisam ser substituídos antes de publicar.\n\nDica: o alerta amarelo no Dashboard mostra quantos comunicados ainda precisam ser revisados — vale conferir todo dia.",
      reflexo: "O que você envia aqui aparece para a família no Portal da Família: Comunicados Diários enviados → aba Diário; Momentos → aba Momentos; relatórios de evolução enviados → aba Evolução; Avisos → aba Avisos."
    },
    {
      icone: "📅", titulo: "Escala", mockup: "escala",
      texto: "Cadastro semanal de atendimentos de especialistas e acompanhantes terapêuticos (ATs) — é você quem monta essa escala.\n\nUse os filtros de criança e tipo de serviço para localizar um horário. Alterne entre \"Por dia\" e \"Semana inteira\" pra ver a grade completa de uma vez. Clique em \"+ Novo atendimento\" para cadastrar (dia, horário, criança, serviço, profissional e local). Use o lápis/lixeira para editar ou excluir.\n\n✓ Presença: o círculo (ou os botões P/F/FJ) marca Presença, Falta ou Falta Justificada de cada atendimento.\n\n⚠️ Motivo: ao editar um atendimento, você pode registrar o motivo de uma troca de especialista ou de uma ausência — fica visível automaticamente pra Gestão e ADM, sem precisar avisar por outro canal.\n\n🕓 Histórico: mostra as versões anteriores de tudo que foi editado ou excluído, com quem mudou e quando.\n\n🖨️ Imprimir: gera uma versão limpa da escala da semana (sem motivo/presença) pronta pra colocar no mural físico.",
      reflexo: "O atendimento cadastrado aqui aparece na \"Minha Escala\" do especialista ou AT responsável. O motivo de uma troca/ausência é visto pela Gestão, ADM e pela própria especialista envolvida — não entra na versão impressa pro mural."
    },
    {
      icone: "📜", titulo: "Protocolos", mockup: "protocolos",
      texto: "Diretrizes de conduta da sua função. Abra um protocolo, leia o conteúdo e clique em \"Confirmar leitura\" para registrar que está ciente.",
      reflexo: "Ao confirmar a leitura, o ADM passa a ver seu nome na lista de confirmações desse protocolo."
    },
    {
      icone: "📢", titulo: "Mural", mockup: "mural",
      texto: "Mural de avisos da equipe, com os comunicados fixados (📌) sempre no topo."
    },
    {
      icone: "💬", titulo: "Chat", mockup: "chat",
      texto: "Conversas internas estilo aplicativo de mensagens. Clique no lápis para iniciar uma nova conversa, envie texto, arquivos, imagens ou áudios, e reaja com emojis.\n\n🎥 Videochamada: dentro de uma conversa, toque no ícone de vídeo no topo para abrir uma sala de reunião por vídeo em uma nova aba — um cartão \"Videochamada\" com o botão \"Entrar na reunião\" é enviado automaticamente para a outra pessoa, que pode entrar quando quiser.\n\n🔔 Notificações: na primeira vez que abrir o Chat, toque em \"Ativar\" na faixa azul para receber notificações de novas mensagens (e avisos de reunião) mesmo com o Chat fechado."
    },
    {
      icone: "📚", titulo: "Materiais Adaptados", mockup: "abas",
      texto: "Biblioteca de materiais pedagógicos adaptados, com 3 abas:\n\n• Acervo — materiais aprovados disponíveis para toda a equipe.\n\n• Meus Materiais — materiais que você criou. Use \"+ Novo material\" para cadastrar e \"Enviar para revisão\" para avaliação.\n\n• Em Revisão — materiais enviados pela equipe aguardando sua avaliação. Clique em \"Aprovar\" para colocar no acervo, ou \"Solicitar ajustes\" para devolver ao criador com observações.\n\nNíveis de adaptação: Pictogramas/CAA, Leitura Fácil, Texto Ampliado, Resumo Simplificado e Outro.",
      reflexo: "Ao aprovar um material, ele vai automaticamente ao Acervo para toda a equipe. Ao solicitar ajustes, o criador recebe um aviso com suas observações."
    },
    {
      icone: "🧸", titulo: "Brinquedos", mockup: "tabela",
      texto: "Solicite brinquedos para usar com as crianças nos atendimentos.\n\nClique em \"Nova solicitação\" para abrir o formulário: escolha a criança, o brinquedo (com autocomplete do catálogo) e a urgência. Se o brinquedo não existir no catálogo, ele é adicionado automaticamente.\n\nAcompanhe o histórico das suas solicitações e o status de cada uma: Pendente → Em posse → Devolvido.",
      reflexo: "A Aux. Adm recebe sua solicitação, registra a retirada quando você buscar o brinquedo, e dá baixa quando ele for devolvido. Cada etapa fica registrada na Auditoria."
    },
    {
      icone: "🔧", titulo: "Reportar Defeito", mockup: "tabela",
      texto: "Encontrou um equipamento com defeito? Aponte a câmera do celular para o QR Code da etiqueta de tombamento, ou entre aqui e busque o item na lista.\n\nDescreva o problema (e anexe uma foto, se quiser) e clique em \"Enviar para a administração\".",
      reflexo: "O ADM recebe uma notificação na hora e acompanha o conserto na tela Patrimônio."
    },
    {
      icone: "🛒", titulo: "Requisições de Compra", mockup: "tabela",
      texto: "Solicite produtos ao ADM — materiais ou equipamentos que a clínica precise comprar.\n\nClique em \"Nova requisição\" para preencher: produto, quantidade, descrição (para que serve), link do produto (opcional) e urgência (Normal ou Urgente).\n\nAcompanhe o histórico e receba a resposta do ADM com o status atualizado: Pendente → Em análise → Comprado → Entregue.",
      reflexo: "O ADM vê sua requisição, atualiza o status e pode deixar uma observação para você — que aparece direto nesta tela."
    },
  ],
};

const ESPECIALISTA: AjudaConteudo = {
  roleLabel: "Especialista",
  intro: "Aqui você encontra uma explicação rápida de cada tela do menu. Clique em um item para abrir os detalhes.",
  contato: "Ainda com dúvidas? Use o Chat para falar com a Supervisora ou a Administração.",
  itens: [
    {
      icone: "📅", titulo: "Minha Escala", mockup: "escala",
      texto: "Seus horários de atendimento da semana (Segunda a Domingo). Navegue entre os dias usando as setas ou clicando no nome do dia. Para cada dia, veja horário, criança e tipo de serviço (cada um com uma cor).\n\nEscolha a data no seletor do topo e marque a presença de cada atendimento: P (presença), F (falta avisada em cima da hora — você recebe mesmo assim) ou FJ (falta avisada com antecedência — não conta pra pagamento). Em F/FJ, escreva o motivo no campo que abre. No final aparece o total de atendimentos da semana.",
      reflexo: "O que você marca aqui (P/F/FJ) aparece na tela \"Atendimentos Especialistas\" da Gestão e do Financeiro, usada como referência pra saber quanto pagar no mês."
    },
    {
      icone: "📋", titulo: "Prontuário", mockup: "form-simples",
      texto: "Registro diário de cada sessão (\"Prontuário de Atendimento\"). Escolha a criança, a data e o tipo de sessão (Sessão, Avaliação ou Reunião), descreva o objetivo do atendimento e preencha os campos Avaliação, Resultados, Intervenção, Avanços e Conclusão.\n\nClique em \"Salvar e Enviar Prontuário\" para enviar para a Supervisora e a Gestão.\n\nDica: preencha os campos com asterisco (*) logo após cada sessão, enquanto os detalhes ainda estão frescos.",
      reflexo: "O prontuário enviado aqui aparece na tela Relatórios da Supervisora e da Gestão para acompanhamento."
    },
    {
      icone: "📝", titulo: "Relatório", mockup: "tabela",
      texto: "Lista/histórico de tudo que você já enviou (prontuários e relatórios), com filtros por criança e por tipo. Clique em um item para abrir e ver os detalhes.\n\nUse \"+ Prontuário\" para ir ao registro diário de sessão (fica interno, não vai para a família), ou \"+ Relatório\" para preencher um Relatório de Evolução completo (período, evolução geral, objetivos trabalhados/alcançados, dificuldades e recomendações) — use este quando quiser registrar a evolução da criança para a família ficar sabendo.",
      reflexo: "O Relatório de Evolução enviado aqui aparece na tela Relatórios da Gestão e na aba Evolução da Supervisora, que revisa o conteúdo e decide quando enviar para a família no Portal."
    },
    {
      icone: "📜", titulo: "Protocolos", mockup: "protocolos",
      texto: "Diretrizes de conduta da sua função. Abra um protocolo, leia o conteúdo e clique em \"Confirmar leitura\".",
      reflexo: "Ao confirmar a leitura, o ADM passa a ver seu nome na lista de confirmações desse protocolo."
    },
    {
      icone: "📢", titulo: "Mural", mockup: "mural",
      texto: "Mural de avisos da equipe, com os comunicados fixados (📌) sempre no topo."
    },
    {
      icone: "🧸", titulo: "Brinquedos", mockup: "tabela",
      texto: "Solicite brinquedos para usar com as crianças nos atendimentos.\n\nClique em \"Nova solicitação\" para abrir o formulário: escolha a criança, o brinquedo (com autocomplete do catálogo) e a urgência. Se o brinquedo não existir no catálogo, ele é adicionado automaticamente.\n\nAcompanhe o histórico das suas solicitações e o status de cada uma: Pendente → Em posse → Devolvido.",
      reflexo: "A Aux. Adm recebe sua solicitação, registra a retirada quando você buscar o brinquedo, e dá baixa quando ele for devolvido."
    },
    {
      icone: "🔧", titulo: "Reportar Defeito", mockup: "tabela",
      texto: "Encontrou um equipamento com defeito? Aponte a câmera do celular para o QR Code da etiqueta de tombamento, ou entre aqui e busque o item na lista.\n\nDescreva o problema (e anexe uma foto, se quiser) e clique em \"Enviar para a administração\".",
      reflexo: "O ADM recebe uma notificação na hora e acompanha o conserto na tela Patrimônio."
    },
    {
      icone: "🛒", titulo: "Requisições de Compra", mockup: "tabela",
      texto: "Solicite materiais ou equipamentos que você precisa para os atendimentos.\n\nClique em \"Nova requisição\" para preencher: produto, quantidade, descrição (para que serve), link do produto (opcional) e urgência (Normal ou Urgente).\n\nAcompanhe o histórico e receba a resposta do ADM: Pendente → Em análise → Comprado → Entregue.",
      reflexo: "O ADM vê sua requisição, atualiza o status e pode deixar uma observação para você — que aparece direto nesta tela."
    },
    {
      icone: "💬", titulo: "Chat", mockup: "chat",
      texto: "Conversas internas. Clique no lápis para iniciar uma conversa, envie texto, arquivos, imagens ou áudios, e reaja com emojis.\n\n🎥 Videochamada: dentro de uma conversa, toque no ícone de vídeo no topo para abrir uma sala de reunião por vídeo em uma nova aba — um cartão \"Videochamada\" com o botão \"Entrar na reunião\" é enviado automaticamente para a outra pessoa, que pode entrar quando quiser.\n\n🔔 Notificações: na primeira vez que abrir o Chat, toque em \"Ativar\" na faixa azul para receber notificações de novas mensagens (e avisos de reunião) mesmo com o Chat fechado."
    },
  ],
};

const FAMILIA: AjudaConteudo = {
  roleLabel: "Família",
  intro: "Bem-vindo(a) ao Portal da Família! Aqui você acompanha o dia a dia da criança na clínica.",
  contato: "Ainda com dúvidas? Fale com a equipe da clínica durante o atendimento ou pelo telefone/WhatsApp da clínica.",
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
  contato: "Ainda com dúvidas? Use o Chat para falar com a Supervisora ou a Administração.",
  itens: [
    {
      icone: "📝", titulo: "Novo Registro", mockup: "form-simples",
      texto: "Tela para registrar o atendimento do dia. Mostra cartões com o total de horas acumuladas e o valor a receber (pendente de pagamento).\n\nEscolha se o atendimento foi em \"Casa\" ou na \"Escola\", informe o responsável/escola, horário de entrada e saída, data, a criança atendida e um relato do dia (ocorrência). As horas e o valor (R$ 30,00/h) são calculados automaticamente. Clique em \"Enviar Registro\" para salvar.\n\nDica: preencha entrada e saída corretamente, pois é a partir delas que o valor a receber é calculado.",
      reflexo: "O atendimento registrado aqui aparece em Faturamento (Financeiro) como pendente de pagamento, e entra nos indicadores do Dashboard do ADM/Gestão."
    },
    {
      icone: "📋", titulo: "Meus Atendimentos", mockup: "tabela",
      texto: "Histórico dos atendimentos já registrados, com filtro por mês e ano.\n\nNo topo você vê cartões resumo: quantidade de atendimentos, total de horas, valor pendente e valor já pago. Abaixo, a lista mostra cada atendimento com data, criança, local, horas, valor e o selo \"Pago\" ou \"Pendente\". Tela apenas de consulta."
    },
    {
      icone: "📄", titulo: "Comunicado Diário", mockup: "form-etapas",
      texto: "Formulário em 4 passos sobre o dia da criança na escola:\n\n1. Entrada e Interação\n2. Autonomia e Higiene\n3. Recreio e Socialização\n4. Agenda e Recados\n\nSelecione a criança, informe o horário de chegada, marque as opções pedidas em cada passo e, no último, escreva o conteúdo trabalhado em sala, tarefa de casa, avisos urgentes e observações. Use \"Continuar →\" e \"← Anterior\" para navegar, e \"✓ Enviar Comunicado\" no final.\n\nDica: o comunicado vai primeiro para a supervisora revisar antes de chegar à família — preencha com cuidado, principalmente os avisos urgentes.",
      reflexo: "O comunicado enviado aqui vai primeiro para a Supervisora revisar; depois que ela enviar para a família, ele aparece no Portal da Família, na aba Diário."
    },
    {
      icone: "📬", titulo: "Meus Comunicados", mockup: "tabela",
      texto: "Histórico dos comunicados diários que você enviou.\n\nNo topo aparecem cartões com o total de comunicados, quantos estão \"Em revisão\" e quantos já foram \"Enviados para família\". Cada comunicado mostra a criança, a data e o status. Se a supervisora deixar uma observação, ela aparece destacada em azul. Assim que a supervisora enviar para a família, o status muda para \"✓ Enviado\" sozinho na tela, sem precisar atualizar a página. Tela apenas de consulta."
    },
    {
      icone: "📅", titulo: "Minha Escala", mockup: "escala",
      texto: "Seus horários de atendimento da semana (Segunda a Domingo), agrupados por faixa de horário (ex: \"13:00 – 13:30\"). Dentro de cada faixa, mostra quais crianças, serviços e profissionais estão envolvidos.\n\nNavegue entre os dias da semana, veja o total de atendimentos da semana e confira a legenda de cores dos serviços no final. Tela apenas de consulta."
    },
    {
      icone: "📜", titulo: "Protocolos", mockup: "protocolos",
      texto: "Diretrizes de conduta da sua função. Abra um protocolo para ler o conteúdo completo e clique em \"Confirmar leitura\" para registrar que você está ciente — depois de confirmado, fica marcado com a data.",
      reflexo: "Ao confirmar a leitura, o ADM passa a ver seu nome (e a data) na lista de confirmações desse protocolo."
    },
    {
      icone: "📢", titulo: "Mural", mockup: "mural",
      texto: "Mural de avisos da equipe. Os avisos fixados (📌) aparecem sempre no topo. Tela de consulta."
    },
    {
      icone: "📚", titulo: "Materiais Adaptados", mockup: "abas",
      texto: "Biblioteca de materiais pedagógicos adaptados para as crianças atendidas, com 3 abas:\n\n• Acervo — materiais já aprovados disponíveis para toda a equipe. Use a busca por título, matéria ou série.\n\n• Meus Materiais — materiais que você criou. Clique em \"+ Novo material\" para cadastrar (livro, matéria, série, criança, nível de adaptação e observações), adicione fotos e clique em \"Enviar para revisão\" para a Supervisora avaliar.\n\n• Em Revisão — materiais aguardando avaliação (somente para quem pode revisar).\n\nNíveis de adaptação: Pictogramas/CAA, Leitura Fácil, Texto Ampliado, Resumo Simplificado e Outro.",
      reflexo: "O material que você enviar para revisão aparece para a Supervisora e Gestão avaliarem. Quando aprovado, entra automaticamente no Acervo para toda a equipe usar."
    },
    {
      icone: "🧸", titulo: "Brinquedos", mockup: "tabela",
      texto: "Solicite brinquedos para usar com as crianças nos atendimentos.\n\nClique em \"Nova solicitação\" para abrir o formulário: escolha a criança, o brinquedo (com autocomplete do catálogo) e a urgência. Se o brinquedo não existir no catálogo, ele é adicionado automaticamente.\n\nAcompanhe o histórico das suas solicitações e o status de cada uma: Pendente → Em posse → Devolvido.",
      reflexo: "A Aux. Adm recebe sua solicitação, registra a retirada quando você buscar o brinquedo, e dá baixa quando ele for devolvido."
    },
    {
      icone: "💬", titulo: "Chat", mockup: "chat",
      texto: "Conversas internas. Clique no lápis para iniciar uma nova conversa (atendentes podem falar com ADM e Supervisora). Envie texto, arquivos, imagens ou áudios, e reaja com emojis.\n\n🎥 Videochamada: dentro de uma conversa, toque no ícone de vídeo no topo para abrir uma sala de reunião por vídeo em uma nova aba — um cartão \"Videochamada\" com o botão \"Entrar na reunião\" é enviado automaticamente para a outra pessoa, que pode entrar quando quiser.\n\n🔔 Notificações: na primeira vez que abrir o Chat, toque em \"Ativar\" na faixa azul para receber notificações de novas mensagens (e avisos de reunião) mesmo com o Chat fechado."
    },
  ],
};

const FINANCEIRO: AjudaConteudo = {
  roleLabel: "Financeiro",
  intro: "Aqui você encontra uma explicação rápida de cada tela do menu. Clique em um item para abrir os detalhes.",
  contato: "Ainda com dúvidas? Use o Chat para falar com a Administração.",
  itens: [
    {
      icone: "💰", titulo: "Faturamento", mockup: "financeiro",
      texto: "Controle de Contas a Pagar, Contas a Receber e Empréstimos da clínica. Lance uma nova conta (descrição, categoria, valor, vencimento) e marque como \"Pago\"/\"Recebido\" quando o pagamento acontecer — uma janela abre pra escolher a data real do pagamento (vem com hoje preenchido, mas pode trocar). Tudo fica registrado na Auditoria.\n\nErrou algo em uma fatura de Contas a Receber? Clique em \"Editar\" no card dela — funciona mesmo já recebida, sem precisar excluir e lançar de novo.\n\nA aba Empréstimos controla dinheiro emprestado a colaboradores: escolha quem pegou (CPF vem sozinho, editável), valor total e número de parcelas (o valor de referência de cada parcela é calculado sozinho). Clique em \"Registrar pagamento\" quando descontar do salário — valor, data e número da parcela já vêm sugeridos, mas tudo pode ser editado pra adiantar ou pagar diferente. Anexe o comprovante enviado pelo colaborador e clique em \"Gerar recibo\" pra criar o recibo pronto pra imprimir/salvar em PDF. Quita sozinho quando a soma bater o total.",
      reflexo: "Ao marcar uma conta como Pago/Recebido, o valor entra nos gráficos de receita/despesa do Dashboard do ADM/Gestão."
    },
    {
      icone: "💵", titulo: "Folha de Pagamento", mockup: "financeiro",
      texto: "Controle do pagamento da equipe por período. Acompanhe valores, marque como pago, edite quando necessário e use o ícone da impressora para gerar o holerite de cada colaborador.",
      reflexo: "O pagamento marcado aqui também fica registrado na Auditoria, e o holerite gerado pode ser entregue ao colaborador."
    },
    {
      icone: "🩺", titulo: "Atendimentos Especialistas", mockup: "tabela",
      texto: "Mostra, por mês, quantos atendimentos cada especialista teve: P (presença), F (falta avisada em cima da hora — profissional recebe) e FJ (falta avisada com antecedência — não recebe).\n\nEscolha o mês no seletor do topo. Clique no nome de uma especialista para ver o detalhe de cada atendimento (criança, data, status e o motivo da falta, quando houver). Use essa tela como referência na hora de lançar a Folha de Pagamento.",
      reflexo: "Esses dados vêm do que cada especialista marca em \"Minha Escala\" — não precisa perguntar pra ela quantos atendimentos fez no mês."
    },
    {
      icone: "📋", titulo: "Atendimentos ATs", mockup: "tabela",
      texto: "Mostra, por mês e agrupado por AT, todo atendimento registrado em \"Novo Registro\": criança, local (casa/escola), horas, valor calculado e o relato completo do dia.\n\nAtualiza sozinha assim que o AT enviar um novo registro — aparece destacado em verde por alguns segundos, sem precisar recarregar a página. Use como referência na hora de lançar a Folha de Pagamento.",
      reflexo: "Antes só o próprio AT via esse detalhe em \"Meus Atendimentos\" — aqui o Financeiro acompanha tudo em tempo real."
    },
    {
      icone: "📦", titulo: "Patrimônio", mockup: "abas",
      texto: "Inventário de bens da clínica e histórico de manutenção de equipamentos, com o custo de cada conserto.\n\n• Bens — consulte o que está tombado, com valor de aquisição e custo acumulado em manutenção de cada item.\n\n• Manutenções — acompanhe os chamados abertos pela equipe e o custo de cada conserto.",
      reflexo: "Ao informar um custo de conserto, o sistema lança automaticamente uma Conta a Pagar aqui no Faturamento."
    },
    {
      icone: "📜", titulo: "Protocolos", mockup: "protocolos",
      texto: "Diretrizes de conduta da sua função. Abra um protocolo, leia o conteúdo e clique em \"Confirmar leitura\".",
      reflexo: "Ao confirmar a leitura, o ADM passa a ver seu nome na lista de confirmações desse protocolo."
    },
    {
      icone: "💬", titulo: "Chat", mockup: "chat",
      texto: "Conversas internas. Clique no lápis para iniciar uma conversa, envie texto, arquivos, imagens ou áudios, e reaja com emojis.\n\n🎥 Videochamada: dentro de uma conversa, toque no ícone de vídeo no topo para abrir uma sala de reunião por vídeo em uma nova aba — um cartão \"Videochamada\" com o botão \"Entrar na reunião\" é enviado automaticamente para a outra pessoa, que pode entrar quando quiser.\n\n🔔 Notificações: na primeira vez que abrir o Chat, toque em \"Ativar\" na faixa azul para receber notificações de novas mensagens (e avisos de reunião) mesmo com o Chat fechado."
    },
  ],
};

const AUX_ADM: AjudaConteudo = {
  roleLabel: "Aux. Administrativo",
  intro: "Aqui você encontra uma explicação rápida de cada tela do menu. Clique em um item para abrir os detalhes.",
  contato: "Ainda com dúvidas? Use o Chat para falar com a Administração ou a Gestão.",
  itens: [
    {
      icone: "🗓️", titulo: "Agenda Simone", mockup: "agenda-semana",
      texto: "Organize a agenda semanal da diretora, dividida em dois grupos:\n\n• 🏥 Agenda da Clínica — Atendimento (escolha o local: Clínica, Casa ou Escola, dentro do formulário), Treinamento, Supervisão.\n\n• 🤍 Agenda Pessoal — Espiritual, Atividade Física, Médico, Salão, Pet, Feriado/Livre.\n\nClique num card pra abrir o formulário de novo compromisso (data, horário e \"com quem/o quê\" — pra reunião, é só escrever no título de qualquer categoria). Abaixo, veja a semana inteira com os compromissos já cadastrados; use \"Editar\"/lixeira pra editar ou excluir. Compromissos marcados como \"não realizados\" aparecem em vermelho com um recado pedindo remarcação.\n\nUse \"Copiar pauta\" para gerar um texto com toda a agenda da semana, pronto para colar no WhatsApp.",
      reflexo: "Os compromissos cadastrados aqui aparecem em \"Minha Agenda\" da Simone (Gestão); quando ela marcar um compromisso como \"Não realizei\", você recebe o recado automaticamente pelo Chat para organizar a remarcação."
    },
    {
      icone: "🧸", titulo: "Brinquedos", mockup: "abas",
      texto: "Central de gestão de empréstimos de brinquedos da clínica, organizada em 5 abas:\n\n• Solicitações — pedidos recebidos da equipe (Atendentes, Especialistas, Supervisora e Gestão). Clique em \"Registrar Retirada\" quando a colaboradora vier buscar o brinquedo.\n\n• Em Posse — brinquedos que estão com as colaboradoras. Clique em \"Registrar Devolução\" quando o item for devolvido.\n\n• Histórico — todos os empréstimos encerrados (devolvidos).\n\n• Catálogo — lista de brinquedos cadastrados, com foto opcional. Clique em \"Adicionar ao catálogo\" para incluir novos itens. A lista é retrátil: mostra 8 por padrão e expande com \"Ver todos\".\n\n• Ranking — gráficos de brinquedos mais solicitados, colaboradoras que mais solicitam e crianças que mais usam.\n\nTodas as ações ficam registradas na Auditoria.",
      reflexo: "O catálogo cresce automaticamente quando alguém solicita um brinquedo que ainda não existe — você só precisa confirmar a retirada e a devolução. Cada etapa fica rastreada."
    },
    {
      icone: "📦", titulo: "Patrimônio", mockup: "abas",
      texto: "Inventário de bens da clínica (tombamento) e controle de manutenção de equipamentos, em duas abas.\n\n• Bens — clique em \"+ Cadastrar bem\" para tombar um item novo (nome, categoria, local, valor, fornecedor, foto e nota fiscal). Cada bem recebe um número de tombamento automático. Abra um bem pra ver o histórico de manutenções, o custo acumulado gasto nele, e gerar a etiqueta com QR Code pra imprimir e colar no equipamento.\n\n• Manutenções — chamados de defeito abertos por qualquer colaborador. Abra um chamado pra preencher local do conserto, técnico/fornecedor, custo, nota fiscal, garantia e status.\n\nDar baixa em um bem (perda, quebra irreparável, doação) é uma ação exclusiva do ADM.",
      reflexo: "Ao informar um custo de conserto, o sistema lança automaticamente uma Conta a Pagar no Faturamento."
    },
    {
      icone: "📜", titulo: "Protocolos", mockup: "protocolos",
      texto: "Diretrizes de conduta da sua função. Abra um protocolo, leia o conteúdo e clique em \"Confirmar leitura\".",
      reflexo: "Ao confirmar a leitura, o ADM passa a ver seu nome na lista de confirmações desse protocolo."
    },
    {
      icone: "📢", titulo: "Mural", mockup: "mural",
      texto: "Mural de avisos da equipe, com os comunicados fixados (📌) sempre no topo."
    },
    {
      icone: "💬", titulo: "Chat", mockup: "chat",
      texto: "Conversas internas. Clique no lápis para iniciar uma conversa, envie texto, arquivos, imagens ou áudios, e reaja com emojis.\n\n🎥 Videochamada: dentro de uma conversa, toque no ícone de vídeo no topo para abrir uma sala de reunião por vídeo em uma nova aba — um cartão \"Videochamada\" com o botão \"Entrar na reunião\" é enviado automaticamente para a outra pessoa, que pode entrar quando quiser.\n\n🔔 Notificações: na primeira vez que abrir o Chat, toque em \"Ativar\" na faixa azul para receber notificações de novas mensagens (e avisos de reunião) mesmo com o Chat fechado."
    },
  ],
};

export function getAjudaConteudo(userRole: string, contataFamilia: boolean = true): AjudaConteudo {
  const role = userRole ? userRole.trim().toLowerCase() : "";
  if (role === "adm" || role === "admin") return ADM;
  if (role === "gestao") return GESTAO;
  if (role === "supervisora") {
    if (contataFamilia) return SUPERVISORA;
    return {
      ...SUPERVISORA,
      itens: SUPERVISORA.itens.filter(item => item.titulo !== "Comunicados"),
    };
  }
  if (role === "especialista") return ESPECIALISTA;
  if (role === "familia") return FAMILIA;
  if (role === "financeiro") return FINANCEIRO;
  if (role === "aux_adm") return AUX_ADM;
  return ATENDENTE;
}
