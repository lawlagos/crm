# Contrato de experiência — Central

Status: implementação em validação local. Intenção visual em [DESIGN.md](DESIGN.md); regras de negócio na [especificação](docs/superpowers/specs/2026-10-19-central-design.md).

## Donos dos comportamentos

| Capacidade | Dono planejado |
| --- | --- |
| Navegação, frente ativa, barra móvel | `src/components/layout/` |
| Campos, selects, datas, validação e erros | `src/components/ui/` |
| Modais, foco, confirmação e feedback | `src/components/ui/` |
| Tabelas, busca, filtros e paginação | `src/components/data/` |
| Sincronização de tela, retry e conexão | `src/lib/query-client.ts` e `src/components/ui/connection-state.tsx` |
| Dinheiro, datas e fuso | `src/lib/money.ts`, `src/lib/time.ts` |
| Integridade, conflito e replay | serviços e `src/lib/commands.ts` |
| Frentes, horários e preferências | `src/features/settings/` e `/configuracoes` |

Não criar variantes locais equivalentes. Diferenças de comportamento precisam de nome e razão de negócio.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Select/Listbox | `src/components/ui/primitives.tsx`, `contact-combobox.tsx` | Radix Select e busca local de contatos | Select simples; contato pesquisável em diálogo | `tests/e2e/shell.spec.ts`, `modules.spec.ts`; teclado e popup na viewport |
| Date | `src/components/ui/date-field.tsx`, `time-field.tsx` | `src/lib/time.ts`, fuso de São Paulo | Data digitável com calendário; hora digitável | Testes de datas e shell; foco restaurado ao fechar calendário |
| Form | `src/components/ui/entity-form.tsx`, `src/components/data/record-form.tsx` | Schemas Zod e versão original do rascunho | Formulário genérico; tarefa/projeto com checklist | E2E de validação, rascunho, conflito e resultado incerto |
| Scrollbar | `src/styles/tokens.css`, `src/app/globals.css` | CSS compartilhado e limites de viewport | Rolagem da página ou lista interna de popup | Capturas 390/768/1366px; página sem overflow horizontal |
| Toast | `src/components/ui/primitives.tsx` | ToastProvider e erros inline do formulário | Sucesso breve; erro persistente junto à ação | E2E e inspeção de estados; região aria-live |
| CRUD | `src/lib/query-client.ts`, `src/components/data/` | `/api/commands`, versão e operationId | Confirmação financeira; edição reversível direta | Integração SQLite; E2E de venda, pagamento, estorno e replay |

## Operações e retorno

| Operação | Durante | Sucesso | Falha |
| --- | --- | --- | --- |
| Criar em lista | botão ocupado com tamanho fixo | fechar formulário, voltar à lista com filtros, destacar item | manter campos e mostrar erro associado |
| Criar pelo botão global | formulário conserva a frente escolhida | voltar à tela de origem com link “Abrir registro” | manter contexto e valores |
| Editar ficha | bloquear envio repetido | permanecer na ficha e atualizar versão | preservar rascunho; conflito oferece recarregar |
| Mover tarefa | indicar cartão pendente | atualizar coluna e totais após confirmação | voltar visualmente à origem e manter mensagem acionável |
| Registrar recebimento/estorno | confirmação com previsão, valor e data | atualizar extrato/saldo com comprovante de registro local | não alterar saldo visual antes da confirmação |
| Arquivar/cancelar | diálogo com objeto e efeitos | preservar histórico; ajustar paginação | exibir vínculos que impedem a operação |
| Criar reunião | mostrar choque de horários antes de confirmar | aparecer na agenda local | preservar horário e explicar conflito/erro |
| Reabrir venda | mostrar parcelas e efeito no fechamento, conforme especificação §4/§6 | atualizar oportunidade, previsões e indicadores juntos | explicar recebimentos que impedem reabrir; preservar histórico |
| Editar/encerrar recorrência | mostrar datas e quantidade, incluindo exceções preservadas, conforme especificação §7 | atualizar apenas ocorrências elegíveis | se a prévia mudou, mostrar nova prévia para confirmação |

Botões **Salvar**, **Cancelar** e **Voltar** têm resultado previsível. Cancelar não salva. Navegação que perde rascunho exige diálogo do app; fechamento real da página pode usar mecanismo nativo de beforeunload. Não interceptar navegação quando não há alteração.

## Consulta e listas

- Busca com botão Limpar acessível; debounce 300ms, Enter imediato, IME-safe e cancelamento de respostas antigas.
- Texto pesquisado fica em memória da sessão para evitar dados pessoais em URLs/logs. Frente/status/período/sort/page ficam em URL. Ao voltar à lista, restaurar esses filtros e a posição quando possível.
- Paginação 25 registros, opções 25/50/100; redefinir página ao filtrar e ajustar após remoção/arquivamento. Sem tabela ilimitada.
- Kanban: 25 por coluna, total visível e **Carregar mais**. Reordenação manual não existe na V1; arrastar muda apenas o status.
- Seleção global de frente não altera registro já aberto. Em formulário pendente, trocar frente exige resolver o rascunho. Vínculos de outra frente não são oferecidos silenciosamente.
- O seletor e o Mapa das frentes acompanham as frentes ativas. Ao arquivar a frente selecionada, voltar para Todas com aviso; o histórico permanece acessível pelos filtros pertinentes.
- Atualização em segundo plano não apaga formulário nem reorganiza o item sob o ponteiro enquanto estiver sendo editado.

## Estados obrigatórios

| Estado | Tratamento |
| --- | --- |
| Carregamento inicial | indicador estável com texto “Carregando…” |
| Vazio real | explicação e ação pertinente: “Nenhuma oportunidade cadastrada. Criar oportunidade” |
| Sem resultados | manter filtros e oferecer “Limpar filtros” |
| Erro de leitura | mensagem e Tentar novamente; não apresentar vazio falso |
| Sucesso | toast acessível breve; mudança permanece visível no registro |
| Validação | erro em texto junto ao campo; foco no primeiro inválido; conservar os valores |
| Resultado de escrita incerto | “Não foi possível confirmar. Verificar resultado”; reutilizar a mesma operação |
| Conflito de versão | “Este registro mudou em outra tela”; não sobrescrever; permitir copiar rascunho e recarregar |
| Servidor indisponível | “Conecte-se à rede do computador e mantenha o servidor em execução”; desabilitar confirmação de gravações |
| Rascunho não salvo | aviso discreto e proteção de saída; não prometer persistência após fechar |
| Rota inexistente | 404 do app com volta para Hoje, sem mensagem técnica |

## Formulários e acessibilidade

`noValidate`, validação própria no cliente e no servidor, labels reais, `aria-invalid` e descrições associadas. Texto de ajuda/erro reserva espaço para evitar saltos. Textareas autoexpandem, sem resize manual que rompa o layout.

Select/combobox/date picker pertencem aos primitives compartilhados. Navegação por setas, Enter, Escape, foco restaurado, popup limitado à viewport e lista rolável. Datas, horas, moeda, placeholders, mensagens e aria labels em pt-BR. `America/Sao_Paulo` não depende do fuso do navegador ou do host.

WCAG 2.2 AA como alvo; teclado completo e alvos de toque de pelo menos 44px. Arrastar sempre tem **Mover para** equivalente; agenda pode ser operada por formulário/lista sem arrastar. Contraste não depende da cor da frente. Modais prendem o foco e tornam fundo inerte; Sheet móvel segue a mesma regra quando modal. Escape não descarta rascunho silenciosamente.

Botões nativos para ação e links para navegação; focus ring visível, hover deliberado, disabled explicado e ícones com nome acessível. Não usar `alert`, `prompt` ou `confirm` do navegador para fluxo de produto. Toast não substitui erro inline.

## Dinheiro e ações protegidas

Recebimento exige prévia do valor, parcela e data. Estorno mostra que altera o registro local e reabre saldo; não envia dinheiro. Cancelamento/arquivamento mostra consequência específica, com foco inicial na opção menos destrutiva. Sem confirmação para cada salvamento reversível.

Não oferecer exclusão definitiva de registros financeiros pela UI. Restauração do banco só pela ferramenta local, com backup prévio. Exportação informa filtro/quantidade e deixa claro quando é parcial.

Parcelas de venda explicam por que valor/vínculos e cancelamento individual estão bloqueados e oferecem acesso à oportunidade. A reabertura segue a especificação §4/§6; não apresentar cancelamento de uma parcela como desfazer a venda inteira.

## Celular e PWA

Mesmo conjunto de dados e regras do desktop. No celular, lista é padrão para tarefas e agenda; Kanban e calendário continuam acessíveis. Barra inferior respeita safe area e teclado virtual. Não usar rolagem horizontal da página; tabelas transformam-se em linhas/cartões com ações alcançáveis.

Sem gravação offline, notificações push ou promessa de sincronização com app fechado. Ao perder rede com formulário aberto, manter o que foi digitado em memória e orientar reconexão. Tela offline estática não exibe dados financeiros ou contatos em cache.

Atualização de PWA avisa e aguarda formulário resolvido. Instruções de instalação variam por plataforma; esconder botão programático quando não suportado e oferecer instrução correta, sem botão morto.
