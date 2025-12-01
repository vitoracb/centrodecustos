# 🔧 Guia de Implementação de OCR com API Externa

## ⚠️ Status Atual

O código atual está preparado para receber uma implementação de OCR, mas **requer uma API externa** para funcionar.

**Por quê?**
- ML Kit do Google requer código nativo (não funciona com Expo puro)
- Tesseract.js é lento e tem limitações no React Native
- A melhor solução para Expo é usar uma API externa

---

## ✅ Opções Recomendadas

### 1. **Google Vision API** (Recomendado)
- ✅ Alta precisão (90-95%)
- ✅ Suporte a português brasileiro
- ✅ Extração avançada de dados estruturados
- ⚠️ Requer internet
- ⚠️ Tem custo (mas tem tier gratuito)

### 2. **AWS Textract**
- ✅ Extração avançada de dados estruturados
- ✅ Suporte a formulários e tabelas
- ⚠️ Requer internet
- ⚠️ Tem custo

### 3. **Azure Computer Vision**
- ✅ Boa precisão
- ✅ Suporte a português
- ⚠️ Requer internet
- ⚠️ Tem custo

---

## 🚀 Implementação com Google Vision API

### Passo 1: Criar Conta e Obter API Key

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um projeto ou selecione um existente
3. Ative a **Cloud Vision API**
4. Crie uma **API Key** em "Credenciais"
5. Adicione a chave ao `.env`:

```env
EXPO_PUBLIC_GOOGLE_VISION_API_KEY=sua_chave_aqui
```

### Passo 2: Instalar Dependências

```bash
npm install axios
```

### Passo 3: Atualizar `src/lib/ocr.ts`

Substitua a função `extractTextFromImage` por:

```typescript
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

const GOOGLE_VISION_API_KEY = Constants.expoConfig?.extra?.googleVisionApiKey || 
                               process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY;

export const extractTextFromImage = async (
  imageUri: string
): Promise<string> => {
  try {
    if (!GOOGLE_VISION_API_KEY) {
      throw new Error('Google Vision API Key não configurada. Adicione EXPO_PUBLIC_GOOGLE_VISION_API_KEY no .env');
    }

    console.log('🔍 Iniciando OCR com Google Vision API...');
    
    // Converte imagem para base64
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Chama a API do Google Vision
    const response = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      {
        requests: [
          {
            image: {
              content: base64,
            },
            features: [
              {
                type: 'TEXT_DETECTION',
                maxResults: 1,
              },
            ],
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const textAnnotations = response.data.responses[0]?.textAnnotations;
    
    if (!textAnnotations || textAnnotations.length === 0) {
      throw new Error('Nenhum texto detectado na imagem');
    }

    // O primeiro elemento contém todo o texto
    const fullText = textAnnotations[0].description || '';
    
    console.log('✅ Texto extraído com sucesso');
    return fullText;
  } catch (error: any) {
    console.error('❌ Erro no OCR:', error);
    
    if (error.response) {
      throw new Error(`Erro da API: ${error.response.data.error?.message || error.message}`);
    }
    
    throw new Error(`Erro ao processar imagem: ${error.message}`);
  }
};
```

### Passo 4: Atualizar `app.config.js`

```javascript
export default {
  expo: {
    // ... outras configurações
    extra: {
      googleVisionApiKey: process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY,
    },
  },
};
```

---

## 🔒 Segurança

### ⚠️ IMPORTANTE: Proteger a API Key

**NÃO** exponha a API Key no código do cliente! Para produção:

1. **Crie um backend proxy** que chama a API do Google
2. **Use variáveis de ambiente** no servidor
3. **Implemente rate limiting** para evitar abusos
4. **Use quotas** no Google Cloud para limitar custos

### Exemplo de Backend Proxy (Node.js/Express)

```javascript
// server/api/ocr.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

router.post('/ocr', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    
    // Validação básica
    if (!imageBase64) {
      return res.status(400).json({ error: 'Imagem não fornecida' });
    }

    // Chama Google Vision API (chave no servidor)
    const response = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`,
      {
        requests: [
          {
            image: { content: imageBase64 },
            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
          },
        ],
      }
    );

    const text = response.data.responses[0]?.textAnnotations?.[0]?.description || '';
    
    res.json({ text });
  } catch (error) {
    console.error('Erro no OCR:', error);
    res.status(500).json({ error: 'Erro ao processar OCR' });
  }
});

module.exports = router;
```

### Atualizar `src/lib/ocr.ts` para usar o proxy:

```typescript
const OCR_API_URL = process.env.EXPO_PUBLIC_OCR_API_URL || 'https://seu-backend.com/api/ocr';

export const extractTextFromImage = async (
  imageUri: string
): Promise<string> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const response = await axios.post(OCR_API_URL, {
      imageBase64: base64,
    });

    return response.data.text;
  } catch (error: any) {
    throw new Error(`Erro ao processar imagem: ${error.message}`);
  }
};
```

---

## 💰 Custos Estimados

### Google Vision API
- **Primeiros 1.000 requests/mês**: Grátis
- **Depois**: $1.50 por 1.000 requests
- **Custo estimado para 1.000 despesas/mês**: ~$1.50

### AWS Textract
- **Primeiros 1.000 páginas/mês**: Grátis
- **Depois**: $1.50 por 1.000 páginas
- **Custo estimado**: Similar ao Google

---

## 🧪 Testes

Após implementar, teste com:

1. ✅ Nota fiscal nítida (boa iluminação)
2. ✅ Recibo digital (screenshot)
3. ⚠️ Foto borrada (deve ter menor precisão)
4. ❌ Documento manuscrito (pode não funcionar bem)

---

## 📝 Próximos Passos

1. [ ] Escolher API (Google Vision recomendado)
2. [ ] Criar conta e obter API Key
3. [ ] Implementar função `extractTextFromImage` com a API escolhida
4. [ ] Criar backend proxy (recomendado para produção)
5. [ ] Testar com documentos reais
6. [ ] Configurar quotas e limites
7. [ ] Monitorar custos

---

**Última atualização**: 30/11/2025

