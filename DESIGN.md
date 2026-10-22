---
version: alpha
name: "Central"
description: "Central operacional pessoal com quatro frentes de trabalho e prioridade para a decisão diária."
colors:
  primary: "#146C78"
  on-primary: "#FFFFFF"
  background: "#F3F6F8"
  surface: "#FFFFFF"
  text: "#192C3C"
  muted: "#5B6C7A"
  border: "#CCD7E0"
  danger: "#B42318"
  success: "#206B45"
  warning: "#8A5200"
  jiu: "#4F46A5"
  agency: "#147D74"
  courses: "#9A6700"
  forum: "#5C677D"
typography:
  display:
    fontFamily: "Manrope, system-ui, sans-serif"
  body:
    fontFamily: "Source Sans 3, system-ui, sans-serif"
rounded:
  DEFAULT: "10px"
  control: "6px"
  panel: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  section: "32px"
components:
  button:
    height: "44px"
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.control}"
  input:
    height: "44px"
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
  task-row:
    height: "44px"
    textColor: "{colors.text}"
  mobile-row:
    height: "48px"
    textColor: "{colors.text}"
---

# Central — direção visual

## Entrada web e conta pessoal — 20/10/2026

Escolhas do projeto para a publicação em `/crm/`: preservar a paleta, as fontes locais e a assinatura das quatro frentes. A entrada usa dois painéis no desktop, com identificação à esquerda e acesso Google à direita; no celular, os painéis se empilham. É uma entrada de trabalho, sem métricas ou promessas publicitárias. A conta autorizada foi informada expressamente pelo usuário; composição, texto e acabamento são escolhas do projeto.

A área autenticada mantém a navegação existente e acrescenta uma barra discreta de conta/rede/saída. Fichas usam rotas por hash para abrir diretamente no hosting estático. Downloads exigem sessão e mostram falha sem descartar a tela. Configurações distingue exportação JSON na nuvem de backup SQLite local e oferece notificações somente para o aparelho atual.

Estados incluídos: preparação e falha do acesso Google, conta recusada, ausência de conexão, saída não confirmada, sessão expirada, carregamento de módulo e falha de rota. A página pública não contém registros pessoais; a API exige autorização independentemente da interface.

Inspeção visual local da entrada em 1366×900 e 390×844 concluída, com capturas em `.tooling/implementation/cloud/`. Essas capturas não comprovam login Google ou recebimento de notificações reais.

Status: tokens e telas implementados; inspeção desktop/móvel registrada no relatório de implementação. Preferências do usuário são preservadas abaixo; paleta, nome e composição são escolhas do projeto.

## Preferências expressas pelo usuário

- Interfaces bonitas, bem acabadas e coerentes com a finalidade do produto.
- Uso conjunto de `frontend-design-premium:frontend-design` e `frontend-design-premium:frontend-design-premium`.
- Hierarquia, tipografia, paleta, espaçamento, densidade e componentes definidos antes da implementação.
- Alinhamento, proporções, contraste, legibilidade, ícones e consistência entre telas.
- Conteúdo plausível, componentes compartilhados e decoração com função.
- Estados pertinentes de carregamento, vazio, erro, sucesso, foco e interação.
- Acessibilidade e adaptação aos tamanhos de tela suportados.
- Inspeção visual da interface renderizada antes da entrega, em desktop e celular quando aplicável.
- Preservação da identidade de produtos existentes, salvo pedido de reformulação.

## Overview

Registro: produto operacional, não página de marketing. Público inicial: uma pessoa no Brasil alternando trabalho no computador e consultas rápidas no celular. Idioma pt-BR, fuso São Paulo. A referência concreta é uma mesa de planejamento semanal: compromissos têm lugar no tempo, ações têm próximo passo e cada atividade conserva sua identidade.

Assinatura: **Mapa das frentes**, uma faixa horizontal compacta por frente ativa, inicialmente quatro, cada uma com nome, próxima entrega e pendências relevantes. As cores ajudam a reconhecer a frente; texto e ícone sempre a identificam. A expressividade fica nessa composição; formulários e navegação permanecem familiares.

Não parecer dashboard de métricas genéricas, painel de criptomoedas, site de academia ou CRM corporativo cheio de campos. Evitar grandes cartões de números desconectados, gradientes de destaque, excesso de gráficos, fundo escuro obrigatório ou títulos publicitários.

## Colors

Tokens do frontmatter são a fonte canônica, exportada por `scripts/design-check.mjs` para `src/styles/tokens.css`. Primário petróleo para ações; base cinza azulada para longas sessões; superfície branca; texto azul profundo. Cores das frentes não substituem tons semânticos: vermelho continua significando problema/risco, e verde não identifica receita apenas por cor.

Tema claro na V1. Tema escuro será uma decisão posterior. Texto normal exige contraste mínimo 4,5:1; foco e elementos de controle, 3:1. Bordas suaves não são a única indicação de campo/clicabilidade. Focus ring primário com contorno externo visível em todas as superfícies.

## Typography

Manrope em títulos e nomes de módulos; Source Sans 3 no corpo, formulários e tabelas. Arquivos de fontes locais, sem chamadas a CDN durante uso. Títulos de página 28–32px desktop e 24px celular; subtítulos 20px; corpo 16px com entrelinha 1,5. Tabelas podem usar 14px no desktop; campos e conteúdo principal do celular ficam em 16px.

Valores financeiros usam algarismos tabulares e alinhamento à direita. Rótulos em caixa de sentença, sem caixa alta extensa. Nomes e descrições longos têm truncamento com abertura por toque/teclado, nunca apenas tooltip no hover.

## Layout

Ritmo 4/8/12/16/24/32px. Desktop a partir de 1024px com lateral de 224px; faixa intermediária 768–1023px com navegação recolhida; celular abaixo de 768px com navegação inferior. Validação de referência: 390px, 768px, 1366px e 1920px, incluindo 200% de zoom e teclado virtual.

Desktop distribui Hoje em área principal de ações e faixa lateral de agenda; Mapa das frentes abaixo, ocupando a largura útil. Celular tem uma coluna: foco, agenda, atenção, frentes e resumo financeiro. A prioridade não muda por conveniência de layout.

```text
DESKTOP
┌──────────────┬────────────────────────────────────────────┐
│ Central      │ Hoje       [Todas as frentes] [Buscar] [+] │
│ Hoje         ├──────────────────────────┬─────────────────┤
│ Tarefas      │ Meu foco · 3 prioridades │ Agenda de hoje  │
│ Comercial    │ Próximos passos          │ Horas e eventos │
│ Clientes     │ Precisa de atenção       │                 │
│ Projetos     ├──────────────────────────┴─────────────────┤
│ Agenda       │ Jiu-jítsu  · próxima entrega e pendências  │
│ Financeiro   │ Agência    · próxima entrega e pendências  │
│ Revisão      │ Cursos     · próxima entrega e pendências  │
│              │ Fórum      · tarefas e jornada             │
│ Configurações│ Recebimentos dos negócios · mês atual     │
└──────────────┴────────────────────────────────────────────┘

CELULAR
┌──────────────────────────┐
│ Hoje   [Frente]   [+]     │
│ Meu foco                 │
│ Agenda de hoje           │
│ Precisa de atenção       │
│ Mapa das frentes         │
│ Recebimentos             │
├──────────────────────────┤
│Hoje Tarefas CRM Agenda Mais│
└──────────────────────────┘
```

Wireframes são conceituais, não capturas de interface. A navegação final usa **Comercial**, sem trocar rótulos entre telas; a abreviação CRM acima só indica espaço no desenho.

Uma rolagem principal por página. Tabelas e Kanban podem ter rolagem própria quando necessária, sem prender a altura dos formulários irmãos. Quadro móvel mostra coluna selecionada com total e navegação explícita; lista é a visualização inicial no telefone.

## Elevation & Depth

Superfícies estáticas usam borda e contraste de fundo. Sombra discreta somente em menu, popover e modal sobrepostos. Sem efeito de vidro, sobreposição decorativa ou sombra em todo cartão. Indicador de carregamento em região reservada; não usar skeleton por padrão.

## Shapes

Controles com raio de 6px, cartões 10px e painéis 12px. Pills apenas para status curtos e filtros, não para todos os botões. Ícones Lucide consistentes em tamanho e espessura, acompanhados de texto nas ações importantes.

## Components

Propriedade planejada: `DESIGN.md → exportação de tokens → src/styles/tokens.css → adapter Tailwind/globals → src/components/ui`. O arquivo gerado não será editado manualmente. Validar o mapeamento antes da primeira tela, usando exportador mantido e a versão fixada; sem segundo conjunto de hexadecimais em componentes.

| Tokens | Destino planejado | Consumidores |
| --- | --- | --- |
| `colors.*` | `--color-*` | ações, texto, superfícies, status, frentes e scrollbars |
| `typography.display/body` | `--font-display/body` | títulos/corpo, via fontes locais |
| `rounded.*` | `--radius-*` | botões, campos, cartões, overlays |
| `spacing.*` | `--space-*` | layout e primitives |
| alturas de componentes | recipes compartilhadas | controles e linhas de dados |

O schema usa `components.*.height` para o token nominal de altura; o adapter aplica esses valores como `min-height`, permitindo crescimento por conteúdo e zoom. Cores sem referência nos quatro recipes iniciais continuam pertencendo ao tema, aos estados e às frentes descritos neste documento; não criar componentes fictícios apenas para eliminar avisos de tokens ainda sem consumidor.

Primitives comuns: Button, Field, Select, ContactCombobox, DateField, TimeField, Dialog, Sheet, ConfirmAction, Toast, EmptyState, ConnectionState, DataTable, FilterBar, AreaBadge e StatusBadge. Cada um tem uma implementação mantida, não cópias por tela. Comportamento em [UX-CONTRACT.md](UX-CONTRACT.md).

Select e combobox authored, com popup alinhado e acessível; DateField em pt-BR com digitação dd/mm/aaaa e calendário compartilhado. TimeField em HH:mm com validação e teclado apropriado. Aparência e conteúdo desses popups pertencem ao app. Calendário de agenda usa adapter FullCalendar Standard tematizado pelos mesmos tokens.

Revisão de 20/10: a agenda abre no mês, com dias selecionáveis e indicadores dos compromissos. O painel do dia mantém horários, títulos e acesso à edição legíveis também no celular. Hoje recebe destaque discreto, diferente do dia selecionado; os seletores DateField repetem esse tratamento e usam São Paulo. Salvar um compromisso conduz à data registrada. Essa direção atende à referência expressa do usuário ao Google Agenda, preservando a identidade da Central.

O progresso das tarefas usa contagem, percentual e barra em petróleo, compartilhados entre ficha, lista, quadro e Hoje. O checklist tem linhas clicáveis e feedback de gravação junto aos itens. Preferência expressa do usuário: concluir a tarefa continua sendo uma ação manual; marcar o último item não altera o status. Conclusão manual com itens pendentes permanece visível e não falsifica a barra.

Feedback visual em até 150ms quando há resposta local; animação discreta de 120–180ms, respeitando reduced-motion. Mover um cartão comunica origem/destino sem efeito decorativo. Scrollbars visíveis, com thumb muted, track background e hover primário; forced-colors respeita o sistema.

## Do's and Don'ts

- Dar destaque a ações e compromissos que exigem decisão.
- Mostrar filtro, moeda, período e estado de conexão sem ambiguidade.
- Distinguir prazo, agendamento, previsão e recebimento.
- Usar “Registrar recebimento”, “Criar tarefa” e “Marcar reunião”, mantendo o verbo nas confirmações.
- Nunca sugerir que uma mensagem foi enviada, pagamento processado ou reunião externa criada por registrar dados locais.
- Não sacrificar leitura, foco, teclado e estados em nome de densidade.
- Não fabricar conteúdo real: demonstrações têm identificação e banco separados.

## Verificação

### Fila de movimentos — 22/10/2026

Pedido expresso: fechar a janela de movimento imediatamente, continuar navegando e tentar novamente duas vezes quando o servidor falhar. Escolha do projeto: painel recolhível compartilhado acima do conteúdo, com título da tarefa, destino, estado e tentativa; sem sobrepor navegação ou simular percentual. Paleta e controles existentes. O cartão conserva o estado confirmado e indica movimento pendente até a resposta do servidor. Erros ficam na fila; sucesso não exige modal nem rouba foco. O painel permanece entre telas e adapta sua lista rolável ao celular.

### Tarefas e leitura do mês — 22/10/2026

Pedido expresso: retirar tarefas concluídas da lista principal e mostrar cadastros e conclusões do mês. Escolha do projeto: filtro inicial Em aberto, acesso a Concluídas no seletor compartilhado e faixa compacta com dois totais. Os totais respeitam a frente selecionada, independem dos filtros da lista e usam o mês civil de São Paulo. Conclusões usam completedAt, inclusive de tarefas criadas antes; reabertas deixam de contar. Não há percentual porque cadastros e conclusões podem pertencer a grupos diferentes.

Fontes Manrope e Source Sans 3 são locais. Telas renderizadas são conferidas em 390/768/1366px; testes verificam rascunhos, teclado, popups e ausência de overflow. Resultados e limitações estão em [implementação](docs/reviews/2026-10-20-implementacao.md). Emulação não comprova toque ou instalação em aparelho físico.
