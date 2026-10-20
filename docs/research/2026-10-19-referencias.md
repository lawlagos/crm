# Pesquisa para a Central

Consulta: 19/10/2026. Finalidade: fundamentar um app local para um operador com quatro frentes. As decisões abaixo são síntese de projeto, não comprovação de ganhos financeiros ou de produtividade.

## Gestão e CRM — documentação primária

| Fonte | Evidência e uso no plano |
| --- | --- |
| [Trello: Workspace Table](https://support.atlassian.com/trello/docs/workspace-table-view/) | Reúne cartões de vários quadros. Adotamos visão global sobre os mesmos registros. Não dependemos de plano comercial do Trello. |
| [Asana: tarefas em múltiplos projetos](https://help.asana.com/s/article/multi-home-tasks-to-avoid-information-silos?language=en_US) | Alterações de uma tarefa compartilhada aparecem nas visões relacionadas. Inspirou identidade única, sem duplicação ao mostrar Hoje/quadro/projeto. |
| [Pipedrive: atividades](https://support.pipedrive.com/en/article/activities) | Atividades ligadas a contatos/oportunidades distinguem contato realizado, próxima ação e edição. Inspira histórico curto e próximo passo. |
| [Pipedrive: ordenação do pipeline](https://support.pipedrive.com/en/article/how-are-deals-ordered-in-the-pipeline-view) | Prioriza atividades vencidas, de hoje, ausentes e futuras. Adotamos essa ordem na fila comercial. |
| [HubSpot: ciclo de vida](https://knowledge.hubspot.com/records/use-lifecycle-stages) | Contato, oportunidade e cliente são conceitos diferentes. Entrar no grupo não equivale a uma venda; a mesma pessoa pode comprar novamente. |
| [David Allen Company: revisão semanal](https://gettingthingsdone.com/2018/08/episode-43-the-power-of-the-gtd-weekly-review/) | Revisão de ações, agenda, espera e projetos. Usaremos checklist semanal, sem implantar toda uma metodologia obrigatória. |
| [The Kanban Guide](https://kanbanguides.org/the-kanban-guide) | Trabalho iniciado e limites de trabalho em progresso. Aguardando não deve esconder trabalho já iniciado; limite inicial é escolha nossa. |

## Opiniões da comunidade — evidência anedótica

- [Relato em r/CRM](https://www.reddit.com/r/CRM/comments/1s2l5gc/been_managing_my_leads_in_google_sheets_for/): consultor relata follow-ups perdidos e excesso de funções nas ferramentas avaliadas. Hipótese adotada: privilegiar próximo contato e captura rápida. Há promoção de produtos na discussão; promessas comerciais não foram tratadas como fatos.
- [Discussão em r/excel](https://www.reddit.com/r/excel/comments/1lx4ixl/anyone_using_excel_as_a_crm/): usuários discutem simplicidade de planilhas e fragilidade quando manutenção depende de uma pessoa. Hipótese adotada: entrada simples e estrutura previsível com backup. Não há consenso universal sobre planilha versus CRM.

Não adotamos pontuação automática de leads, dezenas de etapas, meta de conversão inventada ou gráfico sem ação associada. A validação dessas escolhas será observar o uso real depois da primeira versão.

## Arquitetura e operação — fontes primárias

| Fonte | Decisão ou limite |
| --- | --- |
| [SQLite: quando usar](https://www.sqlite.org/whentouse.html) | Banco local ao servidor atende clientes pela aplicação; evitar arquivo em filesystem compartilhado. |
| [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) e [armazenamento no navegador](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) | Banco no navegador é por origem e não compartilha automaticamente PC/celular. Não será fonte de verdade. |
| [PostgreSQL: arquitetura](https://www.postgresql.org/docs/current/tutorial-arch.html) | Alternativa com serviço separado; custo operacional não justificado no escopo atual. |
| [Next.js CLI](https://nextjs.org/docs/app/api-reference/cli/next) | Bind deve ser explícito em loopback; não depender do padrão da CLI. |
| [Next.js: segurança de dados](https://nextjs.org/docs/app/guides/data-security) | Validação e proteção de origem continuam necessárias sem login; rotas próprias exigem tratamento equivalente. |
| [Drizzle com SQLite](https://orm.drizzle.team/docs/sqlite/get-started-sqlite) | Integração com driver local. Exemplos de versões RC não autorizam adotar prerelease. |
| [better-sqlite3: API](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md) | Transações e backup online, sem copiar somente arquivo aberto em WAL. |
| [SQLite WAL](https://www.sqlite.org/wal.html) e [isolamento](https://www.sqlite.org/isolation.html) | Um escritor por vez, WAL em disco local e checagem da versão com correção de WAL-reset. |
| [SQLite backup](https://www.sqlite.org/backup.html) e [PRAGMAs](https://www.sqlite.org/pragma.html#pragma_integrity_check) | Backup consistente, integrity_check e foreign_key_check na cópia. |

## PWA e experiência

| Fonte | Decisão ou limite |
| --- | --- |
| [MDN: PWA instalável](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) | HTTPS confiável e manifesto; exceção localhost não transforma IP HTTP da LAN em contexto seguro. |
| [Next.js: PWA](https://nextjs.org/docs/app/guides/progressive-web-apps) | Referência de manifesto, instalação e diferenças de plataforma. |
| [Caddy: HTTPS local](https://caddyserver.com/docs/automatic-https) e [bind](https://caddyserver.com/docs/caddyfile/directives/bind) | CA interna e interface explícita; cada aparelho precisa confiar na raiz. |
| [Apple: confiança em certificados](https://support.apple.com/en-us/102390) | Instalação de perfil e confiança SSL são passos distintos no iPhone. |
| [Chromium: certificados locais](https://chromium.googlesource.com/chromium/src/+/main/net/data/ssl/chrome_root_store/faq.md) | Confiança depende da configuração do dispositivo/navegador. Validar o aparelho real. |
| [web.dev: instalação](https://web.dev/learn/pwa/installation) | Instalação pode diferir de WebAPK/atalho; não prometer comportamento universal em origem LAN. |
| [MDN: Background Sync](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API) | Não depender de sincronização em segundo plano universal; V1 não terá fila de escrita offline. |
| [FullCalendar React](https://fullcalendar.io/docs/react) e [licença](https://fullcalendar.io/license) | Usar calendário mantido e recursos Standard; verificar API da versão estável, sem Scheduler pago. |
| [shadcn para Next.js](https://ui.shadcn.com/docs/installation/next) | Primitives compartilhados com personalização pelo sistema visual da Central. |
| [dnd-kit](https://dndkit.com/) | Reuso de mecanismo de arrastar, sempre acompanhado de alternativa por menu/teclado. |

## Síntese e limitações da pesquisa

As referências de produto sustentam padrões de uso; as técnicas sustentam restrições da plataforma. Dias disponíveis, limite de três focos, etapas comerciais, paleta e recorte financeiro são decisões nossas, marcadas como premissas, não opiniões atribuídas às fontes.

Não foram entrevistados clientes nem medidos ganhos. Não foram executados testes em telefone, banco ou aplicação nesta etapa. As versões exatas de dependências serão resolvidas e fixadas na implementação, com documentação da versão efetivamente usada.

## Conferência técnica em 20/10/2026

- Context7 executado pelo cliente: resolução de FullCalendar para `/llmstxt/fullcalendar_io_llms_txt` e consulta de documentação. A [documentação React](https://fullcalendar.io/docs/react) está identificada como v7; a [migração](https://fullcalendar.io/docs/upgrading-from-v6) confirma mudanças de APIs e dependência de `temporal-polyfill`. Isso confirma o cuidado com versões já previsto, sem instalar dependências nem fixar uma combinação não testada.
- A [documentação WAL do SQLite](https://www.sqlite.org/wal.html) confirma a correção WAL-reset em 3.51.3 e os backports 3.44.6/3.50.7 citados na arquitetura.
- A [documentação de HTTPS local do Caddy](https://caddyserver.com/docs/automatic-https) confirma a necessidade de confiança na CA em cada cliente. Instalação e operação em aparelho continuam pendentes da implementação.

Esta conferência foi dirigida às premissas técnicas acima; não representa nova pesquisa de todos os relatos e produtos citados em 19/10.
