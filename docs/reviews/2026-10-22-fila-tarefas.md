# Fila de movimentos de tarefas

## Resultado

Confirmar um movimento fecha o modal imediatamente. A fila compartilhada salva uma tarefa por vez e permanece visível ao navegar. O quadro conserva o estado confirmado e sinaliza a pendência; controles da mesma tarefa aguardam sua resolução, enquanto tarefas diferentes podem ser enfileiradas.

Falhas transitórias têm três tentativas totais, separadas por um e dois segundos, sempre com o mesmo payload, versão e operationId. O teste de resposta perdida após commit confirma uma única mudança de versão. Conflitos e validação não repetem automaticamente. Falhas ficam visíveis; resultado incerto oferece Verificar resultado reutilizando o recibo.

A atualização das consultas não bloqueia a próxima escrita. Somente consultas de tarefas, Hoje, projetos e revisão são invalidadas após sucesso. A fila fica acima das rotas e do gate de login web; perda de sessão pausa os envios, e novo login retoma sem perder a operação.

## Verificações

- Suíte global: 169 testes passaram, incluindo 17 do motor da fila.
- Playwright da fila: 11 passaram; um ignorado intencionalmente (arraste em viewport móvel, coberto pelo menu equivalente). Inclui arraste desktop, teclado, navegação/ficha, FIFO, bloqueios por tarefa, dois retries, teto de três, recibos, conflito e pausa/retomada após perda da sessão.
- Playwright de checklist/resumo mensal: 14 passaram. Playwright local: 22 passaram.
- Playwright de login/fluxos cloud existentes: 24 passaram; unitários web: cinco passaram.
- ESLint, TypeScript, builds Next/Vite, tokens e auditoria premium estrita passaram (zero violações).
- Revisão independente encontrou a perda da fila ao expirar login. Provider movido acima do gate, retomada de autenticação adicionada e rechecagem concluída sem bloqueios.
- Capturas de Hoje e quadro em desktop/celular inspecionadas em `.tooling/implementation/task-move-queue/`. A revisão retirou o esmaecimento dos textos de cartões enfileirados para preservar a leitura.

## Limites

A fila vive em memória na aba, não em disco nem no servidor. Navegar internamente e autenticar novamente preservam a fila, mas fechar/recarregar a aba não. Há aviso beforeunload com pendências e bloqueio de saída/atualização da PWA até resolução; navegadores móveis não garantem execução com a aba suspensa. Não aceita novos movimentos offline. Checklist, finanças e demais formulários mantêm o fluxo anterior.

Testes usam servidor de domínio isolado, sem alterar tarefas reais. Não medem a latência do Google nem comprovam background com navegador fechado. Nenhuma alteração de esquema ou implantação Apps Script é necessária.
