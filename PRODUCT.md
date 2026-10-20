# Central — produto e escopo

Status: aplicação implementada e em aceite local, com instalação em telefone real pendente. Criado em 19/10/2026; implementação em 20/10/2026. Evidências em [implementação](docs/reviews/2026-10-20-implementacao.md); revisão anterior em [planejamento](docs/reviews/2026-10-19-planejamento.md).

## Objetivo

**Mudança de destino posterior à entrega local (20/10/2026):** o usuário solicitou publicação no GitHub Pages, banco em Google Sheets privado, servidor Apps Script e OAuth Google com acesso somente ao seu e-mail, sem custo recorrente. Também solicitou notificações. Essa direção substitui as restrições anteriores de uso exclusivamente local, sem login e sem publicação; os demais requisitos funcionais permanecem. A referência conferida é `lawlagos/Financas-casa`. [Viabilidade e mudanças necessárias](docs/research/2026-10-20-publicacao-gratuita.md). A versão local permanece existente; a nova publicação ainda não ocorreu.

Dar a uma pessoa uma visão confiável do que fazer, com quem falar, quando se comprometer e quanto recebeu em cada frente de trabalho. O nome de trabalho é **Central**; é uma escolha de projeto, não uma marca aprovada pelo usuário.

## Fatos fornecidos pelo usuário

- Presta consultoria de jiu-jítsu para melhorar a luta dos alunos.
- Presta serviços de marketing digital para clientes.
- É servidor no fórum, com jornada das 09h às 17h.
- Vende cursos em um grupo de WhatsApp, levando audiência de Instagram e YouTube para esse canal.
- Quer tarefas e projetos, leads, faturamento, reuniões e agenda, com visão melhor do conjunto.
- Quer webapp instalável no celular, inicialmente local, sem autenticação e sem publicação.
- Solicitou planejamento completo, pesquisa online e duas revisões consecutivas; delegou as decisões e não quer responder perguntas nesta etapa.

## Premissas adotadas, editáveis

- Um usuário, moeda BRL, interface `pt-BR`, fuso `America/Sao_Paulo`, semana iniciando na segunda-feira.
- Quatro frentes iniciais: **Jiu-jítsu**, **Agência**, **Cursos** e **Fórum**. Poderão ser renomeadas, adicionadas e arquivadas.
- Fórum tem tarefas e compromissos; não tem funil comercial. Receita salarial só existe se cadastrada manualmente.
- Jornada do fórum presumida de segunda a sexta, 09h–17h. Não se presumem feriados nem disponibilidade em todas as outras horas.
- Janelas iniciais de planejamento comercial: segunda a sexta 18h30–20h30 e sábado 09h–12h. São sugestões editáveis, não compromissos criados automaticamente.
- Computador Windows como servidor e fonte única dos dados; telefone conectado à mesma rede privada para acessar os mesmos registros.
- Captura e atualização manuais no início. Não há sincronização automática com WhatsApp, Instagram, YouTube, bancos, sistemas do fórum ou Google Calendar.

## Entrega da primeira versão

| ID | Capacidade | Resultado observável |
| --- | --- | --- |
| R01 | Visão geral | Ver prioridades, agenda, retornos comerciais e recebimentos das quatro frentes sem abrir cada projeto |
| R02 | Trabalho | Capturar, organizar e concluir tarefas em lista e Kanban, com projetos, prazo e bloqueios |
| R03 | CRM | Manter um contato e oportunidades independentes por oferta/frente, com histórico e próxima ação |
| R04 | Clientes e entregas | Converter vendas em atendimento/projeto quando necessário, sem duplicar pessoas |
| R05 | Agenda | Marcar reuniões, sessões e blocos de execução, distinguir horário e prazo, alertar conflitos |
| R06 | Financeiro operacional | Registrar valores previstos, parcelas, pagamentos parciais e estornos, com saldos corretos |
| R07 | Rotinas | Repetir tarefas, compromissos e previsões mensais sem duplicação; revisão semanal guiada |
| R08 | Celular | Usar layout responsivo e instalar a PWA no aparelho compatível com HTTPS local confiável |
| R09 | Dados | Persistir, exportar, fazer backup e restaurar com verificação e preservação do banco anterior |
| R10 | Confiabilidade | Evitar gravações duplicadas, sobrescrita silenciosa entre dispositivos e confirmação falsa offline |
| R11 | Experiência | Navegação consistente, teclado, estados completos e acabamento visual verificado |

## Limites deliberados

Sem login, equipes, multiempresa jurídica, emissão fiscal, contabilidade, conciliação bancária, cobrança automática, envio automático de mensagens, captura de grupos ou gestão processual. O financeiro registra informações; não movimenta dinheiro. Não será chamado de lucro contábil nem de faturamento fiscal.

Despesas, margens, automações externas, autenticação, acesso remoto, notificações push, importação de bases históricas e operação completa offline pertencem à evolução posterior. A primeira versão já contempla todos os pedidos explícitos; essas extensões não são pré-requisitos para começar a usar.

## Critério de valor

Conseguir responder diariamente: **o que merece minha atenção, qual é o próximo passo, quando cabe e como está o recebimento?** Não há promessa de aumento de receita ou economia percentual de tokens.

Critérios detalhados, regras e cenários: [especificação](docs/superpowers/specs/2026-10-19-central-design.md). Sequência executável: [plano de implementação](docs/superpowers/plans/2026-10-19-central.md).
