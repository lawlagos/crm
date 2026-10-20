# Central — planejamento de ponta a ponta

**Nova direção confirmada em 20/10/2026:** publicado em `https://lawlagos.github.io/crm/`, com Google Sheets privado, Apps Script e login exclusivo de `lawlagos@gmail.com`. Configuração inicial concluída pelo proprietário às 16:24:07, com abas conferidas e acesso anônimo recusado. Aceite real de login, gravação, sincronização e notificações ainda pendente. Esta decisão substitui o destino exclusivamente local descrito abaixo. Consulte o [plano de publicação](docs/superpowers/plans/2026-10-20-central-publicacao.md) e o [guia da nuvem](docs/cloud-deployment.md). A versão local permanece disponível.

Criado em 19/10/2026; atualizado em 20/10/2026. Status: aplicação implementada, com testes locais e revisão visual; aceite em telefone físico pendente. Evidências e limites no [relatório de implementação](docs/reviews/2026-10-20-implementacao.md).

A proposta é um centro de controle das suas atividades: abrir uma tela e enxergar o que fazer, quem precisa de retorno, onde há compromissos e como estão os recebimentos.

## Suas quatro frentes

| Frente | Organização principal |
| --- | --- |
| Jiu-jítsu | Contatos/alunos, consultorias, sessões, entregas e recebimentos |
| Agência | Leads, clientes, propostas, projetos, entregas e recebimentos |
| Cursos | Interessados, origem Instagram/YouTube/WhatsApp, campanhas e vendas |
| Fórum | Tarefas pessoais de trabalho, prazos e jornada 09h–17h |

## Uso diário

**Hoje** reúne três focos escolhidos, agenda, retornos vencidos, mapa das frentes e recebimentos dos negócios. **Tarefas** oferece lista e quadros por projeto. **Comercial** acompanha oportunidades e próximo passo. **Clientes** conserva o histórico de uma pessoa sem duplicá-la a cada compra. **Agenda** mostra reuniões e execução respeitando sua jornada. **Financeiro** separa previsão, pagamento e saldo.

Exemplo: alguém chega pelo Instagram, conversa pelo WhatsApp, vira oportunidade de consultoria e compra. Você registra o fechamento, cria entregas quando necessário e acompanha as parcelas. A venda aparece como prevista; só vira recebido quando o pagamento é registrado.

## Decisões tomadas para você

- Um usuário, português do Brasil, reais e horário de São Paulo.
- Base única no computador, compartilhada com o telefone pela rede local.
- Sem login e sem publicação nesta versão.
- Cadastro manual e abertura do WhatsApp por botão; sem captura ou envio automáticos.
- Interface clara, com fundo cinza azulado, ações em petróleo e identificação discreta das quatro frentes.
- V1 com tarefas, projetos, CRM, recebimentos, agenda, recorrência simples, revisão semanal, exportação, backups e PWA.
- Despesas, automações externas, login e acesso remoto depois de validar a rotina real.

No celular, o computador precisará estar ligado e acessível na mesma rede privada. A instalação exige HTTPS local confiável. Sem servidor, o app informa indisponibilidade; não finge salvar nem mantém fila oculta.

## Ordem de construção

1. Organização: base, visual, tarefas e projetos.
2. Comercial e dinheiro: contatos, oportunidades, venda e recebimentos.
3. Rotina integrada: agenda, recorrência, Hoje e revisão semanal.
4. Uso diário confiável: backup/restore, PWA, testes e acabamento.

Cada marco entrega um fluxo utilizável. A V1 só fica completa após os quatro. O avanço será medido por critérios de aceite, sem estimativas de prazo inventadas.

M1–M3 foram implementados em base de demonstração isolada. M4 possui backup/recuperação e PWA testados localmente; a instalação e troca de dados com telefone físico continuam pendentes. O plano mantém os itens sem evidência específica abertos, sem confundir código existente com aceite completo.

## Resultado das revisões

As duas rodadas foram realizadas em 20/10/2026 por revisores diferentes. Foram corrigidos os contratos de parcelas/reabertura de venda, vínculos entre agenda e tarefas, identidade das recorrências e ordem das tabelas no banco. Configurações ganhou tarefa responsável; design e documentação de instalação foram ajustados. A rechecagem final não encontrou bloqueio documental remanescente. Achados, correções e limites estão no [registro das revisões](docs/reviews/2026-10-19-planejamento.md).

Próxima etapa de aceite: experimentar a rotina e validar HTTPS/instalação no telefone real seguindo [primeiro uso](docs/onboarding.md). Não foi publicado nenhum site nem criada integração externa.

## Documentação completa

| Documento | Conteúdo |
| --- | --- |
| [Produto](PRODUCT.md) | Pedidos, premissas, escopo e requisitos R01–R11 |
| [Especificação completa](docs/superpowers/specs/2026-10-19-central-design.md) | Telas, fluxos, regras, dinheiro, agenda e aceite |
| [Plano de implementação](docs/superpowers/plans/2026-10-19-central.md) | 13 tarefas com arquivos, contratos, dependências e testes |
| [Arquitetura](docs/architecture.md) | Stack, banco, API, integridade, PWA e recuperação |
| [Direção visual](DESIGN.md) | Tokens, tipografia, layout e preferências preservadas |
| [Contrato de experiência](UX-CONTRACT.md) | Navegação, estados, conflitos e acessibilidade |
| [Pesquisa](docs/research/2026-10-19-referencias.md) | Fontes oficiais e opiniões identificadas |
| [Qualidade](docs/quality.md) | Verificações e diferença entre planejado e testado |
| [Primeiro uso](docs/onboarding.md) | Roteiro local, telefone e recuperação |
| [Duas revisões](docs/reviews/2026-10-19-planejamento.md) | Achados, correções e resultado das rodadas consecutivas |

O toolkit permanece modular. A execução usou agentes reutilizados por área, arquivos separados e revisão independente; a política econômica está em AGENTS.md. Não há promessa percentual de economia de tokens. Preferências suas e escolhas do projeto continuam separadas.
