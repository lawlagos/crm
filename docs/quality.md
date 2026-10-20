# Qualidade e critérios de aceite

Estado atual: aplicação implementada e verificada localmente. Evidências, comandos, correções e limites em [implementação](reviews/2026-10-20-implementacao.md). Instalação em aparelho físico e matriz completa de acessibilidade continuam pendentes.

## Rastreabilidade

| Requisito | Tarefas | Evidência exigida na implementação |
| --- | --- | --- |
| R01 Visão geral | T04/T10/T13 | Contadores abrem exatamente a lista correspondente |
| R02 Trabalho | T04 | Captura, classificação, conclusão, reabertura e persistência |
| R03 CRM | T05/T07 | Contato único, oportunidades independentes e próximo passo |
| R04 Entregas | T04/T07 | Fechamento/projeto/parcelas atômicos, reabertura integral, rollback e replay |
| R05 Agenda | T08 | Fuso, conflito, frente/projeto coerentes com tarefa, capacidade por união, prazo distinto e ICS |
| R06 Financeiro | T01/T02/T06/T07/T10 | Centavos, parcial, estorno, parcelas protegidas, fechamento invalidado fora dos totais e classificação estável por frente |
| R07 Rotinas | T09/T10 | Índice estável de ocorrência, edição sem duplicar exceções e checklist semanal persistente |
| R08 Celular | T03/T12/T13 | Layout e instalação no aparelho como evidências distintas |
| R09 Dados | T01/T11 | Backup consistente, restore e exportação segura |
| R10 Confiabilidade | T02/T06/T12/T13 | Origem, concorrência e offline sem falso sucesso |
| R11 Experiência | T03/T13 | Teclado, foco, estados e comparação de telas |

Premissas configuráveis de PRODUCT.md ficam em T10: frentes, horários e limite de trabalho iniciado, com validação de arquivamento em todos os domínios. M1–M3 usam base de demonstração; uso como registro único começa após backup/restore e aceite de M4.

## Testes e inspeção visual

Dinheiro/transações recebem testes de domínio e integração com banco descartável. Jornadas entre módulos recebem E2E. Componentes compartilhados recebem testes de interação/acessibilidade; evitar snapshots que apenas espelhem a implementação.

Clock injetável para virada do dia, fevereiro, dia 31, mês sem dados e estorno posterior. Fixtures são fictícias e isoladas; testes nunca usam banco real do usuário.

Na implementação, inspecionar telas renderizadas em 390/768/1366px e largura ampla quando pertinente. Cobrir loading, vazio, sem resultados, sucesso, validação, erro de rede, conflito, offline, popup aberto, conteúdo longo, teclado e zoom 200%. Comparar telas irmãs. Emulação não comprova instalação PWA em aparelho real.

Auditoria estática premium, lint de DESIGN.md e comandos configurados serão usados conforme o artefato existente; nenhuma auditoria estática substitui screenshots e execução.

Para integrações, distinguir arquivo instalado, descoberta pelo cliente e execução real. Uma conexão cadastrada não prova resposta do serviço; uma resposta HTTP não prova carregamento na conversa.

O toolkit disponibiliza referências locais para tarefas futuras:

- `.tooling/vibe-coding-toolkit/docs/prompts/03-multi-agent-code-review.md`
- `.tooling/vibe-coding-toolkit/docs/prompts/13-security-review.md`
- `.tooling/vibe-coding-toolkit/docs/prompts/14-harness-evaluation.md`
- `.tooling/vibe-coding-toolkit/docs/prompts/15-harness-improvement.md`

Carregar esses procedimentos somente quando pertinentes. Validar links, cobertura R01–R11/T01–T13, contratos e coerência entre documentos. As duas revisões consecutivas foram concluídas em 20/10/2026 e estão registradas em [revisões](reviews/2026-10-19-planejamento.md), com achados, correções e rechecagem. Não inventar rodadas adicionais sem motivo concreto.

Na fase de planejamento, foram conferidos links e rastreabilidade R01–R11/T01–T13; o lint de DESIGN.md registrou nove avisos de cores sem referência nos quatro recipes iniciais. A implementação acrescentou testes reais de domínio, integração e navegador, build, auditoria premium e capturas renderizadas. Consulte o relatório para a saída atual; testes em aparelho não foram realizados.
