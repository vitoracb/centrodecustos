# 🎯 SMOKE TEST HÍBRIDO - CHECKLIST PRÉ-TESTFLIGHT

## 📋 **CHECKLIST BALANCEADO (60 min)**

**Objetivo:** Validar funcionalidades críticas e importantes antes do TestFlight.  
**Tempo:** 60 minutos  
**Cobertura:** 80% dos casos de uso  
**Critério de aprovação:** 90%+ de sucesso

---

## 🔴 **CRÍTICO - DEVE FUNCIONAR (30 min)**

### **1. Autenticação (5 min)**
- [ ] Login com credenciais válidas funciona
- [ ] Login com senha errada mostra erro
- [ ] Logout funciona e limpa dados
- [ ] App mantém usuário logado ao reabrir

### **2. Dashboard (5 min)**
- [ ] Dashboard carrega em < 3 segundos
- [ ] Gráficos aparecem corretamente
- [ ] Dropdown de centro funciona
- [ ] Trocar centro atualiza dados
- [ ] Atividades recentes aparecem

### **3. Despesas - CRUD Básico (10 min)**
- [ ] Criar despesa funciona
- [ ] Despesa aparece na lista
- [ ] Editar despesa funciona
- [ ] Deletar despesa funciona (com confirmação)
- [ ] Validação de campos obrigatórios funciona
- [ ] Seleção de categoria funciona
- [ ] Seleção de centro funciona
- [ ] Input de valor aceita apenas números

### **4. Receitas - CRUD Básico (5 min)**
- [ ] Criar receita funciona
- [ ] Receita aparece na lista
- [ ] Editar receita funciona
- [ ] Deletar receita funciona

### **5. Documentos (5 min)**
- [ ] Upload de documento funciona
- [ ] Upload de foto funciona
- [ ] Preview de documento funciona
- [ ] Seleção de tipo mostra 4 opções (Nota Fiscal, Recibo, Comprovante, Boleto)
- [ ] Deletar documento funciona

---

## 🟡 **IMPORTANTE - BOM FUNCIONAR (20 min)**

### **6. Filtros e Busca (5 min)**
- [ ] Filtro por data funciona (despesas)
- [ ] Filtro por centro funciona (despesas)
- [ ] Filtro por categoria funciona (despesas)
- [ ] Limpar filtros funciona
- [ ] Ordenação funciona (data, valor)

### **7. Equipamentos (5 min)**
- [ ] Lista de equipamentos carrega
- [ ] Badge de revisão aparece quando próximo
- [ ] Atualizar horas funciona
- [ ] Horas até revisão recalcula corretamente
- [ ] Criar equipamento funciona

### **8. Relatórios (5 min)**
- [ ] Modal de configuração abre
- [ ] Seleção de período funciona
- [ ] Gerar PDF funciona
- [ ] PDF carrega no preview
- [ ] Dados do PDF estão corretos
- [ ] Botão compartilhar aparece

### **9. Navegação e Performance (5 min)**
- [ ] Todas as tabs funcionam
- [ ] Transições são suaves
- [ ] App não trava
- [ ] Scroll funciona suavemente
- [ ] Loading states aparecem quando necessário
- [ ] Cache funciona (segunda abertura mais rápida)

---

## 🟢 **NICE TO HAVE - PODE TER BUGS (10 min)**

### **10. Despesas Avançadas (5 min)**
- [ ] Despesa fixa funciona
- [ ] Parcelamento funciona
- [ ] Abatimento/débito funciona
- [ ] Seleção de equipamento funciona (manutenção)
- [ ] Seleção de setor funciona (funcionário)

### **11. Contratos e Pedidos (3 min)**
- [ ] Lista de contratos carrega
- [ ] Detalhes de contrato aparecem
- [ ] Lista de pedidos carrega
- [ ] Criar pedido funciona

### **12. Edge Cases (2 min)**
- [ ] Tela vazia mostra mensagem apropriada
- [ ] Erro de rede é tratado
- [ ] Valores muito grandes são formatados
- [ ] App funciona com dados em cache (offline)

---

## 📊 **RESULTADO DO TESTE**

### **Contagem:**
```
Total de itens: 60
Itens OK: ___
Itens com problema: ___
Taxa de sucesso: ____%
```

### **Critério de Aprovação:**
- ✅ **90%+** (54+ itens) = **APROVADO para TestFlight** 🚀
- ⚠️ **80-89%** (48-53 itens) = Corrigir bugs críticos
- ❌ **< 80%** (< 48 itens) = Mais correções necessárias

---

## 🐛 **BUGS ENCONTRADOS**

### **Críticos (Bloqueiam TestFlight):**
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### **Importantes (Corrigir antes de produção):**
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### **Nice to have (Pode ficar para depois):**
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

## ✅ **DECISÃO FINAL**

- [ ] **APROVADO** - Pronto para TestFlight (90%+)
- [ ] **APROVADO COM RESSALVAS** - TestFlight OK, mas corrigir bugs importantes (80-89%)
- [ ] **REPROVADO** - Precisa correções antes do TestFlight (< 80%)

**Testado por:** _______________  
**Data:** ___/___/___  
**Versão:** 1.0.0  
**Build:** ___  

---

## 📝 **OBSERVAÇÕES**

_______________________________________________
_______________________________________________
_______________________________________________

---

## 🎯 **PRÓXIMOS PASSOS**

### **Se APROVADO (90%+):**
1. ✅ Enviar para TestFlight
2. ✅ Distribuir para testadores
3. ✅ Coletar feedback
4. ✅ Corrigir bugs reportados
5. ✅ Rodar Checklist Completo antes de produção

### **Se APROVADO COM RESSALVAS (80-89%):**
1. ⚠️ Anotar bugs importantes
2. ⚠️ Enviar para TestFlight (funcional)
3. ⚠️ Corrigir bugs em paralelo
4. ⚠️ Novo build quando bugs corrigidos

### **Se REPROVADO (< 80%):**
1. ❌ Corrigir bugs críticos
2. ❌ Novo build
3. ❌ Rodar checklist novamente
4. ❌ Só enviar quando aprovado

---

## 💡 **DICAS PARA O TESTE**

### **Antes de começar:**
- ☕ Prepare café/água
- 📱 Carregue o dispositivo
- 📝 Tenha papel e caneta para anotar bugs
- ⏱️ Reserve 60 minutos sem interrupções

### **Durante o teste:**
- ✅ Marque cada item conforme testa
- 📸 Tire screenshots de bugs
- 📝 Anote passos para reproduzir bugs
- ⏭️ Não pule itens críticos

### **Depois do teste:**
- 📊 Calcule a taxa de sucesso
- 🎯 Priorize bugs por severidade
- 📋 Crie issues para bugs encontrados
- ✅ Decida se está pronto para TestFlight

---

## 🚀 **LEMBRE-SE**

> **TestFlight é para TESTAR, não para perfeição!**
> 
> - 90%+ = Bom o suficiente para testers
> - Bugs não-críticos podem ser corrigidos depois
> - Feedback de testers é valioso
> - Melhor lançar e iterar do que buscar perfeição

**Boa sorte! 🍀**
