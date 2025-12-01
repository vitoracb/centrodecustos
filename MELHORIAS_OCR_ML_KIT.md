# 🚀 MELHORIAS E COMPLEMENTOS - Sistema OCR

## 📋 Status Atual

O Cursor implementou OCR com **Tesseract.js**, mas há algumas **limitações críticas** em React Native:

⚠️ **PROBLEMAS IDENTIFICADOS:**
1. **Tesseract.js é lento** em dispositivos móveis (5-15 segundos)
2. **Tamanho do bundle** aumenta 2-3MB
3. **Web Workers não funcionam bem** no React Native
4. **Precisão limitada** com documentos brasileiros

---

## ✅ SOLUÇÃO RECOMENDADA: Google ML Kit Vision

### Por que trocar Tesseract.js por ML Kit?

| Característica | Tesseract.js | Google ML Kit |
|----------------|--------------|---------------|
| **Velocidade** | 5-15 seg ⏱️ | 0.5-2 seg ⚡ |
| **Precisão** | 70-80% 📊 | 90-95% 🎯 |
| **Offline** | ✅ Sim | ✅ Sim |
| **Bundle Size** | +2-3MB ⬆️ | +0MB (nativo) 📱 |
| **Custo** | Grátis 💚 | Grátis 💚 |
| **Suporte a PT-BR** | Médio 🔶 | Excelente ✅ |

---

## 🔧 IMPLEMENTAÇÃO: Google ML Kit

### 1. Instalar Dependências

```bash
# Remover Tesseract.js
npm uninstall tesseract.js

# Instalar expo-ml-kit
npx expo install @react-native-ml-kit/text-recognition
```

### 2. Atualizar `src/lib/ocr.ts`

**Substituir o conteúdo atual por:**

```typescript
import TextRecognition from '@react-native-ml-kit/text-recognition';

// ========================
// TIPOS
// ========================

export interface ExtractedData {
  rawText: string;
  value?: number;
  date?: string;
  cnpj?: string;
  cpf?: string;
  supplier?: string; // Nome do fornecedor
  invoiceNumber?: string; // Número da nota fiscal
}

// ========================
// EXTRAÇÃO DE TEXTO (ML Kit)
// ========================

export const extractTextFromImage = async (
  imageUri: string
): Promise<string> => {
  try {
    console.log('🔍 Iniciando OCR com ML Kit...');
    
    const result = await TextRecognition.recognize(imageUri);
    
    if (!result || !result.text) {
      throw new Error('Nenhum texto detectado na imagem');
    }
    
    console.log('✅ Texto extraído com sucesso');
    return result.text;
  } catch (error: any) {
    console.error('❌ Erro no OCR:', error);
    throw new Error(`Erro ao processar imagem: ${error.message}`);
  }
};

// ========================
// EXTRAÇÃO DE DADOS ESTRUTURADOS
// ========================

export const extractDocumentData = async (
  imageUri: string,
  documentType: 'nota_fiscal' | 'recibo' | 'comprovante_pagamento' = 'nota_fiscal'
): Promise<ExtractedData> => {
  try {
    const text = await extractTextFromImage(imageUri);
    
    const extracted: ExtractedData = {
      rawText: text,
    };

    // ===== EXTRAÇÃO DE VALOR =====
    // Padrões: R$ 1.234,56 | 1234,56 | Total: 1.234,56
    const valuePatterns = [
      /(?:R\$|total|valor|vlr)[:\s]*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2}))/gi,
      /([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/g,
    ];

    for (const pattern of valuePatterns) {
      const match = text.match(pattern);
      if (match) {
        // Pega o maior valor encontrado (geralmente é o total)
        const values = match.map((m) => {
          const cleanValue = m
            .replace(/[^\d,]/g, '')
            .replace(/\./g, '')
            .replace(',', '.');
          return parseFloat(cleanValue);
        }).filter(v => !isNaN(v));
        
        if (values.length > 0) {
          extracted.value = Math.max(...values);
          console.log('✅ Valor encontrado:', extracted.value);
          break;
        }
      }
    }

    // ===== EXTRAÇÃO DE DATA =====
    // Padrões: DD/MM/YYYY | DD-MM-YYYY | DD.MM.YYYY
    const datePatterns = [
      /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/g,
      /(?:data|emissão|emissao)[:\s]*(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/gi,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        // Pega a primeira data encontrada
        const dateStr = match[0].replace(/[^\d\/\-\.]/gi, '');
        const parts = dateStr.split(/[\/\-\.]/);
        if (parts.length === 3) {
          const [day, month, year] = parts;
          // Valida a data
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          if (!isNaN(date.getTime())) {
            extracted.date = `${day}/${month}/${year}`;
            console.log('✅ Data encontrada:', extracted.date);
            break;
          }
        }
      }
    }

    // ===== EXTRAÇÃO DE CNPJ =====
    const cnpjPattern = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g;
    const cnpjMatch = text.match(cnpjPattern);
    if (cnpjMatch) {
      extracted.cnpj = cnpjMatch[0];
      console.log('✅ CNPJ encontrado:', extracted.cnpj);
    }

    // ===== EXTRAÇÃO DE CPF =====
    const cpfPattern = /\d{3}\.\d{3}\.\d{3}-\d{2}/g;
    const cpfMatch = text.match(cpfPattern);
    if (cpfMatch) {
      extracted.cpf = cpfMatch[0];
      console.log('✅ CPF encontrado:', extracted.cpf);
    }

    // ===== EXTRAÇÃO DE FORNECEDOR =====
    // Procura por linhas que parecem ser nome de empresa
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    for (const line of lines.slice(0, 10)) { // Verifica as primeiras 10 linhas
      // Se a linha tem mais de 5 caracteres e não é só números
      if (line.length > 5 && !/^\d+$/.test(line)) {
        // Se não contém palavras-chave de outros campos
        if (!/(?:cnpj|cpf|data|valor|total|nota|fiscal|recibo)/gi.test(line)) {
          extracted.supplier = line;
          console.log('✅ Possível fornecedor:', extracted.supplier);
          break;
        }
      }
    }

    // ===== EXTRAÇÃO DE NÚMERO DA NOTA FISCAL =====
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
          console.log('✅ Número da NF:', extracted.invoiceNumber);
          break;
        }
      }
    }

    console.log('📊 Dados extraídos:', extracted);
    return extracted;
  } catch (error: any) {
    console.error('❌ Erro ao extrair dados:', error);
    throw error;
  }
};

// ========================
// PRÉ-PROCESSAMENTO DE IMAGEM (OPCIONAL)
// ========================

/**
 * Melhora a qualidade da imagem antes do OCR
 * Aumenta contraste e nitidez
 */
export const preprocessImage = async (imageUri: string): Promise<string> => {
  // TODO: Implementar com expo-image-manipulator se necessário
  // Por enquanto, retorna a URI original
  return imageUri;
};

// ========================
// VALIDAÇÕES
// ========================

export const validateExtractedData = (data: ExtractedData): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (!data.value) {
    errors.push('Valor não detectado');
  } else if (data.value <= 0) {
    errors.push('Valor inválido');
  } else if (data.value > 1000000) {
    errors.push('Valor muito alto - verifique');
  }

  if (!data.date) {
    errors.push('Data não detectada');
  } else {
    // Valida se a data está no formato correto
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(data.date)) {
      errors.push('Data em formato inválido');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
```

---

## 📱 INTEGRAÇÃO NO ExpenseFormModal

### Atualizar a função de OCR no ExpenseFormModal.tsx:

```typescript
import { extractDocumentData, validateExtractedData } from '../lib/ocr';
import { showSuccess, showError, showWarning } from '../lib/toast';

// Quando o usuário seleciona uma foto
const handleImageSelected = async (imageUri: string, documentType: 'nota_fiscal' | 'recibo' | 'comprovante_pagamento') => {
  try {
    // Pergunta se quer extrair dados
    Alert.alert(
      '📄 Extrair Dados',
      'Deseja extrair os dados automaticamente desta imagem?',
      [
        {
          text: 'Não',
          style: 'cancel',
          onPress: () => {
            // Apenas adiciona a foto sem OCR
            addDocument(imageUri, documentType);
          },
        },
        {
          text: 'Sim',
          onPress: async () => {
            setOcrModalVisible(true);
            setOcrStatus('Processando imagem...');
            
            try {
              const extracted = await extractDocumentData(imageUri, documentType);
              
              // Valida dados extraídos
              const validation = validateExtractedData(extracted);
              
              // Preenche campos automaticamente
              let fieldsUpdated = 0;
              
              if (extracted.value) {
                setValue(formatCurrency(extracted.value.toString()));
                fieldsUpdated++;
              }
              
              if (extracted.date) {
                const parsedDate = dayjs(extracted.date, 'DD/MM/YYYY');
                if (parsedDate.isValid()) {
                  setDate(parsedDate.toDate());
                  fieldsUpdated++;
                }
              }
              
              if (extracted.supplier && !name) {
                setName(extracted.supplier);
                fieldsUpdated++;
              }
              
              // Adiciona o documento
              addDocument(imageUri, documentType);
              
              // Feedback
              if (fieldsUpdated > 0) {
                showSuccess(
                  'Dados extraídos!',
                  `${fieldsUpdated} campo(s) preenchido(s) automaticamente`
                );
              }
              
              // Mostra avisos se houver
              if (validation.errors.length > 0) {
                showWarning(
                  'Revise os dados',
                  validation.errors.join('\n')
                );
              }
              
            } catch (error: any) {
              console.error('❌ Erro no OCR:', error);
              showError('Erro no OCR', 'Não foi possível extrair os dados. Preencha manualmente.');
              
              // Adiciona o documento mesmo com erro
              addDocument(imageUri, documentType);
            } finally {
              setOcrModalVisible(false);
            }
          },
        },
      ]
    );
  } catch (error) {
    console.error('❌ Erro ao processar imagem:', error);
  }
};
```

---

## 🎨 MELHORIAS NO OCRProgressModal

### Adicionar mais feedback visual:

```typescript
import { ActivityIndicator, View, Text, Modal, StyleSheet } from 'react-native';
import { CheckCircle, AlertCircle } from 'lucide-react-native';

interface OCRProgressModalProps {
  visible: boolean;
  status: string;
  success?: boolean;
  error?: boolean;
}

export const OCRProgressModal = ({ visible, status, success, error }: OCRProgressModalProps) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {!success && !error && (
            <>
              <ActivityIndicator size="large" color="#0A84FF" />
              <Text style={styles.status}>{status}</Text>
            </>
          )}
          
          {success && (
            <>
              <CheckCircle size={48} color="#34C759" />
              <Text style={[styles.status, styles.successText]}>
                Dados extraídos com sucesso!
              </Text>
            </>
          )}
          
          {error && (
            <>
              <AlertCircle size={48} color="#FF3B30" />
              <Text style={[styles.status, styles.errorText]}>
                Erro ao processar imagem
              </Text>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    minWidth: 280,
  },
  status: {
    marginTop: 16,
    fontSize: 16,
    color: '#1C1C1E',
    textAlign: 'center',
  },
  successText: {
    color: '#34C759',
    fontWeight: '600',
  },
  errorText: {
    color: '#FF3B30',
    fontWeight: '600',
  },
});
```

---

## 📊 MÉTRICAS E ANALYTICS (OPCIONAL)

### Rastrear uso do OCR:

```typescript
// src/lib/analytics.ts

export const trackOCRUsage = async (data: {
  success: boolean;
  fieldsExtracted: number;
  documentType: string;
  processingTime: number; // em segundos
}) => {
  console.log('📊 OCR Analytics:', data);
  
  // TODO: Integrar com Firebase Analytics ou similar
  // analytics().logEvent('ocr_usage', data);
};

// No ExpenseFormModal, após OCR:
const startTime = Date.now();
// ... processamento OCR ...
const endTime = Date.now();

trackOCRUsage({
  success: fieldsUpdated > 0,
  fieldsExtracted: fieldsUpdated,
  documentType: 'nota_fiscal',
  processingTime: (endTime - startTime) / 1000,
});
```

---

## 🧪 TESTES

### Cenários de teste:

1. **✅ Nota Fiscal Nítida**
   - Foto com boa iluminação
   - Todos os dados visíveis
   - Esperado: 100% de precisão

2. **⚠️ Nota Fiscal Borrada**
   - Foto com baixa qualidade
   - Alguns dados ilegíveis
   - Esperado: 50-70% de precisão

3. **❌ Recibo Manuscrito**
   - Escrita à mão
   - Esperado: Baixa precisão, usar fallback

4. **✅ Comprovante Digital**
   - Screenshot de PDF
   - Alta qualidade
   - Esperado: 90-100% de precisão

---

## 🚀 PRÓXIMOS PASSOS

### Implementações Futuras:

1. **OCR em Lote** 📚
   ```typescript
   extractMultipleDocuments(imageUris: string[])
   ```

2. **Cache de Resultados** 💾
   ```typescript
   // Salvar resultados no AsyncStorage
   // Evitar reprocessamento da mesma imagem
   ```

3. **Machine Learning Personalizado** 🧠
   ```typescript
   // Treinar modelo específico para suas notas fiscais
   // Melhorar precisão com seus documentos
   ```

4. **API Fallback** ☁️
   ```typescript
   // Se ML Kit falhar, usar Google Vision API
   // Melhor precisão, mas requer internet
   ```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Remover Tesseract.js
- [ ] Instalar @react-native-ml-kit/text-recognition
- [ ] Atualizar src/lib/ocr.ts com ML Kit
- [ ] Atualizar OCRProgressModal com feedback visual
- [ ] Integrar no ExpenseFormModal
- [ ] Adicionar validações
- [ ] Testar com diferentes tipos de documentos
- [ ] Implementar analytics (opcional)
- [ ] Documentar casos de uso
- [ ] Treinar usuários

---

## 💰 ECONOMIA ESTIMADA

**Antes (Manual):**
- Tempo médio por despesa: 2 minutos
- 20 despesas/dia = 40 minutos/dia
- 20 dias/mês = 800 minutos/mês = **13,3 horas/mês**

**Depois (Com OCR):**
- Tempo médio por despesa: 20 segundos
- 20 despesas/dia = 6,6 minutos/dia
- 20 dias/mês = 132 minutos/mês = **2,2 horas/mês**

**ECONOMIA: 11 horas/mês ⏱️**

---

**Quer que eu implemente essas melhorias?** 🚀

Posso:
1. ✅ Criar os arquivos atualizados com ML Kit
2. ✅ Adicionar validações e feedback
3. ✅ Integrar no ExpenseFormModal
4. ✅ Adicionar testes e documentação

É só me dizer! 💪
