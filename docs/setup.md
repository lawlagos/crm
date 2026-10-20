# Instalação do Vibe Coding Toolkit

Preparação realizada em 19 de outubro de 2026, no Windows, para trabalhar neste diretório com Codex. Estado documental e conexão Context7 revistos em 20/10/2026.

## Escopo

Adoção modular conforme o [guia de instalação](https://github.com/soumatheusgomes/vibe-coding-toolkit/blob/main/docs/01-installation.md). O diretório estava vazio. A preparação disponibiliza instruções, skills e documentação, sem definir requisitos de produto ou criar uma aplicação.

O prompt 10 prepara a máquina inteira; o prompt 11 cria um projeto Next.js; o prompt 12 configura uma aplicação existente. Nenhum desses fluxos completos foi executado. A obrigatoriedade dos seis componentes globais descrita no guia pertence ao prompt 10, não à adoção modular.

## Fonte e revisão

- Repositório: <https://github.com/soumatheusgomes/vibe-coding-toolkit>
- Revisão: `790a895304e0c08b70a5b215c9d334f1c86b816c`, de 18/10/2026.
- Cópia local: `.tooling/vibe-coding-toolkit/`, com histórico raso e sem modificações.
- `.tooling/` está no `.gitignore`; a referência não faz parte do código da futura aplicação.
- Documentação de descoberta de skills: <https://learn.chatgpt.com/docs/build-skills>.

## Componentes

| Componente | Estado e escopo |
| --- | --- |
| Codex | Reutilizado; CLI `0.162.0-alpha.17.2` |
| Node.js / npm | Reutilizados; `v22.22.0` / `10.9.4` |
| Superpowers | Já descoberto na sessão; distribuição existente reutilizada |
| Frontend Design e Frontend Design Premium | Já descobertos na sessão; preferências preservadas em `AGENTS.md` e `DESIGN.md` |
| Ponytail | Cinco skills locais instaladas; nível de trabalho `full` registrado em `AGENTS.md` |
| Caveman | Skill de comunicação instalada localmente |
| Context7 | MCP registrado na configuração de usuário do Codex; endpoint público testado |
| Ferramentas de documentos, PDF, apresentações, planilhas e imagens | Capacidades existentes do cliente reutilizadas |
| RTK | Não instalado nesta adoção modular; avaliar quando houver comandos repetitivos que se beneficiem do filtro |
| Graphify | Não instalado; avaliar após existir código relevante para extrair um grafo |
| Aplicação | Next 16.4.2, React 19.3.0, better-sqlite3 13.0.3/SQLite 3.53.4, Drizzle, Radix, Tailwind, Vitest e Playwright instalados; versões no package-lock.json |
| Vercel/PostgreSQL | Não selecionados para a V1 local |
| Sentry, Obsidian e outros serviços | Não selecionados para esta preparação |

## Skills locais

A implementação de 20/10 partiu de `create-next-app@16.4.2` oficial em staging ignorado, adaptado ao banco local. Dependências e scripts estão no package.json. Caddy 2.11.7 está em `.tooling/caddy`, com hash conferido; configuração validada sem listener LAN. Instruções em [primeiro uso](onboarding.md) e evidência em [implementação](reviews/2026-10-20-implementacao.md).

`npm audit --omit=dev` não encontrou vulnerabilidades. A auditoria completa registrou nove advisories de ferramentas transitivas de desenvolvimento; limites no relatório. Não foi aplicado `audit fix --force` para esconder avisos.

Instaladas com o helper oficial da skill `skill-installer`, com destino explícito `.agents/skills/`, usando as fontes oficiais e a referência `main` disponível no momento da instalação:

| Nome | Fonte |
| --- | --- |
| `ponytail` | `DietrichGebert/ponytail`, `skills/ponytail` |
| `ponytail-review` | `DietrichGebert/ponytail`, `skills/ponytail-review` |
| `ponytail-audit` | `DietrichGebert/ponytail`, `skills/ponytail-audit` |
| `ponytail-debt` | `DietrichGebert/ponytail`, `skills/ponytail-debt` |
| `ponytail-help` | `DietrichGebert/ponytail`, `skills/ponytail-help` |
| `caveman` | `JuliusBrussee/caveman`, `skills/caveman` |

Esta é uma instalação de skills, não dos plugins completos. Use os nomes locais, como `$ponytail` e `$ponytail-review`; a documentação upstream também descreve nomes com namespace e hooks de plugins que não se aplicam a esta distribuição. A skill opcional `ponytail-gain` não está instalada; a página de ajuda upstream menciona o catálogo completo.

Não foram instalados proxies, roteadores de modelos ou hooks de inicialização do Ponytail/Caveman. As instruções do projeto expressam o uso das skills, respeitando as regras do cliente e os pedidos do usuário.

## Context7

- Registro: `codex mcp add context7 --url https://mcp.context7.com/mcp`.
- Destino: `~/.codex/config.toml` (usuário).
- Backup preservado: `~/.codex/config.toml.before-vibe-context7.20261019.bak`.
- O comando oficial regravou duas opções de outros MCPs. Seus valores originais foram restaurados; a comparação TOML final confirmou que a única alteração semântica é a adição do Context7.
- A configuração local provisória foi removida após o registro global, evitando duplicação.
- `codex mcp list` confirmou o servidor como `enabled`, com autenticação `Not logged in`.
- O fluxo OAuth automático foi interrompido sem efetuar login. A consulta pública funcionou sem credenciais. Se os limites do serviço exigirem autenticação, usar o fluxo oficial `codex mcp login context7`.
- Na preparação de 19/10, a sessão não ganhou uma nova ferramenta MCP; o teste foi HTTP. Em 20/10, `resolve_library_id` e `query_docs` foram executados pelas ferramentas MCP do cliente e retornaram documentação do FullCalendar. A conexão está descoberta e sua execução foi confirmada nesta sessão.

## Verificações e evidências

- A documentação do checkout passou em `node scripts/validate-docs.mjs`: **614 links/âncoras locais**, destinos dos documentos e configurações JSON verificados.
- Context7 respondeu ao handshake MCP `initialize` como versão `4.4.3`.
- `tools/list` disponibilizou `resolve-library-id` e `query-docs`.
- Uma consulta real resolveu Node.js e recuperou documentação de `fs/promises.readFile` para Node.js 22, com origem em `nodejs.org`.
- Resultados públicos da consulta foram preservados em `.tooling/context7-resolve-result.txt` e `.tooling/context7-query-result.txt`.
- Foram conferidos os seis arquivos `SKILL.md`, seus nomes e a configuração do MCP.
- As seis novas skills apareceram no catálogo do agente de revisão, que carregou `ponytail-review`. Em 20/10, as skills continuaram disponíveis, e a execução do Context7 pelo cliente foi confirmada: biblioteca `/llmstxt/fullcalendar_io_llms_txt`, consulta sobre documentação v7 e dependência Temporal, com fontes em `fullcalendar.io`.
- Build, lint, testes de aplicação e revisão visual não são aplicáveis: não há aplicação ou interface. O scaffold de validação Next.js do toolkit não foi executado e requer Node.js 24 conforme o upstream.

## Atualização e continuidade

Antes de atualizar, confira a origem e o diff, preserve as preferências locais e registre a nova revisão. Atualize a referência local com Git; reinstale skills apenas após revisar mudanças e preservar a versão anterior. O instalador utilizado recusa destinos já existentes.

Produto, escopo e arquitetura já estão definidos em [PLANEJAMENTO.md](../PLANEJAMENTO.md), e as duas [revisões](reviews/2026-10-19-planejamento.md) foram concluídas. O próximo trabalho de produto é executar T01 do [plano](superpowers/plans/2026-10-19-central.md). Essa etapa validará versões, criará o app e registrará seus comandos reais.
