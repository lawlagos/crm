# Publicação gratuita — direção solicitada

Em 20/10/2026, o usuário mudou o destino da Central: acesso pela internet, somente sua conta Google, sem custo recorrente. A referência é seu projeto Finanças da Casa, com interface no GitHub Pages, Google Sheets privado e Google Apps Script. Esta decisão substitui a restrição anterior de uso exclusivamente local e sem autenticação; a versão local permanece intacta durante a preparação.

## Referência conferida, somente leitura

- [Repositório](https://github.com/lawlagos/Financas-casa).
- [Implantação](https://github.com/lawlagos/Financas-casa/blob/main/docs/IMPLANTACAO.md): interface estática, endpoint Apps Script, Google Identity e e-mails autorizados nas propriedades do servidor.
- [Acesso.gs](https://github.com/lawlagos/Financas-casa/blob/main/apps-script/Acesso.gs): validação do login Google, verificação de client ID/e-mail e sessões revogáveis.
- [Avisos.gs](https://github.com/lawlagos/Financas-casa/blob/main/apps-script/Avisos.gs): Web Push/VAPID, inscrições por aparelho e acionador agendado. Encontrar esse código não comprova entrega em aparelho físico; criptografia, autorização e envio precisam de testes antes do reaproveitamento.

Nenhum dado, código, configuração ou implantação do Finanças da Casa foi alterado.

## Destino proposto para a Central

| Parte | Destino |
| --- | --- |
| Interface e PWA | GitHub Pages, em caminho próprio da Central; preservar o outro aplicativo |
| Dados | Nova planilha Google privada, com abas por entidade e IDs/versões preservados |
| Comandos e consultas | Novo Apps Script; autenticação e autorização em cada operação |
| Login | Conta Google, somente o e-mail autorizado da Central, configurado no servidor |
| Rotinas e notificações | Acionadores Apps Script e Web Push, adaptando a referência e isolando as inscrições |
| Segredos | Propriedades do script; nenhuma sessão, chave privada ou cópia da base no GitHub |

O usuário confirmou `lawlagos@gmail.com` como único e-mail autorizado e `https://lawlagos.github.io/crm/` como endereço final. A regra é não habilitar um plano pago ou faturamento para atingir esse destino. Execução e contratos em [plano de publicação](../superpowers/plans/2026-10-20-central-publicacao.md).

## Mudanças necessárias

O aplicativo atual depende de Node, rotas Next e SQLite. GitHub Pages serve arquivos estáticos; não executa esse servidor. A interface pode ser reaproveitada, mas consultas, autenticação, rotinas e persistência devem ser adaptadas. Rotas de fichas com IDs em tempo de execução também precisam funcionar no hosting estático. O manifesto e o service worker devem ficar limitados ao caminho da Central.

Preservar as regras existentes de centavos, vínculos, parcelas, estornos, replay e conflito de versões. Uma gravação financeira e seu recibo devem ser confirmados juntos. A implementação em Sheets precisa de validação de versões sob lock e commit em lote; não substituir uma transação por várias escritas independentes em células. Testar falha/reenvio, dois aparelhos e reabertura de venda antes de publicar.

Antes de reaproveitar o acesso, conferir o protocolo navegador/Apps Script, verificação completa da identidade, expiração/revogação e bloqueio de usuário não autorizado. A Central admite somente o usuário solicitado; não copiar a lista de acesso de outro app.

As notificações exigem permissão do aparelho e entrega real testada. Acionadores não são alarmes com garantia de segundo exato. Manter deduplicação, respeitar cotas e não expor informações pessoais em um endpoint público de avisos.

## Fontes oficiais conferidas

- [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages): hosting estático e endereços por repositório; disponibilidade gratuita para repositórios públicos.
- [Cotas do Apps Script](https://developers.google.com/apps-script/guides/services/quotas): limites diários e de execução; sujeitos a mudança. Não prometer uso ilimitado.
- [LockService](https://developers.google.com/apps-script/reference/lock/lock-service) e [Sheets batchUpdate](https://developers.google.com/workspace/sheets/api/guides/batchupdate): execução protegida e atualização em lote, com todas as alterações válidas ou nenhuma aplicada.
- [Web Push no iOS/iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/): suporte para apps adicionados à tela inicial e permissão solicitada por ação do usuário.

Estado atualizado: nova planilha, novo script e repositório criados. Código de migração e entrada estática implementados e em verificação/publicação. Autorização inicial do script solicitada ao proprietário; login, gravação e push em aparelho real ainda não aceitos. Consulte [implantação](../cloud-deployment.md) para os recursos e contratos atuais.
