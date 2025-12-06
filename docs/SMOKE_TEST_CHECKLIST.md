# 🧪 SMOKE TEST - CHECKLIST PRÉ-PRODUÇÃO

## 📋 **CHECKLIST COMPLETO ANTES DE PUBLICAR**

Execute este checklist **COMPLETO** antes de enviar o app para as lojas.

---

## ✅ **1. AUTENTICAÇÃO (5 min)**

### **Login:**
- [ ] Login com credenciais válidas funciona
- [ ] Login com senha errada mostra erro apropriado
- [ ] Login com email inválido mostra erro apropriado
- [ ] Loading aparece durante autenticação
- [ ] Redireciona para Dashboard após login bem-sucedido

### **Logout:**
- [ ] Botão de logout funciona
- [ ] Volta para tela de login
- [ ] Dados são limpos (não fica logado)

### **Persistência:**
- [ ] Fechar e reabrir app mantém usuário logado
- [ ] Token é renovado automaticamente

---

## ✅ **2. DASHBOARD (10 min)**

### **Carregamento:**
- [ ] Dashboard carrega rapidamente (< 3 segundos)
- [ ] Gráficos aparecem corretamente
- [ ] Dados estão corretos e atualizados
- [ ] Loading states aparecem durante carregamento

### **Seleção de Centro:**
- [ ] Dropdown de centro funciona
- [ ] Mostra todos os centros (Valença, CNA, Cabrália)
- [ ] Trocar de centro atualiza dados automaticamente
- [ ] Gráficos atualizam ao trocar centro
- [ ] Seleção persiste ao navegar entre telas

### **Gráficos:**
- [ ] Gráfico de despesas por categoria aparece
- [ ] Gráfico de receitas vs despesas aparece
- [ ] Gráfico de despesas por centro aparece
- [ ] Cores estão corretas
- [ ] Legendas estão legíveis
- [ ] Valores estão formatados corretamente (R$)

### **Atividades Recentes:**
- [ ] Lista de atividades aparece
- [ ] Mostra diferentes tipos (despesas, receitas, etc)
- [ ] Ícones corretos para cada tipo
- [ ] Valores formatados corretamente
- [ ] Datas formatadas corretamente
- [ ] Clique em atividade navega para detalhe

### **Resumo Financeiro:**
- [ ] Total de receitas correto
- [ ] Total de despesas correto
- [ ] Saldo calculado corretamente
- [ ] Formatação de moeda correta

---

## ✅ **3. RECEITAS (10 min)**

### **Listagem:**
- [ ] Lista de receitas carrega
- [ ] Mostra todas as receitas do período
- [ ] Ordenação funciona (data, valor, nome)
- [ ] Scroll infinito funciona (se implementado)
- [ ] Pull to refresh funciona

### **Filtros:**
- [ ] Filtro por data funciona
- [ ] Filtro por centro funciona
- [ ] Filtro por categoria funciona
- [ ] Limpar filtros funciona
- [ ] Resultados corretos após filtrar

### **Criar Receita:**
- [ ] Modal de criação abre
- [ ] Todos os campos aparecem
- [ ] Validação de campos obrigatórios funciona
- [ ] Seleção de data funciona
- [ ] Seleção de categoria funciona
- [ ] Seleção de centro funciona
- [ ] Input de valor aceita apenas números
- [ ] Formatação de moeda funciona
- [ ] Salvar cria receita corretamente
- [ ] Toast de sucesso aparece
- [ ] Lista atualiza automaticamente
- [ ] Modal fecha após salvar

### **Editar Receita:**
- [ ] Modal de edição abre com dados corretos
- [ ] Todos os campos são editáveis
- [ ] Salvar atualiza receita corretamente
- [ ] Toast de sucesso aparece
- [ ] Lista atualiza automaticamente

### **Deletar Receita:**
- [ ] Confirmação aparece antes de deletar
- [ ] Deletar remove receita corretamente
- [ ] Toast de sucesso aparece
- [ ] Lista atualiza automaticamente

---

## ✅ **4. DESPESAS (15 min)**

### **Listagem:**
- [ ] Lista de despesas carrega
- [ ] Mostra todas as despesas do período
- [ ] Badge de status aparece (pago/pendente)
- [ ] Ícone de documentos aparece quando tem anexos
- [ ] Ordenação funciona
- [ ] Scroll funciona suavemente

### **Filtros:**
- [ ] Filtro por data funciona
- [ ] Filtro por centro funciona
- [ ] Filtro por categoria funciona
- [ ] Filtro por status funciona
- [ ] Filtro por setor funciona (despesas fixas)
- [ ] Limpar filtros funciona

### **Criar Despesa:**
- [ ] Modal de criação abre
- [ ] Todos os campos aparecem
- [ ] Validação funciona
- [ ] Seleção de categoria funciona
- [ ] Seleção de setor aparece para categoria "Funcionário"
- [ ] Seleção de equipamento aparece para categoria "Manutenção"
- [ ] Checkbox "Despesa fixa" funciona
- [ ] Campos de despesa fixa aparecem quando marcado
- [ ] Checkbox "Valor parcelado" funciona
- [ ] Campos de parcelamento aparecem quando marcado
- [ ] Adicionar documento funciona
- [ ] Adicionar foto funciona
- [ ] Preview de documentos funciona
- [ ] Remover documento funciona
- [ ] Salvar cria despesa corretamente
- [ ] Despesas fixas geram parcelas automaticamente

### **Editar Despesa:**
- [ ] Modal de edição abre
- [ ] Dados carregam corretamente
- [ ] Todos os campos editáveis
- [ ] Salvar atualiza corretamente
- [ ] Documentos existentes aparecem
- [ ] Pode adicionar novos documentos

### **Documentos:**
- [ ] Modal de documentos abre
- [ ] Lista todos os documentos
- [ ] Mostra tipo de documento correto
- [ ] Clique em documento abre preview
- [ ] Preview de PDF funciona
- [ ] Preview de imagem funciona
- [ ] Navegação entre documentos funciona (< >)
- [ ] Botão compartilhar funciona
- [ ] Deletar documento funciona
- [ ] Adicionar documento mostra 4 opções:
  - [ ] Nota Fiscal
  - [ ] Recibo
  - [ ] Comprovante
  - [ ] Boleto
- [ ] Upload de documento funciona
- [ ] Upload de foto funciona
- [ ] Validação de tamanho funciona (80MB)
- [ ] Validação de tipo funciona

### **Deletar Despesa:**
- [ ] Confirmação aparece
- [ ] Deletar remove despesa
- [ ] Documentos são deletados também
- [ ] Lista atualiza

---

## ✅ **5. EQUIPAMENTOS (10 min)**

### **Listagem:**
- [ ] Lista de equipamentos carrega
- [ ] Mostra todos os equipamentos
- [ ] Badge de revisão aparece quando próximo
- [ ] Horas de uso aparecem
- [ ] Horas até revisão calculadas corretamente

### **Detalhes:**
- [ ] Modal de detalhes abre
- [ ] Todas as informações aparecem
- [ ] Histórico de manutenções aparece (se houver)

### **Atualizar Horas:**
- [ ] Modal de atualização abre
- [ ] Input aceita apenas números
- [ ] Validação funciona
- [ ] Salvar atualiza horas
- [ ] Horas até revisão recalcula
- [ ] Badge atualiza se necessário

### **Criar Equipamento:**
- [ ] Modal de criação abre
- [ ] Todos os campos funcionam
- [ ] Validação funciona
- [ ] Salvar cria equipamento
- [ ] Lista atualiza

---

## ✅ **6. CONTRATOS (5 min)**

### **Listagem:**
- [ ] Lista de contratos carrega
- [ ] Mostra informações básicas
- [ ] Status aparece corretamente

### **Detalhes:**
- [ ] Modal de detalhes abre
- [ ] Todas as informações aparecem
- [ ] Documentos aparecem

### **Documentos:**
- [ ] Modal de documentos abre
- [ ] Lista documentos do contrato
- [ ] Preview funciona
- [ ] Adicionar documento funciona
- [ ] Deletar documento funciona

---

## ✅ **7. PEDIDOS (5 min)**

### **Listagem:**
- [ ] Lista de pedidos carrega
- [ ] Status aparece corretamente
- [ ] Valores corretos

### **Criar/Editar:**
- [ ] Formulário funciona
- [ ] Validação funciona
- [ ] Salvar funciona

---

## ✅ **8. RELATÓRIOS (10 min)**

### **Gerar Relatório:**
- [ ] Modal de configuração abre
- [ ] Seleção de período funciona
- [ ] Seleção de centro funciona
- [ ] Seleção de tipo funciona (despesas/receitas/saldo)
- [ ] Botão "Gerar PDF" funciona
- [ ] Loading aparece durante geração
- [ ] PDF é gerado corretamente

### **Preview de Relatório:**
- [ ] Modal de preview abre
- [ ] PDF carrega e aparece
- [ ] Zoom funciona (pinch)
- [ ] Scroll funciona
- [ ] Botão "Compartilhar" funciona (em dispositivo real)
- [ ] Fechar modal funciona (X no topo)

### **Conteúdo do Relatório:**
- [ ] Cabeçalho com logo e título
- [ ] Período correto
- [ ] Centro correto
- [ ] Tabelas formatadas
- [ ] Valores corretos
- [ ] Totais calculados corretamente
- [ ] Data de geração aparece

---

## ✅ **9. NAVEGAÇÃO (5 min)**

### **Tabs:**
- [ ] Todas as tabs aparecem
- [ ] Ícones corretos
- [ ] Transição suave entre tabs
- [ ] Tab ativa destacada

### **Navegação:**
- [ ] Voltar funciona em todas as telas
- [ ] Deep linking funciona (se implementado)
- [ ] Navegação não trava
- [ ] Não há loops infinitos

---

## ✅ **10. PERFORMANCE (5 min)**

### **Velocidade:**
- [ ] App abre em < 3 segundos
- [ ] Telas carregam rapidamente
- [ ] Transições são suaves (60fps)
- [ ] Scroll é fluido
- [ ] Não há travamentos

### **Memória:**
- [ ] App não consome memória excessiva
- [ ] Não há memory leaks visíveis
- [ ] Fotos são comprimidas adequadamente

### **Rede:**
- [ ] Loading states aparecem durante requests
- [ ] Erros de rede são tratados
- [ ] Retry funciona após erro
- [ ] Cache funciona (dados aparecem rapidamente)

---

## ✅ **11. UX/UI (5 min)**

### **Visual:**
- [ ] Cores consistentes
- [ ] Fontes legíveis
- [ ] Espaçamentos adequados
- [ ] Ícones corretos e claros
- [ ] Imagens carregam corretamente

### **Interação:**
- [ ] Botões têm feedback visual (opacity)
- [ ] Toasts aparecem e desaparecem
- [ ] Modais abrem e fecham suavemente
- [ ] Loading spinners aparecem quando necessário
- [ ] Mensagens de erro são claras

### **Acessibilidade:**
- [ ] Textos são legíveis
- [ ] Contraste adequado
- [ ] Botões têm tamanho adequado para toque
- [ ] Inputs têm labels claros

---

## ✅ **12. EDGE CASES (10 min)**

### **Dados:**
- [ ] Tela vazia mostra mensagem apropriada
- [ ] Lista com muitos itens funciona (scroll)
- [ ] Valores muito grandes são formatados corretamente
- [ ] Valores negativos são tratados
- [ ] Datas futuras são aceitas/rejeitadas conforme regra

### **Rede:**
- [ ] App funciona offline (dados em cache)
- [ ] Mensagem de erro aparece sem internet
- [ ] Sincronização funciona ao voltar online
- [ ] Timeout é tratado adequadamente

### **Permissões:**
- [ ] Mensagem clara quando permissão negada (câmera)
- [ ] Mensagem clara quando permissão negada (galeria)
- [ ] App não quebra sem permissões

### **Erros:**
- [ ] Erros do servidor são tratados
- [ ] Erros de validação são claros
- [ ] App não quebra com erros inesperados

---

## ✅ **13. SEGURANÇA (5 min)**

### **Autenticação:**
- [ ] Token expira e renova automaticamente
- [ ] Logout limpa dados sensíveis
- [ ] Não há dados sensíveis em logs

### **Dados:**
- [ ] Usuário só vê dados do(s) seu(s) centro(s)
- [ ] Upload de arquivos valida tipo e tamanho
- [ ] Arquivos são armazenados com segurança

---

## ✅ **14. PLATAFORMAS (10 min)**

### **Android:**
- [ ] Testa em Android 8+ (API 26+)
- [ ] Botão voltar do Android funciona
- [ ] Notificações aparecem (se implementado)
- [ ] Ícone aparece corretamente
- [ ] Splash screen aparece

### **iOS:**
- [ ] Testa em iOS 13+
- [ ] Gestos do iOS funcionam (swipe back)
- [ ] Notificações aparecem (se implementado)
- [ ] Ícone aparece corretamente
- [ ] Splash screen aparece

---

## 📊 **RESULTADO FINAL**

### **Contagem:**
- **Total de itens:** ~200
- **Itens OK:** ___
- **Itens com problema:** ___
- **Taxa de sucesso:** ____%

### **Critério de Aprovação:**
- ✅ **95%+** = Pronto para produção
- ⚠️ **90-94%** = Corrigir problemas críticos
- ❌ **< 90%** = Mais testes necessários

---

## 🐛 **BUGS ENCONTRADOS**

Liste aqui os bugs encontrados durante o smoke test:

1. **[Severidade] Descrição do bug**
   - Tela: ___
   - Passos para reproduzir: ___
   - Comportamento esperado: ___
   - Comportamento atual: ___

2. **[Severidade] Descrição do bug**
   - ...

---

## ✅ **APROVAÇÃO FINAL**

- [ ] Todos os itens críticos testados
- [ ] Bugs críticos corrigidos
- [ ] Performance aceitável
- [ ] UX satisfatória
- [ ] Segurança validada

**Testado por:** _______________  
**Data:** ___/___/___  
**Versão:** 1.0.0  
**Build:** ___  

**Status:** [ ] APROVADO [ ] REPROVADO

---

## 📝 **OBSERVAÇÕES FINAIS**

Adicione aqui quaisquer observações ou recomendações:

_______________________________________________
_______________________________________________
_______________________________________________
