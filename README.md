# Centro de Custos (React Native + Expo)

Aplicativo móvel para gestão de centros de custo (Valença, CNA, Cabrália) com cinco módulos principais: Equipamentos, Financeiro, Pedidos, Funcionários e Contratos. Desenvolvido em React Native + Expo + TypeScript.

## Fluxo Geral do Aplicativo

```mermaid
flowchart TD

%% ========================
%% SELETOR GLOBAL
%% ========================
A0([App Inicial]) --> A1[Selecionar Centro de Custo<br>(Valença / CNA / Cabrália)]

%% ========================
%% MENU PRINCIPAL
%% ========================
A1 --> B1[Equipamentos]
A1 --> B2[Financeiro]
A1 --> B3[Pedidos]
A1 --> B4[Funcionários]
A1 --> B5[Contratos]


%% ============================================================
%% MENU 1 — EQUIPAMENTOS
%% ============================================================
subgraph EQUIPAMENTOS
direction TB

B1 --> E1[Lista de Equipamentos]
E1 -->|Adicionar| E2[Novo Equipamento<br>(nome, marca, ano, data da compra)]
E1 -->|Selecionar Equipamento| E3[Detalhes do Equipamento]

E3 --> E4[Despesas do Equipamento]
E3 --> E5[Documentos do Equipamento]
E3 --> E6[Fotos do Equipamento]
E3 --> E7[Revisões do Equipamento]

%% SUBAÇÕES
E4 --> E4a[Adicionar Despesa]
E5 --> E5a[Adicionar Documento]
E6 --> E6a[Adicionar Foto]
E7 --> E7a[Adicionar Revisão]

end


%% ============================================================
%% MENU 2 — FINANCEIRO
%% ============================================================
subgraph FINANCEIRO
direction TB

B2 --> F0[Financeiro com 3 Abas]

F0 --> F1[Recebimentos]
F0 --> F2[Despesas]
F0 --> F3[Fechamento de Contas]

%% RECEBIMENTOS
F1 --> F1a[Lista de Recebimentos<br>Filtrar por período]
F1a --> F1b[Adicionar Recebimento]

%% DESPESAS
F2 --> F2a[Lista de Despesas<br>Filtrar por período]
F2a --> F2b[Adicionar Despesa]

%% FECHAMENTO
F3 --> F3a[Selecionar mês/ano]
F3a --> F3b[Ver totais:<br>Recebimentos, Despesas, Saldo]

end


%% ============================================================
%% MENU 3 — PEDIDOS
%% ============================================================
subgraph PEDIDOS
direction TB

B3 --> P1[Lista de Pedidos<br>Filtrar por período]
P1 --> P2[Novo Pedido]
P1 -->|Selecionar| P3[Detalhes do Pedido]

P3 --> P4[Situação:<br>Orçamento pendente / enviado]
P3 --> P5[Seção de Orçamento]

P5 -->|Enviar Orçamento| P6[Upload de Arquivo<br>Documento do orçamento]
P6 -->|Após upload| P4

end


%% ============================================================
%% MENU 4 — FUNCIONÁRIOS
%% ============================================================
subgraph FUNCIONARIOS
direction TB

B4 --> FU0[Selecionar Equipamento]
FU0 --> FU1[Lista de Documentos<br>(Funcionário + Equipamento)]
FU1 --> FU2[Adicionar Documento de Funcionário]
FU1 --> FU3[Remover Documento]

FU2 --> FU2a[Escolher Funcionário]
FU2 --> FU2b[Nome do documento]
FU2 --> FU2c[Data do documento]
FU2 --> FU2d[Upload do arquivo]

end


%% ============================================================
%% MENU 5 — CONTRATOS
%% ============================================================
subgraph CONTRATOS
direction TB

B5 --> C1[Selecionar mês/ano<br>Filtrar]
C1 --> C2[Lista de Contratos]
C2 --> C3[Novo Contrato]
C2 -->|Selecionar| C4[Detalhes do Contrato]

C4 --> C5[Documentos do Contrato]
C5 --> C6[Adicionar Documento<br>(nome, data, categoria)]
C5 --> C7[Remover Documento]

end
```