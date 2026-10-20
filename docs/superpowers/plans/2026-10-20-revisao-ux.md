# Revisão funcional e de experiência da Central

## Pedido e direção

O usuário autorizou uma rodada em todo o aplicativo, com correções e publicação no app existente. Prioridades explícitas: localizar o compromisso cadastrado para 10 de novembro, tornar a agenda visual como um calendário mensal com indicadores, destacar o dia atual em todos os seletores de data, permitir marcar checklist diretamente na ficha e exibir contagem/barra de progresso em tarefas.

Preservar a identidade clara da Central, fontes locais, ações em petróleo e cores das frentes. Agenda com mês reconhecível, dia atual distinto do selecionado, indicadores de compromissos/prazos e navegação para o dia. Usar os mesmos controles de data nos formulários. Progresso legível por texto e barra, com alvos grandes para marcar itens e estados de gravação/conflito.

Preservar dados de produção. Ler somente registros/ranges necessários ao diagnóstico; não copiar nomes ou conteúdo privado para GitHub. Testes de escrita devem usar base isolada. Não inventar sessões ou enfraquecer o login para testar o app.

## Responsáveis

- Integrador: diagnóstico e correções de consultas/API da agenda; auditoria dos outros cadastros, formulários/ações compartilhadas, integração, DESIGN/UX-CONTRACT, testes, build e publicação.
- Interface: `src/components/data/calendar.tsx`, estilos próprios da agenda, `src/components/ui/date-field.tsx`, estilos próprios do seletor e testes exclusivos de calendário/data. Não editar CSS global, contrato, pacote ou backend.
- Tarefas: `record-detail.tsx`, `task-list.tsx`, componentes/estilos próprios de checklist/progresso, lógica pura compartilhada e testes exclusivos; eventuais mudanças de regra em work/service e cloud/domain/work, sem editar consultas da agenda ou primitives compartilhados.

Um escritor por arquivo; no máximo dois auxiliares. Reutilizar agentes por área. O usuário confirmou conclusão manual: marcar o último item não muda o status, e concluir/reabrir não altera o checklist. Preservar regras de versão e recibos.

## Verificação e aceite

- Reproduzir o problema de 10/11 em fixture; conferir o registro real e os filtros sem alterá-lo.
- Agenda mensal/dia/lista, navegação a novembro, eventos nas datas corretas, fronteiras inclusivas/exclusivas, timezone São Paulo e fuso diferente no navegador.
- Cadastro/edição de pessoas, projetos, frentes, tarefas, compromisso e vínculos; campos obrigatórios, erros, cancelamento/rascunho, ações com teclado e modo offline.
- Checklist interativo e persistente, progresso 0/10→1/10, caso sem checklist 0/1→1/1, conclusão/reabertura conforme decisão do usuário, conflito e reenvio sem perder outros itens.
- Inspecionar as telas renderizadas em desktop e celular. Rodar lint, typecheck, testes relevantes, builds Next/Vite/Apps Script se afetado, E2E e conferência de design.
- Publicar em Pages e Apps Script quando necessário; conferir o endereço real e o estado da implantação. Registrar o que foi testado e limitações reais, sem afirmar auditoria exaustiva de cada combinação possível.

## Andamento

- [x] Pedido e limites registrados; direção preserva o produto existente.
- [x] Causa do compromisso não visível identificada e corrigida.
- [x] Agenda e seletores de datas revisados.
- [x] Checklist direto e progresso implementados.
- [x] Outros módulos verificados e correções integradas.
- [x] Revisão visual e validação técnica concluídas.
- [ ] Publicação conferida.
