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

GitHub Pages publicado e conferido: `https://lawlagos.github.io/crm/` respondeu HTTP 200, título Central. A tela de entrada foi aberta no navegador e carregou o botão real do Google Identity com o cliente configurado. O workflow de publicação está disponível em https://github.com/lawlagos/crm/actions/runs/39480178375. Isso confirma a página pública; não comprova login, gravação ou push no servidor ainda pendente de autorização.

## Configuração inicial: erro relatado e correção

Em 20/10/2026, o proprietário executou configurarCentral e recebeu o erro genérico da chamada Sheets. A autorização do script passou a permitir acesso ao endpoint: GET público respondeu HTTP 200 e POST anônimo foi recusado com JSON UNAUTHORIZED/401 antes de ler dados.

A planilha foi conferida via Drive: existe, tipo Google Sheets, não está na lixeira. O manifesto enviado não declarava o serviço avançado Sheets, necessário para ativar automaticamente a API no projeto Cloud padrão do Apps Script. Foi adicionada a dependência Sheets v4; essa configuração foi enviada e lida de volta pela API Google. Também foi encontrado SERVICE_DISABLED na sondagem REST pela credencial de implantação; essa credencial usa o projeto da ferramenta, portanto a sondagem isolada não comprova o motivo HTTP da execução interna original.

A implantação @5 inclui a ativação e erros mais precisos: SERVICE_DISABLED é identificado sem expor o corpo da resposta; outras falhas informam apenas HTTP/status seguro. Novos testes cobrem configuração de planilha vazia, reexecução preservando dados e acionadores, e falha por serviço desativado. Os 45 testes cloud passaram, assim como ESLint, TypeScript e build Apps Script. A configuração real precisa ser reexecutada pelo proprietário para confirmar o resultado; ainda não foi declarada bem-sucedida.
