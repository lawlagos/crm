# Central no GitHub Pages e Google Sheets

Destino autorizado: `https://lawlagos.github.io/crm/`. Conta admitida: somente `lawlagos@gmail.com`. Não há serviço pago ou faturamento ativado. GitHub Pages, Apps Script e Sheets têm cotas; custo zero não significa capacidade ilimitada.

## Recursos separados do Finanças da Casa

- Repositório: https://github.com/lawlagos/crm
- Nova planilha: https://drive.google.com/open?id=1SZDracllEvwyXsLSsrDGZmuvaxYCxkeYtVtEvzl_gcU
- Novo script: https://script.google.com/d/1htucddQsQhzhELAfZsIMm4PxzhyTF9NigApLydhfjsfk1kIwf896FTVM/edit
- Endpoint: https://script.google.com/macros/s/AKfycbwZ591cwcSKNpVUjYrImaoxvs5UQNd-jYVE-UKcG0AnYe4tZ_GLX6VkV4lCdJ53rtF5/exec

O cliente OAuth público já usado no outro projeto pode ser reutilizado porque a origem autorizada é `https://lawlagos.github.io`. O novo servidor possui sua própria regra de acesso. A lista de usuários, os dados, as sessões e os aparelhos do outro projeto não são copiados ou alterados.

## Primeira autorização do proprietário

No editor do novo script, selecione `configurarCentral` e execute com a conta autorizada. A função cria somente as abas que faltam, preserva os dados existentes e instala dois acionadores: materialização horária e lembrete diário por volta das 08h de São Paulo. O Google solicita consentimento para planilhas, chamadas externas, identidade e acionadores. Essa autorização deve ser feita pelo proprietário; login na ferramenta de implantação não equivale a autorizar a execução do script.

O manifesto habilita o serviço avançado Sheets v4. No projeto Cloud padrão, o Google ativa a API correspondente ao salvar essa dependência. Ela é necessária também para as chamadas REST usadas nas gravações atômicas. Depois de uma atualização do script, recarregue o editor antes de executar a função; não é necessário colar código.

Após autorizar, conferir o endpoint: GET mostra apenas nome e versão; POST sem sessão deve retornar JSON `UNAUTHORIZED`, sem dados. Entrar pela Central com Google e testar uma gravação em dois aparelhos. Não declarar esse aceite com base em mocks ou apenas no upload do código.

## Dados, sessões e gravações

As abas têm `id,json`. Não editar IDs, versões, cabeçalhos ou JSON manualmente. Login é verificado no Google e no servidor; são conferidos audiência, emissor, validade e e-mail verificado. Sessões próprias expiram em 30 dias, ficam com hash no script e são revogadas no servidor ao sair. Em falha de rede, a interface informa que a saída não foi confirmada.

Cada comando verifica versão e recibo sob ScriptLock. Todas as linhas modificadas e o recibo são salvos em um único `spreadsheets.batchUpdate`. Reenvio do mesmo operationId devolve o resultado anterior. Consultas não materializam recorrências. Materialização usa lotes limitados e persiste o cursor sem perder atrasos.

O service worker tem escopo `/crm/`. Cacheia somente arquivos públicos, ícones e a página offline; nenhum registro, resposta da API ou sessão. Sem internet não há gravação nem fila oculta.

## Notificações

Em Configurações, escolher **Ativar neste aparelho** e conceder a permissão do navegador. O teste é enviado somente à inscrição deste aparelho. No iPhone/iPad, adicionar à tela inicial e abrir por lá. Entrega depende do navegador, serviço push, internet e cotas do Google; acionadores não são alarmes com garantia de horário exato.

O lembrete diário é enviado quando existem tarefas abertas com prazo ou revisão até o dia atual. O texto é genérico, sem nomes, valores ou detalhes privados. Uma reserva diária por inscrição evita duplicação; falha de entrega não gera repetição automática indeterminada. Inscrições encerradas pelo serviço (404/410) são desativadas.

## Backup e implantação

O botão **Baixar backup JSON** exporta os dados autenticados para um arquivo privado. Guarde-o fora do repositório. Essa exportação não é um arquivo SQLite e não oferece recuperação automática pela interface. A aplicação local e sua recuperação SQLite continuam disponíveis separadamente.

```powershell
npm ci
npm run test:cloud
npm run test:web
npm run test:e2e:web
npm run build:web
```

O workflow Pages publica somente `dist/web`. A configuração pública fica em `web/public/config.js`; contém somente endpoint, cliente OAuth e caminho. A chave VAPID privada e o bundle de implantação ficam em `.tooling/deployment/`, ignorados pelo Git. `npm run build:apps-script` requer o arquivo privado de configuração nesse diretório. Não imprimir, commitar ou copiar esse arquivo para Pages.

Estado de implantação e testes reais: consultar o relatório de publicação, separado dos testes da versão local.
