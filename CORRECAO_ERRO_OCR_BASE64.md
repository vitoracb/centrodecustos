# 🔧 CORREÇÃO URGENTE - Erro no OCR.ts

## 🔴 Erro Identificado

```
TypeError: Cannot read property 'Base64' of undefined
Location: ocr.ts:77:18
```

## 🔍 Causa do Problema

O arquivo `ocr.ts` está tentando usar `Tesseract.js`, mas:

1. ❌ A biblioteca `tesseract.js` **NÃO ESTÁ INSTALADA**
2. ❌ O código está acessando propriedades de objetos undefined
3. ❌ Falta configuração adequada para React Native/Expo

---

## ✅ SOLUÇÃO COMPLETA

### PASSO 1: Instalar Tesseract.js

```bash
npm install tesseract.js
```

### PASSO 2: Substituir COMPLETAMENTE o arquivo `src/lib/ocr.ts`

**APAGUE TODO O CONTEÚDO** do arquivo `src/lib/ocr.ts` e substitua por este código:

```typescript
import Tesseract from 'tesseract.js';
import * as FileSystem from 'expo-file-system';

// ========================
// TIPOS
// ========================

export interface ExtractedData {
  rawText: string;
  value?: number;
  date?: string;
  cnpj?: string;
  cpf?: string;
  supplier?: string;
  invoiceNumber?: string;
}

// ========================
// EXTRAÇÃO DE TEXTO COM TESSERACT.JS
// ========================

export const extractTextFromImage = async (
  imageUri: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    console.log('🔍 Iniciando OCR com Tesseract.js...');
    console.log('📁 Image URI:', imageUri);
    
    // Converte imagem para base64
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log('✅ Imagem convertida para base64');

    // Processa com Tesseract.js
    const result = await Tesseract.recognize(
      `data:image/jpeg;base64,${base64Image}`,
      'por', // Português
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const progress = Math.round(m.progress * 100);
            console.log(`📊 OCR Progress: ${progress}%`);
            if (onProgress) {
              onProgress(m.progress);
            }
          }
        },
      }
    );

    if (!result || !result.data || !result.data.text) {
      throw new Error('Nenhum texto detectado na imagem');
    }

    const extractedText = result.data.text.trim();
    
    console.log('✅ Texto extraído com sucesso');
    console.log('📝 Preview:', extractedText.substring(0, 100) + '...');
    
    return extractedText;
  } catch (error: any) {
    console.error('❌ Erro no OCR:', error);
    throw new Error(`Erro ao processar imagem: ${error.message || 'Erro desconhecido'}`);
  }
};

// ========================
// EXTRAÇÃO DE DADOS ESTRUTURADOS
// ========================

export const extractDocumentData = async (
  imageUri: string,
  documentType: 'nota_fiscal' | 'recibo' | 'comprovante_pagamento' = 'nota_fiscal',
  onProgress?: (progress: number) => void
): Promise<ExtractedData> => {
  try {
    console.log('🔍 Extraindo dados estruturados...');
    console.log('📄 Tipo de documento:', documentType);

    const text = await extractTextFromImage(imageUri, onProgress);
    
    const extracted: ExtractedData = {
      rawText: text,
    };

    // ===== EXTRAÇÃO DE VALOR =====
    console.log('💰 Procurando valor monetário...');
    const valuePatterns = [
      /(?:R\$|total|valor|vlr)[:\s]*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2}))/gi,
      /([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/g,
    ];

    for (const pattern of valuePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        const values = matches
          .map((m) => {
            const cleanValue = m
              .replace(/[^\d,]/g, '')
              .replace(/\./g, '')
              .replace(',', '.');
            return parseFloat(cleanValue);
          })
          .filter(v => !isNaN(v) && v > 0);
        
        if (values.length > 0) {
          extracted.value = Math.max(...values);
          console.log('✅ Valor encontrado:', extracted.value);
          break;
        }
      }
    }

    // ===== EXTRAÇÃO DE DATA =====
    console.log('📅 Procurando data...');
    const datePattern = /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/g;
    const dateMatches = text.match(datePattern);
    
    if (dateMatches && dateMatches.length > 0) {
      const dateStr = dateMatches[0];
      const parts = dateStr.split(/[\/\-\.]/);
      
      if (parts.length === 3) {
        const [day, month, year] = parts;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        if (!isNaN(date.getTime())) {
          extracted.date = `${day}/${month}/${year}`;
          console.log('✅ Data encontrada:', extracted.date);
        }
      }
    }

    // ===== EXTRAÇÃO DE CNPJ =====
    console.log('🏢 Procurando CNPJ...');
    const cnpjPattern = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g;
    const cnpjMatch = text.match(cnpjPattern);
    
    if (cnpjMatch && cnpjMatch.length > 0) {
      extracted.cnpj = cnpjMatch[0];
      console.log('✅ CNPJ encontrado:', extracted.cnpj);
    }

    // ===== EXTRAÇÃO DE CPF =====
    console.log('👤 Procurando CPF...');
    const cpfPattern = /\d{3}\.\d{3}\.\d{3}-\d{2}/g;
    const cpfMatch = text.match(cpfPattern);
    
    if (cpfMatch && cpfMatch.length > 0) {
      extracted.cpf = cpfMatch[0];
      console.log('✅ CPF encontrado:', extracted.cpf);
    }

    // ===== EXTRAÇÃO DE FORNECEDOR =====
    console.log('🏪 Procurando fornecedor...');
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    for (const line of lines.slice(0, 15)) {
      if (line.length >= 5 && line.length <= 100) {
        if (!/^\d+$/.test(line)) {
          const lowerLine = line.toLowerCase();
          if (!lowerLine.includes('cnpj') && 
              !lowerLine.includes('cpf') && 
              !lowerLine.includes('data') && 
              !lowerLine.includes('valor') && 
              !lowerLine.includes('total') && 
              !lowerLine.includes('nota') && 
              !lowerLine.includes('fiscal') &&
              !lowerLine.includes('r$')) {
            extracted.supplier = line;
            console.log('✅ Possível fornecedor:', extracted.supplier);
            break;
          }
        }
      }
    }

    // ===== EXTRAÇÃO DE NÚMERO DA NOTA FISCAL =====
    console.log('🔢 Procurando número da NF...');
    const invoicePatterns = [
      /(?:n[úu]mero|n[°º]|nf)[:\s]*(\d+)/gi,
      /(?:nota|fiscal)[:\s]*(\d+)/gi,
    ];

    for (const pattern of invoicePatterns) {
      const match = text.match(pattern);
      if (match && match[0]) {
        const numMatch = match[0].match(/\d+/);
        if (numMatch) {
          extracted.invoiceNumber = numMatch[0];
          console.log('✅ Número da NF encontrado:', extracted.invoiceNumber);
          break;
        }
      }
    }

    console.log('📊 Resumo dos dados extraídos:');
    console.log('  - Valor:', extracted.value || 'Não encontrado');
    console.log('  - Data:', extracted.date || 'Não encontrado');
    console.log('  - Fornecedor:', extracted.supplier || 'Não encontrado');
    console.log('  - CNPJ:', extracted.cnpj || 'Não encontrado');
    console.log('  - CPF:', extracted.cpf || 'Não encontrado');
    console.log('  - NF:', extracted.invoiceNumber || 'Não encontrado');

    return extracted;
  } catch (error: any) {
    console.error('❌ Erro ao extrair dados estruturados:', error);
    throw error;
  }
};

// ========================
// VALIDAÇÕES
// ========================

export const validateExtractedData = (data: ExtractedData): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validação de valor
  if (!data.value) {
    warnings.push('Valor não detectado');
  } else if (data.value <= 0) {
    errors.push('Valor inválido (menor ou igual a zero)');
  } else if (data.value > 1000000) {
    warnings.push('Valor muito alto - verifique se está correto');
  }

  // Validação de data
  if (!data.date) {
    warnings.push('Data não detectada');
  } else {
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(data.date)) {
      errors.push('Data em formato inválido');
    }
  }

  // Validação de fornecedor
  if (!data.supplier) {
    warnings.push('Fornecedor não detectado');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};
```

---

## 🧪 TESTE RÁPIDO

Após substituir o arquivo, teste com este código:

```typescript
import { extractDocumentData } from './lib/ocr';

const testarOCR = async () => {
  try {
    const resultado = await extractDocumentData(
      'file:///path/to/image.jpg',
      'nota_fiscal',
      (progress) => console.log(`Progresso: ${Math.round(progress * 100)}%`)
    );
    
    console.log('Resultado:', resultado);
  } catch (error) {
    console.error('Erro:', error);
  }
};
```

---

## 📋 CHECKLIST

- [ ] 1. Executar `npm install tesseract.js`
- [ ] 2. Substituir completamente o arquivo `src/lib/ocr.ts`
- [ ] 3. Salvar o arquivo
- [ ] 4. Reiniciar o servidor Expo (`npm start`)
- [ ] 5. Recarregar o app (Ctrl+R ou Cmd+R)
- [ ] 6. Testar OCR tirando uma foto de nota fiscal

---

## ⚠️ IMPORTANTE

**NÃO** tente corrigir apenas a linha 77. O arquivo inteiro precisa ser reescrito com a implementação correta do Tesseract.js.

---

## 🚀 PRÓXIMO PASSO

1. **Instale** tesseract.js:
   ```bash
   npm install tesseract.js
   ```

2. **Substitua** o arquivo `src/lib/ocr.ts` pelo código acima

3. **Teste** e me avise se funcionou!

---

**O erro vai sumir assim que você substituir o arquivo!** ✅
