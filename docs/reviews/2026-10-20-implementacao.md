# Central — implementação e validação local

Data: 20/10/2026. Aplicação implementada em `C:\Users\Windows\crm`, sem publicação, autenticação ou integração externa. A base de demonstração é separada da base real. **Instalação e uso em telefone físico permanecem pendentes.**

## Entrega

T01–T11 possuem código integrado: persistência, comandos atômicos, sistema visual, tarefas/lista/Kanban, projetos/templates, contatos/histórico, funil comercial, fechamento/parcelas, recebimentos/estornos, agenda/capacidade/ICS, recorrência, Hoje, configurações, revisão semanal, CSV e backup/restore. T12 possui manifesto, instalação contextual, atualização protegida por rascunho, offline estático e launcher HTTPS. T13 reúne verificação automatizada, revisão independente e inspeção visual local; não equivale ao aceite do aparelho.

Runtime executado: Node 22.22.0, npm 10.9.4, Next 16.4.2, React 19.3.0, better-sqlite3 13.0.3 com SQLite 3.53.4. FullCalendar React 7.1.3 usa variáveis públicas do tema classic. Dependências exatas no package-lock.json; módulos nativos funcionaram no Windows sem compilação manual.

O toolkit foi usado modularmente: scaffold oficial em staging ignorado, skills existentes, contratos antes de integrar e testes de regressão. Sem instalação global do toolkit, Git hooks ou obrigatoriedade de branch. Este diretório não possui Git; não foi criado commit.

## Agentes e economia

Principal: integração, API, banco, HTTP, backup, runtime/PWA e validação. Agentes reutilizados: domínio base (Sol medium), serviços de domínio e interface (Sol high); Luna high fez inventário do toolkit. Um Sol high independente revisou serviços e UI, sem escrita. Arquivos ficaram com um responsável; package/lockfile tiveram dono único. Não houve um novo agente por tarefa pequena.

Houve dois escritores auxiliares por área. A revisão somente leitura coincidiu brevemente com correções dos dois, chegando a três auxiliares ativos; a política padrão para próximas tarefas limita dois. Serviços críticos e UI extensa justificaram high; inventário e utilitários limitados usaram modelos menores. Essa organização não comprova um percentual de economia; não foi feita cobrança estimada por tabela API para uma sessão do plano Plus.

## Verificações

Os comandos foram executados com bases temporárias ou demonstração, sem fixtures na base real:

| Verificação | Resultado observado |
| --- | --- |
| `npm run verify` | ESLint, TypeScript, 99 testes em 19 arquivos e build de produção aprovados |
| `npm run test:e2e` | 22 testes aprovados, em desktop e viewport móvel, incluindo venda, agenda com conflito, rascunho e GET503 |
| `npm run test:pwa` | Produção: cache apenas de quatro arquivos estáticos, sem cliente no offline, escrita bloqueada sem rede e recuperação ao reconectar |
| `npm run design:check` | Tokens correspondem ao DESIGN.md |
| Auditoria premium strict | Zero erros e zero avisos |
| `npx -p @google/design.md designmd lint DESIGN.md` | Zero erros; nove avisos de tokens não referenciados nos quatro recipes iniciais, usados no CSS de estados/frentes |
| `npm audit --omit=dev` | Zero vulnerabilidades de produção |
| Caddy 2.11.7 | ZIP oficial com SHA-256 conferido; configuração HTTPS validada com `-ValidateOnly`, sem listener LAN |

Logs completos e capturas ficam em `.tooling/implementation/central/`, ignorada pelo Git: `verify-final.log`, `e2e-final.log`, `premium-audit.json` e imagens dos módulos. Relatórios HTML do Playwright ficam em `playwright-report/`.

## Cenários e evidências

| Jornada da especificação | Evidência |
| --- | --- |
| Base limpa, quatro frentes, persistência | database.test e telas vazias renderizadas; nenhuma receita/cliente inserido na base real |
| Captura, classificação, projeto e estados | work.test, tasks.spec; lista e quadro consomem os mesmos IDs |
| Contato e oportunidade com próximo passo | crm.test, modules.spec e fechamento E2E |
| Venda de R$ 100,00 em três parcelas e um projeto | business-flow.spec: 3334/3333/3333 centavos, recebido zero, um projeto |
| Pagamento de R$ 20,00, resposta perdida e replay | E2E intercepta resposta após commit; Verificar resultado conserva um pagamento e saldo de R$ 13,34 |
| Estorno de R$ 5,00 | E2E e integração: líquido R$ 15,00, saldo R$ 18,34, extrato preservado |
| Conflito com jornada do Fórum | business-flow.spec exige Agendar mesmo assim, com fingerprint do servidor |
| Evento vinculado sem alterar tarefa | E2E e calendar.test preservam prazo/status e verificam frente/projeto |
| Edição antiga e rascunho | commands.test e shell.spec preservam versão original e mostram conflito; hardware PC/telefone não testado |
| Indisponibilidade sem falso sucesso | PWA de produção e shell.spec: GET503 não desmonta rascunho nem perde operationId incerto |
| Recorrência repetida e recuperação | routines.test: índice estável, exceções, lote de 100, retomada e prévia confirmada após rollback |
| Backup/restore com saldo e vínculos | backup.test compara sete tabelas comerciais, FKs e resumo líquido após restore em diretório isolado |

## Revisão e correções

A revisão independente encontrou e levou à correção de:

- Defaults Zod em PATCH apagavam campos omitidos; schemas de edição agora preservam dados.
- Troca de frente/contato da oportunidade invalidava previsões; vínculos financeiros históricos impedem a alteração incompatível.
- Arquivar projeto usado por série futura bloqueava geração; séries ativas protegem o projeto. Falha de recorrência não impede tentativa de backup.
- IDs aleatórios gerados dentro de uma prévia revertida mudavam a confirmação seguinte; IDs por série/índice são determinísticos.
- Reconsulta podia trocar versão ou remontar formulário; registro/versão ficam fixados na abertura.
- Fechamento após resposta incerta podia perder a chave de replay; formulários permanecem abertos para verificar resultado.
- GET503 após polling desmontava fichas e revisão; dados anteriores e formulários permanecem montados, com aviso de leitura.

Na integração, também foram corrigidos busca truncada antes da paginação, normalização de instantes adjacentes, leitura de receita do Fórum pela ficha, primeira coluna da semana em segunda-feira e tema FullCalendar 7. Testes relevantes reproduziram falhas antes de confirmar correções.

## Inspeção visual e limites

Inspecionadas telas renderizadas em 390/768/1366px, incluindo Hoje, Comercial, Clientes, Financeiro, Agenda, Revisão, Configurações e formulário. Capturas verificadas incluem lista vazia, funil, seletores, calendário mensal, foco e tentativa de zoom CSS 200%. O ensaio de zoom revelou overflow no cabeçalho; quebra de linha dos controles corrigiu o problema e a captura final não apresentou overflow. Uma falha de consulta local de avisos foi detectada pelo console e corrigida com skipToken; a suíte agora confere console/pageerror nas rotas principais.

Não realizados: aparelho físico, teclado virtual, leitor de tela, matriz completa de zoom do navegador e todos os gestos de arrastar. Testes completos de migrações intermediárias e fault injection em cada etapa do restore não foram executados; checkboxes correspondentes permanecem abertos. Arquivo truncado, checksum errado, schema incompatível, retenção e preservação do saldo foram testados. O launcher não alterou firewall, roteador ou confiança de certificados do sistema.

A auditoria npm completa possui nove advisories transitivos de desenvolvimento, relacionados a drizzle-kit/esbuild e globbing do lint. ESLint 9.39.5 foi mantido por compatibilidade com Next; tentativa de ESLint 10 gerou conflitos de peers e foi revertida. Não houve `audit fix --force`; dependências de produção tiveram resultado zero. Detalhes em `.tooling/implementation/central/npm-audit.json`.

Execução, caminhos dos dados, telefone e recuperação: [primeiro uso](../onboarding.md). O aceite final móvel deve registrar sistema/navegador e comportamento real; viewport emulado não substitui esse registro.
