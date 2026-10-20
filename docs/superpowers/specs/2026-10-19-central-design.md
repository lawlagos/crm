# Central — especificação completa

Status: planejamento revisado em duas rodadas em 20/10/2026; resultado em [revisões](../../reviews/2026-10-19-planejamento.md). Fonte de requisitos: [PRODUCT.md](../../../PRODUCT.md). A entrega atual é documentação, não um aplicativo em execução.

## 1. Decisão de produto

Uma central operacional pessoal com CRM integrado. Três alternativas foram consideradas:

| Alternativa | Vantagem | Limite | Decisão |
| --- | --- | --- | --- |
| Quadros separados, como Trello | Familiar e rápido para tarefas | Visão fragmentada de agenda, relacionamento e dinheiro | Oferecer como visualização, não como estrutura isolada |
| CRM de vendas como centro | Bom para contatos e oportunidades | Trabalho do fórum e execução das entregas ficam secundários | Incorporar o funil como um módulo |
| Central com Hoje, frentes e módulos conectados | Reúne decisão diária e operação de cada atividade | Exige regras claras para compartilhar registros | **Escolhida**, com escopo de um usuário |

Um registro aparece em várias visões sem ser copiado. Toda oportunidade, projeto e previsão financeira pertence a uma única frente. Tarefas também, exceto capturas ainda na Caixa de entrada, que podem aguardar classificação sem frente. Um contato pode participar de várias frentes. O filtro global altera a consulta, não a propriedade dos dados.

## 2. Organização e navegação

Desktop: barra lateral com **Hoje, Tarefas, Comercial, Clientes, Projetos, Agenda, Financeiro e Revisão**; Configurações no rodapé. Cabeçalho com seleção de frente, busca e ação **Criar**.

Celular: navegação inferior **Hoje, Tarefas, Comercial, Agenda, Mais**. Mais dá acesso a Clientes, Projetos, Financeiro, Revisão e Configurações. Criar permanece acessível sem cobrir o teclado ou a última linha da tela.

Rotas planejadas: `/`, `/tarefas`, `/comercial`, `/contatos`, `/contatos/[id]`, `/projetos`, `/projetos/[id]`, `/agenda`, `/financeiro`, `/revisao`, `/configuracoes`. Fichas de tarefas e oportunidades têm URL própria, permitindo abrir e voltar com os filtros preservados.

### Tela Hoje: ordem da informação

1. Data, frente selecionada e aviso de indisponibilidade quando houver.
2. **Meu foco:** até três tarefas escolhidas manualmente; o sistema sugere prioridades, mas não decide compromissos.
3. **Acontece hoje:** reuniões, sessões e blocos de execução em ordem de horário.
4. **Precisa de atenção:** tarefas vencidas, retornos comerciais vencidos e oportunidades sem próximo passo.
5. **Mapa das frentes:** uma faixa compacta por frente ativa, inicialmente quatro, com próxima entrega, trabalho iniciado e pendências comerciais quando aplicáveis.
6. **Recebimentos dos negócios:** recebido no mês e saldo vencido. O salário do fórum não entra silenciosamente nesse indicador.

Cada número abre sua lista filtrada. Não incluir gráficos decorativos nem metas inventadas. Um filtro ativo fica sempre visível.

## 3. Tarefas, projetos e caixa de entrada

### Campos e estados

Captura rápida pede apenas título. Sem frente informada, a tarefa fica na **Caixa de entrada**, uma fila de classificação, não um quinto negócio.

Tarefa: título até 160 caracteres, descrição em texto simples até 5.000, frente, projeto opcional, prioridade `baixa/normal/alta`, status, data de prazo opcional, estimativa opcional em minutos, próxima revisão opcional e checklist ordenado. Tags são opcionais. Anexos e comentários colaborativos ficam fora da V1.

Estados: `entrada`, `a_fazer`, `em_andamento`, `aguardando`, `concluida`, `cancelada`. Para sair de entrada, a frente é obrigatória. Canceladas ficam fora do Kanban padrão, acessíveis por filtro. Concluir grava `completedAt`; reabrir limpa esse campo sem apagar o histórico. `startedAt` é preenchido na primeira entrada em andamento e permanece no histórico.

**Aguardando** exige motivo e data de revisão; depois que a tarefa foi iniciada, continua contando no trabalho em andamento. Alertar ao superar limite inicial de três tarefas iniciadas no conjunto das frentes, sem bloquear a operação. Esse limite é configurável e uma premissa de organização, não regra de produtividade universal.

Prazo (`dueDate`) é uma data de entrega. Agendamento é um evento ligado à tarefa. Mover o bloco na agenda não altera automaticamente o prazo nem conclui a tarefa.

### Lista e Kanban

As duas visões usam os mesmos registros. Filtros: frente, projeto, status, prioridade, prazo e texto. Kanban tem carregamento incremental por coluna; não oculta o total. Arrastar altera status; menu **Mover para** oferece a mesma operação por toque e teclado. Ordem inicial por prioridade, prazo e criação; reordenação manual fica fora da V1.

Projeto: nome, frente, contato principal opcional, objetivo, data alvo opcional e estado `ativo/pausado/concluido/arquivado`. Exibir tarefas, próximos eventos, oportunidades e financeiro vinculados. Concluir com tarefas abertas exige opção explícita: mantê-las abertas ou cancelá-las; não apagar registros nem marcar tudo como concluído.

Templates iniciais, acionados pelo usuário: consultoria de jiu-jítsu (avaliação técnica, análise de vídeo, devolutiva, acompanhamento); agência (briefing, início, plano, entregas, relatório); lançamento de curso (oferta, conteúdo, chamada para WhatsApp, abertura, acompanhamento). Templates criam tarefas propostas sem prazos fictícios.

## 4. Contatos, oportunidades e histórico

### Identidades

Contato é pessoa ou organização; nome obrigatório, telefone e e-mail opcionais. Empresas podem ter uma pessoa responsável em campos simples, sem modelagem de organograma. Normalizar e-mail e telefone; sugerir possíveis duplicados pelo contato exato normalizado, sem fundir automaticamente ou impedir telefones compartilhados.

Oportunidade representa um interesse em uma oferta. Campos: contato, frente comercial, nome da oferta, valor estimado opcional, origem informada (`Instagram/YouTube/WhatsApp/indicacao/outro/nao_identificado`), campanha textual opcional, etapa, próxima ação e data, notas e data de encerramento. Não cadastrar todos os seguidores ou membros do grupo automaticamente.

Funil comum inicial: **Novo → Conversando → Proposta enviada → Ganho / Perdido**. É permitido avançar sem passar por todas as etapas. Ganho e Perdido são desfechos, exibidos em listas/contadores separados das colunas abertas. Fórum não recebe oportunidades; frente sem capacidade comercial deve ser rejeitada também no servidor.

Uma oportunidade aberta pode ser capturada sem próxima ação para não travar o cadastro, mas aparece na fila **Sem próximo passo**. Ordenação do trabalho comercial: retornos vencidos, de hoje, sem ação, futuros. Alterar um cadastro não equivale a entrar em contato.

### Conversa e próximo passo

Registrar interação com data, canal, tipo e resumo até 2.000 caracteres. A operação **Registrar contato e próximo passo** salva interação e próximo passo na mesma transação. O histórico é local; não é uma cópia automática do WhatsApp.

O botão **Abrir WhatsApp** abre um endereço de conversa com o telefone validado; o usuário decide o envio no WhatsApp. Links externos permitidos são `https:`; não aceitar `javascript:`. Não haverá envio, leitura de conversas ou scraping de grupos.

### Fechamento sem duplicação

Ao marcar como ganha, abrir formulário com valor acordado, data de fechamento e condição de recebimento. Uma ou mais parcelas devem somar exatamente o valor acordado; divisão automática distribui centavos restantes nas primeiras parcelas. Uma venda de R$ 100,00 em três parcelas resulta em R$ 33,34 + R$ 33,33 + R$ 33,33.

Jiu-jítsu e agência sugerem criar projeto com template; é possível vincular projeto existente. Cursos sugerem vincular uma campanha/projeto existente ou ficar sem projeto, evitando um quadro por comprador. A pessoa vira cliente daquela frente por relacionamento comercial, conservando suas outras oportunidades.

A confirmação cria fechamento e previsões financeiras numa transação, uma vez só. Não registra recebimento automaticamente. O projeto só é criado quando selecionado no formulário. Perda exige motivo de lista (`sem_interesse/preco/momento/sem_retorno/outro`) e nota opcional.

Reabrir oportunidade ganha não é atalho para desfazer dinheiro: bloquear enquanto qualquer parcela tiver recebimento líquido positivo. Após zerar esse saldo, inclusive por estorno, a reabertura confirmada invalida o fechamento (`reversedAt`), cancela todas as suas previsões e devolve a oportunidade a **Conversando**, limpando `closedAt`, numa única transação. O projeto e o histórico permanecem; o usuário decide o estado do projeto. O fechamento invalidado deixa de compor vendas fechadas, e a oportunidade reaberta deixa de compor a conversão por encerramento. Refechamento recebe nova versão de fechamento; a chave de idempotência evita repetir a mesma versão.

## 5. Agenda e capacidade

Eventos: `reuniao/sessao/bloco_de_tarefa/bloqueio`, título, frente, início/fim, fuso, local ou link opcional, contato/projeto/tarefa opcionais e estado `agendado/concluido/cancelado`. Duração inicial sugerida: 30 minutos, editável. Fim deve ser posterior ao início.

Evento, tarefa e projeto vinculados devem pertencer à mesma frente. Se a tarefa tiver projeto, o evento usa esse mesmo projeto quando informado. Uma tarefa ainda sem frente precisa ser classificada antes de ser agendada. Alterar frente ou vínculos depois do cadastro repete essas validações.

Visões dia, semana e mês no desktop; lista do dia/semana no celular, com acesso ao calendário. Prazos de tarefas aparecem como marcadores sem horário, visualmente distintos dos eventos que ocupam tempo. Não contar marcadores de prazo como ocupação.

Jornada do fórum aparece como faixa recorrente 09h–17h, segunda a sexta. No contexto comercial é indisponibilidade; no contexto Fórum é a janela de trabalho. Eventos sobrepostos avisam quais conflitos existem. Permitir salvar conscientemente com confirmação **Agendar mesmo assim**; nunca mover eventos silenciosamente.

Capacidade comercial livre = duração das janelas configuradas menos a **união** dos eventos ocupados que as intersectam. Sobreposições são contadas uma vez, e eventos cancelados não ocupam horário. Não somar todo tempo fora do fórum como disponível.

Reuniões são registros locais: não enviam convite nem criam uma chamada. Disponibilizar exportação `.ics` do evento para uso manual; exportar não sincroniza nem mantém atualizações futuras no calendário externo. Não prometer alarmes com o app fechado; a V1 oferece avisos dentro do aplicativo aberto.

## 6. Financeiro operacional

Uma **previsão** é uma obrigação esperada de recebimento; parcelas são previsões individuais vinculadas a um mesmo fechamento. Pagamentos registram entrada efetiva. Nenhuma dessas entidades é nota fiscal.

Previsão: frente, descrição, contato/projeto/oportunidade opcionais, valor em centavos, vencimento e cancelamento opcional. Estado exibido é calculado: `a_receber/parcial/recebido/cancelado`; **vencido** é uma condição de saldo positivo e vencimento anterior à data local de hoje. Previsões de hoje não são vencidas.

Pagamento: previsão, valor positivo, data efetiva e meio (`pix/transferencia/cartao/dinheiro/outro`). Pagamentos parciais são aceitos; valor superior ao saldo é rejeitado. Meio informa como o pagamento ocorreu, sem acessar conta ou processadora.

Registro confirmado não é editado nem apagado: correções usam **Estornar registro**, com motivo. O estorno pode ser parcial e referencia um pagamento; total estornado não ultrapassa o original. Reabre saldo da previsão. Para desfazer uma venda inteira, estornar seus recebimentos e usar a reabertura da oportunidade descrita no §4; cancelar parcelas isoladamente não desfaz uma venda. Essas ações só corrigem o registro local; não devolvem dinheiro ao cliente automaticamente.

Previsão manual sem histórico de recebimentos pode ser corrigida; após qualquer recebimento, frente, vínculo e valor ficam protegidos, mesmo após estorno total. Nessa situação, uma correção exige estorno/cancelamento e novo lançamento, conservando histórico. Cancelar previsão com recebimento líquido maior que zero é rejeitado.

Parcelas de fechamento têm valor, frente, contato, projeto e fechamento protegidos desde a criação. Não permitem cancelamento isolado nem parcelas adicionais fora do fechamento. Sua soma permanece igual ao valor acordado enquanto o fechamento for válido. Descrição e vencimento podem ser corrigidos com controle de versão, sem alterar o acordo. Para mudar valor ou vínculos, reabrir a oportunidade com saldo recebido líquido zero em todas as parcelas e fechar novamente com novas condições. Séries recorrentes criam previsões independentes, nunca parcelas adicionais de um fechamento.

Valores são inteiros em centavos, de 1 a 9.999.999.999 por previsão; BRL na V1. Não usar ponto flutuante para somas ou parcelamento. Datas de vencimento são datas locais; eventos de recebimento/estorno mantêm instante e fuso, com edição explícita da data efetiva antes da confirmação. Recebimento não pode ter data futura; estorno não pode preceder o pagamento original nem estar no futuro.

### Indicadores com significado

| Indicador | Definição |
| --- | --- |
| Recebido no período | Pagamentos com data efetiva no intervalo menos estornos com data efetiva no intervalo |
| A receber | Soma dos saldos positivos das previsões não canceladas no filtro, independentemente do mês de criação |
| Vencido | Parcela do saldo a receber com vencimento anterior a hoje |
| Vendas fechadas no período | Soma dos valores acordados dos fechamentos válidos pela data de fechamento; não somar parcelas novamente |
| Conversão comercial | Ganhas ÷ (ganhas + perdidas), por data de encerramento no intervalo; sem encerramentos mostrar “—” |

Painel padrão financeiro: **Negócios**, composto pelas frentes comerciais (inicialmente jiu, agência e cursos), incluindo seu histórico quando arquivadas. Seleção **Todas as receitas** inclui também frentes não comerciais, como Fórum quando houver salário cadastrado. A classificação usa o identificador e a capacidade comercial da frente, nunca seu nome ou cor. Rótulos e filtros tornam a diferença visível. Resultados negativos por estorno de recebimento antigo são válidos e devem aparecer.

Não calcular lucro, saldo bancário, ROI, conversão de toda a audiência nem atribuição multicanal sem dados. Origem é a informação cadastrada, não prova de causalidade da venda.

## 7. Recorrência e revisão semanal

Recorrência simples na V1: tarefas semanais, eventos semanais e previsões mensais. Intervalo fixo de uma semana ou um mês; sem editor de regras arbitrárias. Escolher data de início e término opcional. Calendário e horário usam São Paulo. Dia 29/30/31 cai no último dia válido do mês quando necessário, retornando à data original nos meses seguintes.

Gerar ocorrências até 60 dias à frente por rotina local no início do servidor e a cada hora enquanto ele estiver ligado. Ao reiniciar, recuperar períodos não gerados desde o cursor da série, em lotes transacionais limitados, sem apagar o passado. A criação de uma série aceita início retroativo de até 365 dias; esse limite não descarta períodos pendentes de uma série já existente, mesmo após desligamento prolongado. Chave única `(seriesId, occurrenceKey)` torna reexecução inofensiva.

`occurrenceKey` é um índice inteiro iniciado em zero, por semana ou mês contado a partir do período de início original. Esse período e a frequência não mudam após criar a série; dia da semana/mês e horário podem mudar. A identidade não depende da data atual do evento, prazo ou vencimento. Mover uma ocorrência individualmente mantém seu índice ocupado.

Antes de editar a série, concluir sua materialização pendente até o horizonte atual. A edição vale a partir de amanhã em São Paulo: só altera posições cujas datas atual e proposta estejam a partir desse limite e cujos registros não tenham alteração individual, início, conclusão, cancelamento individual ou histórico de pagamento. Posições que não atendam ao critério ficam preservadas e identificadas na prévia, junto à quantidade e às datas alteradas. Não há agendamento de uma revisão da série para uma vigência futura arbitrária na V1.

Reconciliar os registros futuros existentes pelo mesmo índice, conservando IDs e exceções, antes de gerar os ainda ausentes. Uma exceção preservada ocupa a posição mesmo se sua data cair fora do padrão novo. Revalidar versões e elegibilidade na transação de edição; prévia desatualizada exige nova confirmação.

Encerrar série cancela futuras elegíveis pelo mesmo critério; preserva passado, exceções e registros protegidos, listando o que continuará agendado ou a receber. Ocorrências canceladas pelo encerramento conservam a chave, impedindo regeneração. Recorrência cria previsão, nunca pagamento.

Revisão semanal: classificar caixa de entrada; conferir vencidos e aguardando; identificar projetos ativos sem próxima tarefa aberta; conferir comercial sem próximo passo; olhar agenda da semana; revisar saldo vencido; escolher três focos. Checklist persiste por semana ISO; não conclui tarefas nem mascara pendências automaticamente.

## 8. Busca, arquivamento e portabilidade

Busca global por título/nome, telefone e e-mail, limitada a 20 resultados por tipo. Consultas contendo dados pessoais ficam no estado da sessão, não em URL ou log. Filtros não sensíveis ficam em URL. Nenhuma busca envia dados a serviço externo.

Arquivar contato/projeto/frente preserva histórico. Bloquear arquivamento de frente com tarefas/projetos ativos, oportunidades abertas, saldo financeiro positivo, eventos futuros agendados ou séries ativas e mostrar atalhos para resolver os vínculos. Não usar exclusão em cascata para dados de negócio. Reativação é explícita. As quatro frentes iniciais também seguem a regra. Arquivamento de contato/projeto nunca remove pagamentos das consultas financeiras históricas.

Configurações permite renomear, criar, arquivar e reativar frentes, além de ajustar horários e limite de trabalho iniciado. A capacidade comercial é escolhida na criação e fica fixa na V1 para não reclassificar receita histórica. O identificador original do Fórum permanece não comercial mesmo após renomeá-lo. Registros novos não podem usar frentes arquivadas; histórico e financeiro continuam consultáveis. O Mapa das frentes acompanha as frentes ativas.

Exportação: CSV UTF-8 das listas filtradas e backup completo SQLite. CSV escapa delimitadores, aspas e quebras de linha e neutraliza células que possam virar fórmulas em planilhas. Uma exportação parcial não substitui backup. A restauração é uma ferramenta local do computador, sem endpoint remoto destrutivo.

## 9. Segurança, persistência e celular

Sem contas nesta fase. Inicialização padrão em loopback. Acesso móvel requer modo LAN explícito, rede privada confiável, HTTPS com certificado confiável no aparelho e PC ligado. Quem alcançar a porta permitida terá acesso integral: HTTPS protege transporte, não cria autorização. Sem túnel público, encaminhamento no roteador ou deploy.

Banco único SQLite em disco local do PC, fora do repositório e de pastas sincronizadas. Backups consistentes, validação de restauração e conflitos entre duas telas são requisitos da primeira entrega. Ver [arquitetura](../../architecture.md).

Sem servidor acessível: mostrar indisponibilidade e preservar formulário em memória; não exibir lista vazia como se não houvesse dados. Nenhuma gravação offline recebe confirmação ou fica em uma fila invisível. A PWA armazena somente recursos da tela offline, ícones e manifesto; não copia o banco para o telefone.

Fórum: organização pessoal de tarefas e horários, sem integração judicial, anexos processuais, documentos de terceiros ou dados sigilosos no escopo planejado. O aplicativo não substitui sistemas oficiais.

## 10. Jornada completa para validar a versão

1. Abrir base limpa: ver quatro frentes, horário do fórum e estados vazios; nenhuma pessoa ou receita fictícia na base real.
2. Capturar tarefa sem frente, classificá-la em Agência, vinculá-la a projeto, vê-la na lista e no quadro.
3. Cadastrar contato vindo do Instagram, criar oportunidade de consultoria e registrar retorno para amanhã.
4. Vender R$ 100,00 em três parcelas; criar um único projeto quando selecionado; recebido permanece zero.
5. Registrar R$ 20,00 na parcela de R$ 33,34: saldo R$ 13,34. Reenviar a operação mantém um pagamento.
6. Estornar R$ 5,00: recebido líquido R$ 15,00 e saldo R$ 18,34; o histórico permanece.
7. Marcar reunião em horário do fórum: ver conflito e só salvar após confirmação explícita.
8. Agendar tarefa: prazo e status permanecem iguais. Concluir o evento não conclui automaticamente a tarefa.
9. Abrir o registro no PC e celular; uma edição antiga recebe conflito e preserva os valores digitados.
10. Desligar servidor: ver indisponibilidade, sem “Salvo”. Religá-lo preserva dados e permite recarregar.
11. Executar geração recorrente duas vezes: nenhuma ocorrência duplicada.
12. Fazer backup durante uso, restaurar em banco de teste e comparar saldos, vínculos e contagens.

## 11. Evolução depois da primeira versão

**V1.1:** despesas e resultado operacional simples, importação CSV com prévia e deduplicação, templates adicionais e melhoria baseada no uso real.

**V2:** autenticação antes de disponibilização remota, sincronização autorizada de calendários, WhatsApp Business por integração oficial quando aplicável, notificações confiáveis e hospedagem escolhida pelo usuário.

**Somente se surgir necessidade real:** múltiplos usuários, permissões por frente, catálogo avançado, automações extensas, banco PostgreSQL e escrita offline sincronizada. Cada mudança reavalia proteção de dados, backups e custos; disponibilidade de plugin não autoriza conexão ou envio.

## 12. Evidência e referências

Decisões baseadas na solicitação e na [pesquisa documentada](../../research/2026-10-19-referencias.md). Recursos de produtos e relatos comunitários inspiram o desenho; não comprovam ganhos. A [experiência](../../../UX-CONTRACT.md), o [design](../../../DESIGN.md) e o [plano executável](../plans/2026-10-19-central.md) complementam esta especificação sem alterar suas regras.
