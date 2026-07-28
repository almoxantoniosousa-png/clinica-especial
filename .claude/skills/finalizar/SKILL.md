---
name: finalizar
description: Checklist de fechamento de uma feature/fix no sistema Clínica Abraço — type-check, Ajuda, memória e confirmação antes de commitar/dar push.
---

Ao terminar de implementar uma feature ou correção neste projeto, rode este checklist na ordem abaixo antes de considerar o trabalho pronto. Não pule etapas silenciosamente — se algo não se aplica (ex: não mexeu em UI, não mudou comportamento visível pro usuário), diga isso em vez de simplesmente ignorar.

1. **Type-check**: rodar `npx tsc --noEmit` na raiz do projeto. Corrigir qualquer erro antes de seguir. Se o erro for em `.next/dev/types/routes.d.ts` e não fizer sentido com o código alterado, é arquivo gerado automaticamente — apagar `.next` e reiniciar o dev server regenera.

2. **Ajuda** (`lib/ajudaConteudo.ts`): se a mudança altera algo visível/usável pelo usuário (novo botão, novo campo, novo fluxo, texto que mudou de lugar), atualizar a(s) seção(ões) relevantes — geralmente existem 2-4 versões do mesmo texto (uma por role: ADM, Gestão, Supervisora, AT/Especialista etc.), todas precisam refletir a mudança.

3. **Responsividade**: se a mudança tocou em layout/UI (novo botão no cabeçalho, novo campo em formulário, grid de colunas), verificar mentalmente ou visualmente como fica em tela estreita (320-410px) antes de dar como pronto — não só depois de reclamarem.

4. **Memória do projeto** (`project_pendencias_clinica_abraco.md`, no diretório de memória do Claude): se a mudança resolve ou avança um item já registrado ali, atualizar a entrada correspondente com o resultado e o commit. Se for algo novo relevante pra lembrar entre sessões (decisão, bug de fundo encontrado, pendência que sobrou), adicionar uma entrada nova seguindo o padrão das existentes.

5. **Limpeza**: remover qualquer arquivo de teste, registro de teste no banco, ou processo de servidor temporário criado só pra verificar a feature.

6. **Git**: nunca commitar ou dar push sem confirmação explícita do usuário pra essa mudança específica. Perguntar algo como "commitado?" ou "quer que eu commite e envie?" e só executar depois do "sim". Usar mensagem de commit descritiva (o quê + por quê), sem `--no-verify`.

Reporte ao final, em poucas linhas, o que foi verificado e o que ficou pendente (ex: "não testado ao vivo, sem credencial de X disponível").
