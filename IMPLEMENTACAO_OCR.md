# 📄 Implementação de OCR (Optical Character Recognition)

## ✅ Status: Implementado

Sistema de OCR para extrair dados automaticamente de documentos (notas fiscais, recibos, comprovantes).

---

## 📦 Dependências

```bash
npm install tesseract.js
```

---

## 🎯 Funcionalidades

### 1. **Extração de Texto**
- Extrai todo o texto visível de uma imagem
- Suporta português (padrão) e outros idiomas

### 2. **Extração de Dados Estruturados**
- **Valor monetário**: Detecta valores em R$ (ex: R$ 1.234,56)
- **Data**: Detecta datas em formato DD/MM/YYYY
- **CNPJ**: Detecta CNPJs formatados (XX.XXX.XXX/XXXX-XX)
- **CPF**: Detecta CPFs formatados (XXX.XXX.XXX-XX)

### 3. **Preenchimento Automático**
- Preenche automaticamente os campos do formulário quando dados são encontrados
- Mostra feedback visual durante o processamento
- Permite revisão do texto extraído se dados não forem encontrados

---

## 📁 Arquivos Criados

### `src/lib/ocr.ts`
Serviço principal de OCR com as seguintes funções:

- `extractTextFromImage(imageUri, language?)`: Extrai texto de uma imagem
- `extractDocumentData(imageUri, documentType?)`: Extrai dados estruturados

### `src/components/OCRProgressModal.tsx`
Modal de progresso que mostra o status do processamento OCR.

---

## 🔧 Como Funciona

### 1. **Seleção de Imagem**
Quando o usuário seleciona uma foto (câmera ou galeria), o sistema pergunta se deseja extrair dados automaticamente.

### 2. **Processamento**
- Converte a imagem para base64
- Processa com Tesseract.js
- Extrai texto e dados estruturados

### 3. **Preenchimento Automático**
- Se encontrar valor: preenche o campo de valor
- Se encontrar data: preenche o campo de data
- Mostra toast de sucesso

### 4. **Feedback**
- Modal de progresso durante o processamento
- Toast de sucesso quando dados são encontrados
- Alert com texto extraído se não encontrar dados estruturados

---

## 📝 Uso no Código

### No ExpenseFormModal

```typescript
import { extractDocumentData } from '../lib/ocr';

// Quando uma imagem é selecionada
const handleExtractDataFromImage = async (imageUri: string, documentType: string) => {
  try {
    setOcrModalVisible(true);
    setOcrStatus('Processando imagem...');
    
    const extracted = await extractDocumentData(imageUri, documentType);
    
    // Preenche campos automaticamente
    if (extracted.value) {
      setValue(formatCurrency(extracted.value.toString()));
    }
    
    if (extracted.date) {
      const parsedDate = dayjs(extracted.date, 'DD/MM/YYYY');
      if (parsedDate.isValid()) {
        setDate(parsedDate.toDate());
      }
    }
  } catch (error) {
    showError('Erro no OCR', error.message);
  } finally {
    setOcrModalVisible(false);
  }
};
```

---

## ⚠️ Limitações e Considerações

### 1. **Performance**
- Tesseract.js pode ser lento em dispositivos móveis
- Processamento pode levar 5-15 segundos dependendo do tamanho da imagem
- Recomenda-se processar em background

### 2. **Precisão**
- A precisão depende da qualidade da imagem
- Imagens borradas ou com baixa resolução podem ter resultados imprecisos
- Recomenda-se usar imagens nítidas e bem iluminadas

### 3. **Compatibilidade**
- Tesseract.js funciona melhor no navegador
- Em React Native, pode ter limitações com Web Workers
- Alternativas: Google ML Kit (nativo) ou APIs externas (Google Vision, AWS Textract)

### 4. **Tamanho do Bundle**
- Tesseract.js adiciona ~2-3MB ao bundle
- Modelos de idioma são baixados sob demanda (primeira execução)

---

## 🚀 Melhorias Futuras

### 1. **API Externa (Recomendado)**
Para melhor precisão e performance, considere usar:
- **Google Vision API**: Alta precisão, suporte a múltiplos idiomas
- **AWS Textract**: Extração avançada de dados estruturados
- **Azure Computer Vision**: OCR com suporte a português

### 2. **Processamento em Background**
- Usar `expo-task-manager` para processar em background
- Cache de resultados para evitar reprocessamento

### 3. **Melhorias na Extração**
- Detectar mais campos (nome do fornecedor, número da nota, etc.)
- Machine Learning para melhorar precisão
- Suporte a múltiplos formatos de documento

### 4. **Otimizações**
- Redimensionar imagem antes do processamento
- Pré-processamento de imagem (contraste, brilho)
- Cache de modelos de idioma

---

## 📊 Padrões de Extração

### Valor Monetário
Detecta os seguintes padrões:
- `R$ 1.234,56`
- `1234.56 R$`
- `Total: R$ 1.234,56`
- `Valor: R$ 1.234,56`

### Data
Detecta os seguintes padrões:
- `DD/MM/YYYY` (ex: 30/11/2025)
- `DD-MM-YYYY` (ex: 30-11-2025)
- `Data: DD/MM/YYYY`
- `Emissão: DD/MM/YYYY`

### CNPJ
Detecta: `XX.XXX.XXX/XXXX-XX`

### CPF
Detecta: `XXX.XXX.XXX-XX`

---

## 🧪 Testes

Para testar o OCR:

1. Abra o formulário de despesa
2. Selecione uma foto de uma nota fiscal ou recibo
3. Quando perguntado, escolha "Sim" para extrair dados
4. Aguarde o processamento (5-15 segundos)
5. Verifique se os campos foram preenchidos automaticamente

---

## 📚 Referências

- [Tesseract.js Documentation](https://tesseract.projectnaptha.com/)
- [Google Vision API](https://cloud.google.com/vision/docs)
- [AWS Textract](https://aws.amazon.com/textract/)

---

## ✅ Status de Implementação

- [x] Serviço de OCR básico
- [x] Extração de texto
- [x] Extração de dados estruturados (valor, data, CNPJ, CPF)
- [x] Modal de progresso
- [x] Integração no ExpenseFormModal
- [x] Preenchimento automático de campos
- [ ] Processamento em background
- [ ] Cache de resultados
- [ ] Suporte a múltiplos idiomas
- [ ] Integração com APIs externas (opcional)

---

**Última atualização**: 30/11/2025

