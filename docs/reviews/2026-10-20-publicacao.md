# Central: migração para publicação gratuita

Destino solicitado: `https://lawlagos.github.io/crm/`; acesso exclusivo de `lawlagos@gmail.com`. A aplicação local permanece disponível. O Finanças da Casa foi consultado somente como referência e não foi alterado.

## Implementação e revisão

- Entrada estática React/Vite com rotas por hash, login Google, sessão revogável, downloads autenticados e backup JSON.
- Domínio portado para Apps Script: tarefas, projetos, contatos, comercial, pagamentos/estornos, agenda, recorrência, preferências e revisão semanal.
- Lock, controle de versão e recibos; entidades e recibo no mesmo batchUpdate Sheets. Testado reenvio após resposta perdida e edição concorrente.
- Revisão corrigiu o recibo após substituição do estado pelo domínio, históricos de contato/recebimento, limite de materialização, expiração de sessão além do limite de setTimeout e sintaxe bigint rejeitada pelo parser de upload Google.
- Service worker isolado em `/crm/`, cache público e tela offline; notificações VAPID com texto genérico e deduplicação diária por aparelho.
- Dois agentes reutilizados, com escritores por arquivo; integrador controlou contratos, dependências, autenticação, persistência e implantação. Sem alterações globais de modelo.

## Evidências locais

| Verificação | Resultado observado |
| --- | --- |
| ESLint e TypeScript | Passaram |
| Vitest global | 142 testes, 27 arquivos, passaram |
| Unitários de interface estática | 5 testes, passaram |
| Playwright estático desktop/celular | 10 testes, passaram, com OAuth/API simulados |
| Playwright versão local | 22 testes, passaram; primeira rodada teve colisão de arquivos de trace entre execuções. Diretórios de resultados separados e rodada completa repetida com sucesso |
| PWA local em produção | 1 teste, passou |
| Builds Next, Vite e Apps Script | Passaram; bundle GAS carregado em VM sem Node, Buffer, URL, TextEncoder ou TextDecoder |
| Integridade visual | Entrada, tarefas, configurações e offline inspecionados em desktop e celular; capturas em `.tooling/implementation/cloud/` |
| Design tokens | Conferem com DESIGN.md |
| npm audit em produção | Nenhuma vulnerabilidade; auditoria completa mantém 9 achados em dependências de desenvolvimento |
| Segredos na preparação do commit | Nenhuma ocorrência da chave VAPID privada ou credencial GitHub nos arquivos rastreados |

## Recursos criados e aceite externo

Repositório, Pages, nova planilha e novo script foram criados. Endereços no [guia de implantação](../cloud-deployment.md). A ferramenta oficial confirmou a conta `lawlagos@gmail.com`; isso não substitui o consentimento da execução Apps Script.

Código foi enviado e lido de volta pela API Google, confirmando arquivo Central e função configurarCentral. Após upload, o endpoint público ainda respondeu HTTP 403 antes da autorização/configuração do proprietário. Execução de configurarCentral solicitada ao usuário no editor. Não há evidência de login Google da Central, gravação real em dois aparelhos ou entrega push física até esse ponto.

Publicação Pages e estado final do endpoint devem ser registrados após a verificação externa; testes com mocks não recebem aceite de produção.
