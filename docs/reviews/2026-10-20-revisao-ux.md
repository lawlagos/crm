# Revisão de UX e funcionalidades — 20/10/2026

## Resultado e diagnóstico

O compromisso informado para 10 de novembro foi localizado na planilha, sem alteração do registro. A consulta diária do backend respeita a data em São Paulo; um teste de regressão confirma sua inclusão no dia correto e a exclusão por filtro de frente incompatível. A agenda anterior abria somente a semana atual e não navegava após salvar um compromisso em outro período. O término também não acompanhava a mudança da data inicial.

A agenda agora abre no mês, permite selecionar o dia e apresenta os compromissos em um painel legível, com indicadores no calendário, navegação de período, semana/lista e destaque de hoje. Salvar conduz à data registrada, inclusive após confirmação de conflito. Filtros de frente/projeto/tarefa ficam explícitos, com ação para removê-los. Mudanças na data inicial acompanham o término quando ele ainda coincidia; eventos multidia são preservados.

O DateField compartilhado marca hoje, distingue seleção/foco, reabre no mês do valor atual e permite navegar entre meses por teclado. As datas usam São Paulo, independentemente do fuso do navegador.

Checklist pode ser marcado diretamente na ficha. Contagem, percentual e barra aparecem também em lista, quadro, Hoje e tarefas do projeto. A conclusão continua manual, conforme resposta do usuário. Concluir/reabrir não altera itens. Tarefa concluída com itens pendentes mantém aviso e progresso real. Sem checklist, o status representa 0/1 ou 1/1.

Gravações mantêm controle de versão e recibos. Na recuperação de conflito, somente o item tentado é reaplicado sobre uma leitura atual. Resposta perdida reutiliza a operação original, sem duplicar a ação ou substituir alterações posteriores. Offline não cria fila. Concluir uma captura sem frente solicita a classificação necessária.

Também foi corrigido o acesso ao cliente recém-criado quando filtros o excluem da lista: a confirmação oferece um link direto, sem inventar um vínculo de frente. A próxima entrega no mapa de frentes usa dd/mm/aaaa. Os callbacks compartilhados de formulários são executados também após confirmar conflitos e prévias de recorrência.

## Cobertura

Testes de navegador exercitam pessoas (validação, criação, edição, arquivamento e reativação), projetos (edição e template), frentes (edição, arquivamento e impedimento por pendências), tarefas/checklist, agenda, filtros comerciais, conversa/próximo passo, venda parcelada, recebimento parcial, estorno e persistência da revisão semanal. Navegação e capturas cobrem Hoje, tarefas, clientes, projetos, comercial, financeiro, revisão e configurações; agenda e seletor têm capturas próprias.

Foram inspecionadas telas renderizadas em desktop e celular emulado. Os cenários de calendário usam Los Angeles e Tóquio no navegador, mantendo São Paulo como fuso do produto. As capturas e logs ficam em `.tooling/implementation/` e `test-results/`, ignorados pelo Git.

Os testes da versão Pages usam transporte isolado e o domínio real em memória. Não equivalem a repetir OAuth ou escrever na planilha de produção. A inspeção de produção foi somente leitura; nomes e conteúdo privado não foram copiados para fixtures ou commits. Backend, autenticação e configuração de notificações não foram alterados nesta rodada.

## Verificações

| Verificação | Resultado |
| --- | --- |
| `npm run lint` / `npm run typecheck` | Passaram |
| `npm test` | 151 testes, 29 arquivos, passaram |
| `npm run test:web` | 5 testes passaram |
| `npm run test:e2e:web` | 34 cenários desktop/celular passaram |
| `npx playwright test --config tests/calendar/playwright.config.ts` | 10 cenários, LA/Tóquio, passaram |
| `npm run test:e2e` | 22 cenários da versão local passaram |
| `npm run test:pwa` | 1 cenário de cache estático/offline passou |
| `npm run build` / `npm run build:web` | Passaram |
| `node scripts/design-check.mjs --check` | Tokens conferem com DESIGN.md |
| Auditor Premium em modo strict | Zero achados estáticos; não substitui testes e inspeção visual |
| `git diff --check` | Sem erros |

O filtro de prazos da agenda também foi corrigido: projeto e tarefa selecionados agora restringem os prazos exibidos, sem misturar tarefas de outros vínculos. O teste reproduziu três prazos indevidos antes da correção e passou com somente o prazo selecionado após o ajuste.

Publicado em [lawlagos.github.io/crm](https://lawlagos.github.io/crm/), commit `9693fca`. O [workflow Pages](https://github.com/lawlagos/crm/actions/runs/39494627348) concluiu build e deploy com sucesso. A conferência HTTP dos assets públicos confirmou a agenda mensal, o checklist, a conclusão manual e o acesso ao cadastro criado; a tela de entrada Google continuou restrita. O backend Apps Script não precisou de nova implantação: as mudanças de produto desta rodada são no frontend.

Uma segunda leitura independente dos callbacks, checklist, conflitos e recuperação não encontrou defeitos materiais adicionais. Isso não representa cobertura exaustiva de todas as combinações de dados ou conformidade WCAG certificada. Toque, teclado virtual, push em aparelho físico e sincronização entre dois aparelhos não foram revalidados nesta rodada.
