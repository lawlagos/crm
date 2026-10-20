# Duas revisões consecutivas do planejamento

Escopo: PRODUCT, especificação, arquitetura, plano de implementação, DESIGN, UX, onboarding, qualidade e pesquisa. Revisores trabalham somente em leitura; o agente principal aplica correções. Não houve implementação de produto.

Revisões retomadas em 20/10/2026. O registro anterior não comprovava sua conclusão; as rodadas abaixo são as efetivamente realizadas nesta revisão.

## Rodada 1 — concluída em 20/10/2026

Revisor independente: `revisao_planejamento_1`, somente leitura. Leu produto, planejamento, especificação, plano, arquitetura, design, UX, onboarding e qualidade. Escala considerada: uma pessoa no Windows e celular na LAN.

| ID | Prioridade e problema concreto | Correção aplicada |
| --- | --- | --- |
| R1-01 | Alta: editar/cancelar parcela isolada permitia divergir do valor fechado; desfazer parcelas não invalidava a venda nos indicadores | Parcelas de fechamento têm valor/vínculos protegidos. Reabertura com saldo recebido líquido zero invalida fechamento, cancela todas as parcelas e atualiza oportunidade numa transação. Cenários em T06/T07. |
| R1-02 | Média: evento podia apontar para tarefa de outra frente | Igualdade de frente e coerência de projeto validadas nos dois lados do vínculo, inclusive nas edições. Cenário em T08. |
| R1-03 | Média: ocorrência identificada pela data podia duplicar após alterar o dia da série, especialmente com exceção individual | Índice estável por semana/mês original, reconciliação de futuros e preservação de IDs/exceções; revalidação da prévia. Cenários em T09. |

Conferência complementar do agente principal:

- Configurações prometidas não tinham tarefa responsável: página, serviço, API e testes atribuídos a T10.
- Frentes configuráveis agora usam identidade/capacidade comercial estáveis; Mapa acompanha frentes ativas e histórico financeiro permanece acessível.
- Corrigida a regra geral de frente obrigatória para respeitar a exceção da Caixa de entrada.
- Corrigidos quatro tokens `minHeight` não reconhecidos pelo schema de DESIGN.md; `height` nominal é mapeado para `min-height`, preservando acessibilidade e crescimento do conteúdo.
- Atualizados setup/README sobre definição do produto e execução real do Context7. Mantida a diferença entre planejamento, código e validação em aparelho.
- M1–M3 explicitados como validação com dados demonstrativos; uso como registro único após M4 e recuperação testada.

Resultado: achados incorporados aos contratos e cenários de aceite. Nenhum código de aplicação foi criado.

## Rodada 2 — concluída em 20/10/2026

Revisor independente diferente: `revisao_planejamento_2`, somente leitura. Examinou os 14 Markdown após as correções da rodada 1 e considerou coerentes os contratos de parcelas/reabertura, frentes, configurações, agenda e identidade das ocorrências.

| ID | Prioridade e problema concreto | Correção aplicada |
| --- | --- | --- |
| R2-01 | Alta: T04 referenciava contacts de T05; T06 referenciava deal_closures de T07. Com FKs ativas, até inserir vínculo nulo pode falhar porque a tabela-pai não existe | Migrations antecipam contacts para T04 e deal_closures para T06; T05 precede T06. Serviços/UI continuam nas tarefas originais. T04/T06 passam a exigir testes da base parcial e upgrade, sem desativar FKs. |

O agente principal reproduziu o problema numa base SQLite em memória: criar projects com FK para contacts inexistente e inserir contactId nulo retornou `no such table: main.contacts`. Trata-se de uma prova isolada de SQLite, não de teste da aplicação.

Na mesma prova reduzida, a ordem corrigida permitiu criar projeto sem contato e previsão sem fechamento, com FKs ativas e zero violações em `foreign_key_check`.

Também foi esclarecida a vigência da edição recorrente: amanhã em São Paulo, preservando posições cujas datas atual/proposta não sejam futuras; materialização pendente termina antes da edição. O limite de retroatividade de 365 dias aplica-se à criação, sem perda silenciosa de períodos na retomada de séries existentes.

Rechecagem pelo mesmo revisor da rodada 2: R2-01 resolvido, alterações de recorrência coerentes com arquitetura/UX/T09 e nenhum bloqueio remanescente encontrado no escopo conferido. Isso encerra a segunda rodada; não constitui teste de uma aplicação.

## Verificações e resultado final

- Links locais dos documentos e cobertura de R01–R11/T01–T13 conferidos por validação documental; nenhum destino ausente, requisito sem mapeamento ou tarefa de implementação marcada como concluída.
- `npx.cmd --yes --package '@google/design.md' designmd lint DESIGN.md`: exit 0, zero erros e nove avisos `orphaned-tokens`. São cores de tema/estado/frente sem referência nos quatro recipes iniciais; sua finalidade e o mapeamento estão documentados em DESIGN.md. Os quatro avisos de `minHeight` inválido foram eliminados.
- Auditor instalado `audit_project.py`, executado sobre a raiz com `--mode strict`: exit 0, zero achados. Sem UI implementada, o alcance é documental/estático; esse resultado não comprova acessibilidade nem aparência renderizada.
- Context7 descoberto e executado pelo cliente; premissas de FullCalendar, SQLite WAL e HTTPS local reconferidas nas fontes oficiais, conforme [pesquisa](../research/2026-10-19-referencias.md).
- Cópia anterior, diff e saídas de validação preservados localmente em `.tooling/planning-review-2026-10-20/`, fora do versionamento. As instruções do projeto e as skills não foram modificadas.

**Resultado:** planejamento revisado, corrigido e pronto para iniciar T01. Permanecem futuras as 13 tarefas, a seleção/instalação das versões compatíveis, build, testes da aplicação, revisão visual e validação em aparelho real. Nenhum código de aplicação, banco real, publicação ou alteração de autenticação foi realizado.
