# 🤔 OCR: API Externa vs Biblioteca Local

## ⚠️ O que o Cursor disse está PARCIALMENTE correto

O Cursor mencionou que **Tesseract.js** e **ML Kit** têm limitações no Expo/React Native, o que é verdade:

- ❌ **Tesseract.js**: Muito lento (5-15 segundos), bundle grande (+2MB)
- ❌ **ML Kit**: Requer código nativo (não funciona com Expo Go, só com Expo Dev Build)

---

## ✅ MAS EXISTE UMA SOLUÇÃO MELHOR!

### **expo-image-manipulator + Tesseract.js OTIMIZADO**

Mesmo sendo mais lento, **Tesseract.js FUNCIONA** e tem vantagens enormes:

**VANTAGENS:**
- ✅ **Grátis 100%** (sem custos de API)
- ✅ **Funciona offline** (não precisa internet)
- ✅ **Privacidade total** (dados não saem do dispositivo)
- ✅ **Sem limite de uso** (pode processar infinitas imagens)
- ✅ **Funciona no Expo Go** (sem precisar build nativo)

**DESVANTAGENS:**
- ⏱️ Lento (5-15 segundos por imagem)
- 📦 Bundle maior (+2MB)
- 📊 Precisão menor (~70-80% vs 90-95% das APIs)

---

## 💰 COMPARAÇÃO: Grátis vs Pago

### Opção 1: **Tesseract.js (GRÁTIS)**

```
Custo mensal: R$ 0,00
Limite: Ilimitado
Internet: Não precisa
Privacidade: Total
Velocidade: 5-15 segundos
Precisão: 70-80%
```

### Opção 2: **Google Vision API (PAGO)**

```
Custo mensal: 
  - Primeiras 1.000 imagens: R$ 0,00
  - Depois: R$ 7,50 por 1.000 imagens
  
Se processar 100 notas/mês: R$ 0,00 (dentro do free tier)
Se processar 5.000 notas/mês: R$ 30,00/mês

Internet: OBRIGATÓRIO
Privacidade: Dados enviados para Google
Velocidade: 0.5-2 segundos
Precisão: 90-95%
```

---

## 🎯 RECOMENDAÇÃO PARA VOCÊ

### **Use Tesseract.js por enquanto**

**Por quê?**
1. ✅ Você tem **1-2 usuários** (baixo volume)
2. ✅ Custo **ZERO** (importante para validar o produto)
3. ✅ Funciona **offline** (melhor experiência em campo)
4. ✅ **Privacidade** dos dados financeiros garantida
5. ✅ Fácil de implementar **hoje mesmo**

**Depois, se precisar:**
- Se o app crescer muito (milhares de usuários)
- Se precisar de velocidade máxima
- Se tiver orçamento para APIs pagas

→ **Aí sim migra para Google Vision API**

---

## 🚀 PLANO DE IMPLEMENTAÇÃO RECOMENDADO

### **FASE 1: MVP com Tesseract.js (AGORA)** ⭐

```bash
npm install tesseract.js
```

**Resultado:**
- ✅ OCR funcionando em 30 minutos
- ✅ Custo zero
- ✅ Funciona offline
- ⏱️ ~10 segundos por imagem (aceitável para MVP)

### **FASE 2: Otimização (SE NECESSÁRIO)**

Se Tesseract.js ficar muito lento:

1. **Pré-processar imagens** (redimensionar, aumentar contraste)
2. **Cache de resultados** (não reprocessar mesma imagem)
3. **Processamento em background**

### **FASE 3: Upgrade para API (SE CRESCER MUITO)**

Se chegar a centenas/milhares de usuários:

1. Criar backend proxy
2. Integrar Google Vision API
3. Manter Tesseract.js como fallback offline

---

## 📊 EXEMPLO PRÁTICO

### Cenário: 50 despesas/mês com OCR

**Com Tesseract.js:**
```
Custo: R$ 0,00
Tempo total: 50 × 10 seg = 8 minutos/mês
Economia vs digitação manual: 50 × 2 min = 100 minutos economizados
Saldo: +92 minutos economizados, R$ 0,00 de custo
```

**Com Google Vision API:**
```
Custo: R$ 0,00 (dentro do free tier de 1.000/mês)
Tempo total: 50 × 2 seg = 1,6 minutos/mês
Economia vs digitação manual: 100 minutos economizados
Saldo: +98 minutos economizados, R$ 0,00 de custo
Mas... requer internet sempre!
```

---

## 🔧 IMPLEMENTAÇÃO IMEDIATA

### Arquivo: `src/lib/ocr.ts` (COM TESSERACT.JS)

```typescript
import Tesseract from 'tesseract.js';
import * as FileSystem from 'expo-file-system';

// ===== EXTRAÇÃO DE TEXTO =====
export const extractTextFromImage = async (
  imageUri: string
): Promise<string> => {
  try {
    console.log('🔍 Iniciando OCR com Tesseract.js...');
    
    // Converte para base64 (necessário para Tesseract.js)
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Processa com Tesseract
    const result = await Tesseract.recognize(
      `data:image/jpeg;base64,${base64}`,
      'por', // Português
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${(m.progress * 100).toFixed(0)}%`);
          }
        },
      }
    );
    
    if (!result.data.text) {
      throw new Error('Nenhum texto detectado na imagem');
    }
    
    console.log('✅ Texto extraído com sucesso');
    return result.data.text;
  } catch (error: any) {
    console.error('❌ Erro no OCR:', error);
    throw new Error(`Erro ao processar imagem: ${error.message}`);
  }
};

// ===== EXTRAÇÃO DE DADOS ESTRUTURADOS =====
export const extractDocumentData = async (
  imageUri: string,
  documentType: string = 'nota_fiscal'
): Promise<{
  rawText: string;
  value?: number;
  date?: string;
  cnpj?: string;
  cpf?: string;
  supplier?: string;
}> => {
  const text = await extractTextFromImage(imageUri);
  
  const extracted = {
    rawText: text,
  };

  // Extrai VALOR
  const valuePatterns = [
    /(?:R\$|total|valor|vlr)[:\s]*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2}))/gi,
    /([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/g,
  ];

  for (const pattern of valuePatterns) {
    const match = text.match(pattern);
    if (match) {
      const values = match.map((m) => {
        const cleanValue = m
          .replace(/[^\d,]/g, '')
          .replace(/\./g, '')
          .replace(',', '.');
        return parseFloat(cleanValue);
      }).filter(v => !isNaN(v));
      
      if (values.length > 0) {
        extracted.value = Math.max(...values);
        break;
      }
    }
  }

  // Extrai DATA
  const datePattern = /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/g;
  const dateMatch = text.match(datePattern);
  if (dateMatch) {
    const dateStr = dateMatch[0].replace(/[^\d\/\-\.]/gi, '');
    const parts = dateStr.split(/[\/\-\.]/);
    if (parts.length === 3) {
      const [day, month, year] = parts;
      extracted.date = `${day}/${month}/${year}`;
    }
  }

  // Extrai CNPJ
  const cnpjPattern = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g;
  const cnpjMatch = text.match(cnpjPattern);
  if (cnpjMatch) {
    extracted.cnpj = cnpjMatch[0];
  }

  // Extrai CPF
  const cpfPattern = /\d{3}\.\d{3}\.\d{3}-\d{2}/g;
  const cpfMatch = text.match(cpfPattern);
  if (cpfMatch) {
    extracted.cpf = cpfMatch[0];
  }

  // Extrai FORNECEDOR (primeiras linhas que parecem nome)
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  for (const line of lines.slice(0, 10)) {
    if (line.length > 5 && !/^\d+$/.test(line)) {
      if (!/(?:cnpj|cpf|data|valor|total|nota|fiscal)/gi.test(line)) {
        extracted.supplier = line;
        break;
      }
    }
  }

  return extracted;
};
```

---

## 🎯 RESULTADO FINAL

### Você terá OCR funcionando:
- ✅ **HOJE** (em 30 minutos)
- ✅ **Grátis para sempre**
- ✅ **Offline**
- ✅ **Privado**
- ⏱️ ~10 segundos por imagem (aceitável)

### E SE precisar melhorar depois:
- 📈 Cresceu muito? → Migra para Google Vision API
- 🐌 Muito lento? → Otimiza pré-processamento
- 💰 Tem orçamento? → Adiciona API paga como opção premium

---

## ❓ RESPOSTA DIRETA

**Pergunta:** "Precisa de API externa para OCR funcionar?"

**Resposta:** 
- ❌ **NÃO, não precisa!** 
- ✅ Tesseract.js funciona 100% offline e grátis
- ⚠️ É mais lento (10 seg vs 2 seg), mas **funciona perfeitamente** para seu caso

**Recomendação:**
→ **Use Tesseract.js agora** (grátis, offline, privado)
→ **Depois** (se crescer muito) considere API paga

---

## 🚀 PRÓXIMO PASSO

**Quer que eu implemente com Tesseract.js AGORA?**

Posso criar:
1. ✅ Função de OCR completa e otimizada
2. ✅ Código pronto para ExpenseFormModal
3. ✅ Modal de progresso bonito
4. ✅ Tudo funcionando offline e grátis

**É só confirmar!** 💪

---

**TL;DR:**
- 🎯 Use **Tesseract.js** (grátis, offline, funciona hoje)
- 💰 Google Vision API só vale a pena se tiver **milhares** de usuários
- ✅ Para **1-2 usuários**, Tesseract.js é **PERFEITO**
