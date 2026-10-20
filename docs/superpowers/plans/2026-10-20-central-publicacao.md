# Central na internet, sem custo recorrente

## Destino confirmado

O usuário autorizou a publicação em `https://lawlagos.github.io/crm/`, com Google Sheets privado e Apps Script, admitindo somente `lawlagos@gmail.com`. Preservar o Finanças da Casa e a aplicação local. Não ativar faturamento ou serviço pago.

## Arquitetura e contratos

- Reaproveitar os componentes React existentes em uma entrada estática Vite, com navegação por hash. A URL base é `/crm/`; fichas podem abrir diretamente, sem depender de servidor de rotas.
- O navegador envia POST `text/plain` ao novo Apps Script. Envelope: `{action, session?, request?}`. Sucesso: `{ok:true,data}`; falha: `{ok:false,error:{code,message,fieldErrors?,status?}}`. A ação `api` recebe `{path,method,body?}` e conserva os contratos atuais `/api/*`.
- Login: `action:'login'`, `request:{idToken}`. Retorno `{session,email,expiresAt}`. Sessão revogável, hash armazenado no servidor, expiração fixa; validar a identidade Google e o e-mail permitido no servidor, a cada sessão. `logout` revoga. Somente o cliente OAuth público entra na configuração publicada.
- Domínio portado para TypeScript sem Node/SQLite em `cloud/domain.ts`. Exporta `createInitialState(now)`, `executeCommand(state,name,input,meta,context)` e `queryApi(state,path,method,body,context)`. Contexto `{now:string,uuid:()=>string}`. Estado `{tables:Record<string,Record<string,unknown>[]>}`; nomes de tabelas SQL existentes, campos DTO camelCase. O domínio trabalha apenas no estado em memória; não efetua I/O.
- Persistência e autenticação em `cloud/server/**`, controladas pelo integrador. Abas por entidade, cabeçalho `id,json`, preservando IDs e versões. Sob um único ScriptLock: ler estado, verificar recibo/CAS, executar domínio, salvar somente linhas alteradas e o recibo na mesma chamada Sheets batchUpdate. Falha de validação não grava nada. Resultado de commit incerto deve ser reenviado com o mesmo operationId.
- Notificações: service worker e inscrições exclusivos de `/crm/`. Web Push direto do Apps Script, sem Firebase ou plano pago. Texto genérico, sem nomes, valores ou conteúdo privado no endpoint público. Permissão explícita por aparelho; teste físico será distinguido de testes locais.
- Backup remoto é uma exportação JSON autenticada. O backup SQLite e a recuperação local continuam disponíveis na versão local, sem fingir compatibilidade entre formatos.

## Responsáveis e ordem

1. Integrador: contratos, acesso externo, transporte, autenticação, persistência, empacotamento e publicação.
2. Agente de serviços: somente `cloud/domain.ts`, seus auxiliares de domínio e `tests/cloud/domain*`; portar todos os comandos/consultas e invariantes financeiras. Sem escrita em autenticação, storage ou pacote.
3. Agente de interface: somente `web/**` (exceto `web/transport.ts`), ajustes compartilhados de UI necessários e testes estáticos de UI; preservar Next local. Usa as duas skills frontend e registra a direção visual. Sem pacote/lockfile, servidor ou domínio.
4. Integrar e verificar: autenticação, lote atômico/recibo, dinheiro/estornos/reabertura, conflitos, rotas estáticas, exportações, estados offline e PWA. Inspecionar desktop e celular renderizados.
5. Publicar nova planilha/script/repositório, conferir Pages e endpoint reais. Login/consentimento e entrega em telefone só recebem aceite com evidência real.

## Registro de execução

- [x] E-mail e endereço confirmados pelo usuário.
- [x] Referência Finanças da Casa lida, sem alterações.
- [x] Navegador verificado: GitHub e Google sem login; solicitação de login enviada ao usuário enquanto a preparação continua.
- [x] Domínio e testes portados.
- [x] Entrada estática e login implementados e inspecionados; OAuth real ainda sem aceite.
- [x] Servidor Apps Script e persistência atômica testados em harness; upload/implantação lidos de volta na API Google.
- [x] Publicação Pages concluída e conferida: HTTP 200 e botão Google real renderizado.
- [ ] Autorização/configuração do servidor pelo proprietário e gravação real em dois aparelhos.
- [ ] Notificação entregue em aparelho autorizado.

Não marcar itens como concluídos por existir código ou configuração. Registrar comandos, resultados e bloqueios concretos no relatório da migração.
