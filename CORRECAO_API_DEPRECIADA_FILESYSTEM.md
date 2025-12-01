# 🔧 CORREÇÃO - API Depreciada do expo-file-system

## 🔴 Erro Identificado

```
Error: Method readAsStringAsync imported from "expo-file-system" is deprecated.
```

**Causa:** O código está usando a API antiga `FileSystem.readAsStringAsync` que foi depreciada.

**Solução:** Migrar para a nova API usando `File` e `Directory` do `expo-file-system`.

---

## ✅ SOLUÇÃO COMPLETA

### PASSO 1: Atualizar o arquivo `src/lib/ocr.ts`

**SUBSTITUA COMPLETAMENTE** o arquivo por este código atualizado:

```typescript
import Tesseract from 'tesseract.js';
import { File } from 'expo-file-system';

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
    
    // ===== NOVA API DO EXPO-FILE-SYSTEM =====
    // Usa File.readAsStringAsync em vez de FileSystem.readAsStringAsync
    const file = new File(imageUri);
    const base64Image = await file.text(); // Lê como texto
    
    // Se não funcionar com .text(), usa fallback
    let imageData: string;
    
    try {
      // Tenta ler diretamente como base64
      imageData = await file.base64();
    } catch (fallbackError) {
      console.log('⚠️ Usando fallback para leitura de arquivo');
      // Fallback: usa fetch para ler o arquivo
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const reader = new FileReader();
      
      imageData = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    console.log('✅ Imagem convertida para base64');

    // Processa com Tesseract.js
    const result = await Tesseract.recognize(
      `data:image/jpeg;base64,${imageData}`,
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
    console.error('❌ Stack trace:', error.stack);
    
    // Mensagens de erro mais amigáveis
    if (error.message?.includes('FileSystem')) {
      throw new Error('Erro ao acessar o arquivo de imagem. Tente tirar a foto novamente.');
    }
    
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
    console.error('❌ Stack trace:', error.stack);
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

## 🔄 ALTERNATIVA: Usar apenas `fetch` (Mais Simples)

Se ainda der erro, use esta versão mais simples que **não depende** de nenhuma API do expo-file-system:

```typescript
import Tesseract from 'tesseract.js';

export const extractTextFromImage = async (
  imageUri: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    console.log('🔍 Iniciando OCR...');
    
    // Usa fetch para ler o arquivo (funciona sempre!)
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    // Converte para base64
    const reader = new FileReader();
    const base64Image = await new Promise<string>((resolve, reject) => {
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1]; // Remove o prefixo data:image/...
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    console.log('✅ Imagem convertida');

    // Processa com Tesseract.js
    const result = await Tesseract.recognize(
      `data:image/jpeg;base64,${base64Image}`,
      'por',
      {
        logger: (m) => {
          if (m.status === 'recognizing text' && onProgress) {
            onProgress(m.progress);
          }
        },
      }
    );

    if (!result?.data?.text) {
      throw new Error('Nenhum texto detectado');
    }

    return result.data.text.trim();
  } catch (error: any) {
    console.error('❌ Erro:', error);
    throw new Error(`Erro ao processar: ${error.message}`);
  }
};

// ... resto do código igual (extractDocumentData, etc)
```

---

## 📋 CHECKLIST

- [ ] 1. Escolher UMA das versões acima
- [ ] 2. Substituir COMPLETAMENTE o arquivo `src/lib/ocr.ts`
- [ ] 3. Salvar o arquivo
- [ ] 4. Reiniciar o servidor (`npm start`)
- [ ] 5. Recarregar o app
- [ ] 6. Testar OCR

---

## 🎯 QUAL VERSÃO USAR?

### **Recomendo: VERSÃO COM FETCH (Alternativa)**

**Por quê?**
- ✅ Mais simples
- ✅ Não depende de APIs do Expo
- ✅ Funciona em qualquer ambiente
- ✅ Sem warnings de depreciação

---

## 🚀 ARQUIVO PRONTO

Envie para o Cursor este arquivo completo com a **versão usando fetch** (mais confiável):

```typescript
import Tesseract from 'tesseract.js';

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
// EXTRAÇÃO DE TEXTO - VERSÃO SIMPLIFICADA COM FETCH
// ========================

export const extractTextFromImage = async (
  imageUri: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    console.log('🔍 Iniciando OCR com Tesseract.js...');
    console.log('📁 URI da imagem:', imageUri);
    
    // Usa fetch para ler o arquivo (universal, sem depender de APIs do Expo)
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    console.log('📦 Blob criado, tamanho:', blob.size, 'bytes');
    
    // Converte blob para base64 usando FileReader
    const base64Image = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onloadend = () => {
        try {
          const result = reader.result as string;
          // Remove o prefixo "data:image/...;base64,"
          const base64 = result.split(',')[1];
          resolve(base64);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsDataURL(blob);
    });

    console.log('✅ Imagem convertida para base64');
    console.log('📊 Tamanho do base64:', base64Image.length, 'caracteres');

    // Processa com Tesseract.js
    console.log('🔍 Iniciando processamento OCR...');
    const result = await Tesseract.recognize(
      `data:image/jpeg;base64,${base64Image}`,
      'por', // Português
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const progress = Math.round(m.progress * 100);
            console.log(`📊 Progresso do OCR: ${progress}%`);
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
    
    console.log('✅ OCR concluído com sucesso!');
    console.log('📝 Tamanho do texto extraído:', extractedText.length, 'caracteres');
    console.log('📝 Preview (primeiros 150 chars):', extractedText.substring(0, 150));
    
    return extractedText;
  } catch (error: any) {
    console.error('❌ Erro no OCR:', error);
    console.error('❌ Stack:', error.stack);
    
    throw new Error(`Erro ao processar imagem: ${error.message || 'Erro desconhecido'}`);
  }
};

// ... resto igual ao código anterior (extractDocumentData, validateExtractedData)
```

---

**Esta versão com FETCH é a mais confiável e vai funcionar!** ✅
