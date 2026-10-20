# Instruções do projeto

## Contexto e toolkit

- Nova direção solicitada após a entrega local, em 20/10/2026: publicar a Central em `https://lawlagos.github.io/crm/`, com Google Sheets privado, Apps Script e login Google restrito somente a `lawlagos@gmail.com`, sem custo recorrente. Esta instrução substitui o destino anterior exclusivamente local/sem autenticação. Migração implementada; recursos externos e limites em `docs/cloud-deployment.md`, evidências em `docs/reviews/2026-10-20-publicacao.md`. Autorização inicial do script pelo proprietário e aceite real de login, gravação e push devem ser conferidos antes de afirmar que o aplicativo está utilizável. Preservar a versão local e não alterar o Finanças da Casa.
- Produto: Central, gestor local de tarefas, projetos, CRM, recebimentos e agenda para jiu-jítsu, agência, cursos e fórum. Aplicação implementada; estado e limites em `docs/reviews/2026-10-20-implementacao.md`. Comece por `PLANEJAMENTO.md`; regras em `PRODUCT.md` e na especificação vinculada.
- O Vibe Coding Toolkit foi adotado em modo modular. Consulte [docs/setup.md](docs/setup.md) para fontes, revisão, componentes e limites da instalação.
- A referência local está em `.tooling/vibe-coding-toolkit/`. Consulte apenas os guias relevantes à tarefa. Não execute automaticamente os prompts de preparação global ou de criação de aplicativo.
- Reaproveite as skills Superpowers já fornecidas pelo cliente. As skills locais ficam em `.agents/skills/`.
- Use `ponytail` em nível `full` no trabalho de código: escolha a menor mudança que resolva toda a tarefa, preservando requisitos, validação, segurança e acessibilidade.
- Use `caveman` para comunicação concisa em português, sem perder clareza. Documentação, código, comentários e commits mantêm redação normal. Pedidos de explicação completa têm prioridade.
- Consulte Context7 quando houver uma dúvida concreta sobre biblioteca e versão. Use documentação oficial como alternativa quando a conexão não estiver disponível.

## Preferências para interfaces de software

O usuário quer interfaces bonitas, bem acabadas e coerentes com a finalidade do produto. Trate a qualidade visual como parte da entrega.

- Ao criar ou modificar interfaces, use conjuntamente as skills instaladas `frontend-design-premium:frontend-design` e `frontend-design-premium:frontend-design-premium`. Resolva suas localizações pelo catálogo de skills disponível, sem depender de caminhos de versões antigas. Para interfaces nativas, adapte os princípios às convenções da plataforma.
- Antes de implementar, defina uma direção visual coerente: hierarquia, tipografia, paleta, espaçamento, densidade e linguagem dos componentes. Use as referências e preferências do usuário quando existirem; caso contrário, escolha uma direção apropriada ao produto e explique brevemente a escolha. Preserve a identidade de produtos existentes, salvo pedido de reformulação.
- Consulte e mantenha o `DESIGN.md` do projeto para registrar as decisões visuais e preferências confirmadas. Diferencie escolhas do projeto de gostos expressamente declarados pelo usuário.
- Cuide de alinhamento, proporções, contraste, legibilidade, ícones e consistência entre telas. Evite aparência genérica de template e decoração sem função. Use conteúdo plausível e componentes compartilhados; ajuste o acabamento à tarefa, sem transformar uma alteração pontual em reformulação completa.
- Inclua os estados pertinentes de carregamento, vazio, erro, sucesso, foco e interação. Preserve acessibilidade e adapte o layout aos tamanhos de tela suportados pelo produto.
- Antes de concluir, execute e inspecione visualmente as telas alteradas com as ferramentas disponíveis, em desktop e celular quando aplicável. Revise capturas da interface renderizada, corrija os problemas encontrados e confira as alterações. Verificações de código não substituem revisão visual. Se não puder executar essa revisão, informe a limitação sem afirmar que ela foi realizada.

## Execução e verificação

- Leia os arquivos afetados, identifique o escopo e preserve alterações existentes do usuário.
- Prossiga nas etapas já autorizadas; perguntas de status não encerram o trabalho em andamento.
- Delegue tarefas independentes quando útil, com um responsável por arquivo e revisores sem permissão de escrita.
- Verifique as mudanças com os comandos pertinentes e registre resultados reais. Instalação em disco, descoberta pelo cliente e execução bem-sucedida são estados diferentes.
- Não invente comandos de build, lint ou testes antes de existir uma aplicação. Adicione os comandos canônicos quando a stack estiver definida.
- Mantenha modelos, autenticação, permissões e configurações existentes. A instalação de uma skill não autoriza publicação ou execução de suas ações externas.
- Não adicione hooks de Git, bloqueios de push ou exigência de branch como efeito colateral do toolkit.

## Execução econômica com agentes

- Principal integra e decide contratos; no máximo dois auxiliares ativos quando houver trabalho independente útil.
- Sol medium para implementação delimitada; Sol high para domínio financeiro, revisão crítica e UI complexa. Luna high para inventário e consultas simples. Astra somente se um problema concreto exigir escalada.
- Reutilize agentes por área; briefing curto com arquivos, contrato e validação. Evite copiar o histórico inteiro ou iniciar agentes para correções pequenas.
- Um escritor por arquivo. Principal controla package.json/lockfile, migrations compartilhadas, API e integração; revisores somente leem.
- Não alterar configurações globais de modelo nem prometer percentuais de economia. Registrar consumo medido separadamente de estimativas.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
