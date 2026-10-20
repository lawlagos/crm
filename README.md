# Central — gestão das frentes de trabalho

Destino web: **https://lawlagos.github.io/crm/**, com Google Sheets privado e Apps Script, acesso somente à conta autorizada. A migração e a publicação são verificadas separadamente da versão local. Consulte o [guia de implantação](docs/cloud-deployment.md) e o [plano da migração](docs/superpowers/plans/2026-10-20-central-publicacao.md).

Aplicativo local para tarefas, projetos, CRM, recebimentos e agenda de jiu-jítsu, agência, cursos e fórum. Implementado com o [Vibe Coding Toolkit](https://github.com/soumatheusgomes/vibe-coding-toolkit), em modo modular para Codex.

**Comece pelo [planejamento completo](PLANEJAMENTO.md).** Requisitos em [PRODUCT.md](PRODUCT.md) e tarefas executáveis no [plano de implementação](docs/superpowers/plans/2026-10-19-central.md).

- [AGENTS.md](AGENTS.md): instruções de trabalho e preferências do usuário.
- [DESIGN.md](DESIGN.md): preferências visuais confirmadas e futuras decisões de design.
- [docs/setup.md](docs/setup.md): instalação, fontes, verificações e limites.
- `.agents/skills/`: Ponytail, revisão, auditoria, dívida técnica, ajuda e Caveman.
- `.tooling/vibe-coding-toolkit/`: referência local dos guias, prompts e templates; excluída do Git.

Para executar no Windows com Node 22.22 ou superior:

```powershell
npm ci
npm run db:migrate
npm run build
npm start
```

Abra **http://127.0.0.1:3000**. A base nasce vazia, com quatro frentes e preferências iniciais. Dados ficam em `%LOCALAPPDATA%\Central\data`, fora do projeto. Para experimentar separadamente, use `npm run db:migrate -- --demo` e `npm run dev -- --demo`.

Tarefas, projetos, comercial, financeiro, agenda, recorrências, revisão semanal, CSV, backup e recuperação estão implementados. Testes locais e limites observados estão no [relatório de implementação](docs/reviews/2026-10-20-implementacao.md). Instalação em telefone real permanece pendente; viewport móvel não comprova esse funcionamento.

Veja [primeiro uso, telefone e recuperação](docs/onboarding.md). Comandos de verificação: `npm run verify`, `npm run test:e2e`, `npm run test:pwa` após build e `npm run design:check`. Nenhum serviço público, login ou envio automático foi criado.

As seis skills locais estão disponíveis no catálogo. O Context7 foi registrado na configuração de usuário do Codex e teve uma consulta real executada pelas ferramentas MCP do cliente em 20/10/2026; evidência e escopo em [docs/setup.md](docs/setup.md).
