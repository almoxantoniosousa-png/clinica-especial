# Sistema de Gestão Clínica Abraço
## Documentação para a Direção

**Data:** Julho de 2026  
**Versão do sistema:** Produção ativa  
**Endereço de acesso:** https://clinica-especial.vercel.app

---

## 1. Visão Geral

O **Sistema de Gestão Clínica Abraço** é uma plataforma web completa desenvolvida sob medida para a clínica, substituindo planilhas, cadernos e aplicativos genéricos por uma solução unificada que organiza toda a operação clínica em um único lugar.

O sistema funciona em qualquer dispositivo (celular, tablet ou computador) com acesso à internet, sem necessidade de instalar nenhum programa. Pode inclusive ser instalado como aplicativo no celular (PWA), funcionando como um app nativo.

---

## 2. Tecnologia e Infraestrutura

| Item | Solução |
|------|---------|
| Plataforma | Web (funciona em qualquer navegador) |
| Hospedagem | Vercel — servidor global, com certificado de segurança HTTPS |
| Banco de dados | Supabase (PostgreSQL) — servidor em São Paulo, Brasil |
| Código-fonte | GitHub (repositório privado) |
| Autenticação | Supabase Auth — login com e-mail e senha, proteção por papel de usuário |
| Custo de infraestrutura | Gratuito no plano atual (Vercel Hobby + Supabase Free) |

---

## 3. Perfis de Acesso (Papéis)

O sistema possui **8 perfis** distintos, cada um com acesso restrito ao que lhe é pertinente:

| Perfil | Quem usa | O que acessa |
|--------|----------|--------------|
| **Administrador (ADM)** | Direção / TI | Controle total do sistema |
| **Gestão** | Coordenadora (Simone) | Crianças, equipe, agenda, relatórios, financeiro, escala |
| **Supervisora** | Supervisora clínica | Comunicados, revisão de materiais adaptados |
| **Especialista** | Psicólogo, fonoaudiólogo etc. | Escala, prontuários, relatórios de evolução |
| **Acompanhante Terapêutico (AT)** | ATs de campo | Registro de atendimento, formulário escolar, escala, materiais |
| **Financeiro** | Setor financeiro | Contas, folha de pagamento |
| **Auxiliar Administrativo** | Aux. administrativo | Agenda da diretora, brinquedos |
| **Família** | Responsáveis pela criança | Portal da família (somente leitura) |

---

## 4. Módulos e Funcionalidades

### 4.1 Autenticação e Segurança
- Login com e-mail e senha para todos os perfis
- Cada usuário acessa **apenas** o que seu perfil permite (RLS — Row Level Security)
- Recuperação de senha por e-mail
- **Auditoria completa:** toda ação realizada no sistema é registrada com data, hora, usuário e descrição (quem criou, editou ou excluiu cada registro)

---

### 4.2 Gestão de Crianças
- Cadastro completo: nome, data de nascimento, diagnóstico (CID), escola, série, plano de saúde, responsável, alergias, medicamentos, observações
- Controle de modalidade (liminar, convênio, particular)
- Número de processo judicial (quando aplicável)
- Valor da sessão configurável por criança
- Vinculação da equipe de cada criança (AT principal, especialistas)

---

### 4.3 Gestão de Colaboradores
- Cadastro de **Acompanhantes Terapêuticos (ATs)** com CPF, RG, data de nascimento, endereço, WhatsApp, formação, especialidade e registro profissional
- Cadastro de **Especialistas** (psicólogos, fonoaudiólogos, fisioterapeutas, etc.) com os mesmos dados
- Gestão de escolas parceiras

---

### 4.4 Escala de Atendimentos
- Visualização semanal da escala por AT/Especialista
- Sábado e domingo incluídos (com destaque visual em âmbar)
- Escala acessível por: Administrador, Gestão, Supervisora, AT, Especialista

---

### 4.5 Registro de Atendimentos (AT)
- AT registra cada atendimento com: criança, data, horário de início e fim, tipo de atendimento e observações
- Valor da sessão calculado automaticamente (R$30/hora como padrão, configurável)
- Histórico completo de atendimentos por AT e por criança

---

### 4.6 Comunicado Diário (Formulário Escolar)
- Formulário multi-etapas que o AT preenche ao final de cada dia com a criança na escola
- Cobre: presença, atividades realizadas, comportamento, intercorrências e observações
- Gestão e Supervisora acompanham em tempo real

---

### 4.7 Prontuários e Relatórios de Evolução
- Especialistas criam e mantêm prontuários por criança
- Relatórios de evolução periódicos
- Histórico completo de registros clínicos

---

### 4.8 Portal da Família
- Área exclusiva para o responsável da criança (acesso separado)
- **Diário:** resumo do dia enviado pela equipe
- **Momentos/Fotos:** registros fotográficos compartilhados pela equipe
- **Evolução:** acompanhamento do progresso terapêutico da criança
- **Avisos:** comunicados da clínica para a família

---

### 4.9 Chat Interno
- Conversas privadas entre membros da equipe
- Cada perfil pode contatar apenas quem é pertinente à sua função (controlado automaticamente)
- Envio de imagens e arquivos diretamente no chat
- Reações a mensagens (emojis)
- Indicadores de digitação em tempo real
- Indicadores de leitura (✓ enviado / ✓✓ lido)
- **Videochamada** integrada
- Notificações push (celular recebe mesmo com o app fechado)

---

### 4.10 Mural de Comunicados
- Mural interno para avisos gerais da equipe
- Publicação por Administrador, Gestão e Supervisora
- Toda a equipe visualiza na área principal

---

### 4.11 Protocolos de Conduta
- Publicação de protocolos e diretrizes de conduta
- Confirmação de leitura obrigatória: cada colaborador confirma que leu e compreendeu
- Gestão e Administrador acompanham quem confirmou e quem ainda não leu

---

### 4.12 Materiais Adaptados
- Acervo digital de livros e materiais adaptados (CAA, pictogramas, leitura fácil, texto ampliado)
- **Fluxo de aprovação:** Rascunho → Em Revisão → Aprovado (ou Ajustes solicitados)
- AT cadastra e envia para revisão; Supervisora/Gestão aprova
- **Busca integrada de pictogramas ARASAAC:** AT busca imagens diretamente pela plataforma sem precisar sair do sistema
- Fotos dos materiais físicos via câmera do celular
- Reaproveitamento: acervo fica disponível para toda a equipe

---

### 4.13 Sistema de Brinquedos
- Catálogo de brinquedos disponíveis na clínica
- Solicitação, retirada e devolução pelos ATs
- Controle de disponibilidade e histórico de empréstimos
- Ranking de brinquedos mais utilizados

---

### 4.14 Requisições de Compra
- AT ou equipe solicita compra de material/produto
- 6 status de acompanhamento: Pendente → Em análise → Aprovado/Negado → Em compra → Concluído
- Administrador responde com observações e atualiza o status
- Histórico completo de todas as requisições

---

### 4.15 Módulo Financeiro
- **Contas a pagar e a receber:** registro, vencimentos, baixa de pagamentos
- **Folha de pagamento:** geração mensal por colaborador
- **Relatórios financeiros:** resumo por período
- Acesso restrito ao perfil Financeiro e Administrador

---

### 4.16 Agenda da Diretora (Simone)
- Agenda gerenciada pelo Auxiliar Administrativo
- Simone visualiza seus compromissos organizados
- Histórico de reuniões e anotações

---

### 4.17 Painel de Auditoria
- Registro automático de **todas** as ações críticas no sistema
- Campos registrados: data/hora, usuário, e-mail, ação (criou/editou/excluiu), tabela e descrição do que foi alterado
- Acesso exclusivo do Administrador
- Permite rastrear qualquer alteração feita por qualquer pessoa em qualquer momento

---

### 4.18 Notificações Push
- Notificações automáticas em tempo real, mesmo com o sistema fechado no celular
- Exemplos: novo relatório de evolução, nova mensagem no chat, comunicado publicado

---

### 4.19 Central de Ajuda
- Guia de uso por perfil, disponível dentro do sistema
- **Materiais Adaptados** com passo a passo específico para a equipe de ATs

---

## 5. Diferenciais do Sistema

| Característica | Benefício |
|---------------|-----------|
| Desenvolvido sob medida | Fluxos e vocabulário específicos da Clínica Abraço |
| Mobile-first | Funciona perfeitamente no celular dos ATs em campo |
| Acesso por papel | Cada pessoa vê exatamente o que precisa, sem excesso de informação |
| Rastreabilidade total | Toda ação é auditada; nada se perde ou é alterado sem registro |
| Sem custo de licença | Infraestrutura gratuita no plano atual |
| Privacidade dos dados | Banco de dados em servidor no Brasil (São Paulo) |
| Sem instalação | Funciona no navegador, sem depender de app store |
| Pode ser instalado | Opcionalmente, pode ser "instalado" como app no celular (PWA) |

---

## 6. Números do Projeto

- **Mais de 55 telas e módulos** desenvolvidos
- **199 versões entregues** (commits no histórico)
- **8 perfis de acesso** com permissões independentes
- **25+ tabelas** no banco de dados
- Prazo de desenvolvimento: contínuo, em parceria direta com a clínica

---

## 7. Acesso e Suporte

- **URL de produção:** https://clinica-especial.vercel.app
- **Repositório de código:** GitHub (privado — acesso mediante solicitação)
- **Banco de dados:** Supabase — painel disponível em supabase.com
- **Atualizações:** novas funcionalidades são publicadas automaticamente via integração GitHub → Vercel
- **Suporte:** em desenvolvimento contínuo com a equipe da clínica

---

*Documento elaborado em julho de 2026.*  
*Sistema desenvolvido em parceria com a Clínica Abraço — ABA Núcleo de Intervenção Comportamental.*
