/**
 * Serviço de OCR (Optical Character Recognition)
 * Extrai texto e dados de documentos (notas fiscais, recibos, etc.)
 * 
 * Usa Tesseract.js - Gratuito, offline e funciona no Expo Go
 * 
 * NOTA: Usa fetch() em vez de expo-file-system para evitar APIs depreciadas
 */

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
  supplier?: string; // Nome do fornecedor
  invoiceNumber?: string; // Número da nota fiscal
}

// ========================
// EXTRAÇÃO DE TEXTO COM TESSERACT.JS (VERSÃO COM FETCH)
// ========================

/**
 * Extrai texto de uma imagem usando Tesseract.js
 * 
 * Vantagens:
 * - ✅ Grátis (sem custos)
 * - ✅ Funciona offline
 * - ✅ Privacidade total (dados não saem do dispositivo)
 * - ✅ Sem limite de uso
 * - ✅ Usa fetch() - sem dependência de APIs depreciadas
 * 
 * Desvantagens:
 * - ⏱️ Mais lento (5-15 segundos por imagem)
 * - 📊 Precisão menor (~70-80% vs 90-95% das APIs)
 */
export const extractTextFromImage = async (
  imageUri: string,
  onProgress?: (progress: number, status: string) => void
): Promise<string> => {
  try {
    console.log('🔍 Iniciando OCR com Tesseract.js...');
    console.log('📁 URI da imagem:', imageUri);
    
    // Usa fetch para ler o arquivo (universal, sem depender de APIs do Expo)
    const response = await fetch(imageUri);
    
    if (!response.ok) {
      throw new Error(`Erro ao ler arquivo: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log('📦 Blob criado, tamanho:', blob.size, 'bytes');
    
    // Converte blob para base64 usando FileReader
    const base64Image = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onloadend = () => {
        try {
          const result = reader.result as string;
          if (!result) {
            reject(new Error('Erro ao converter blob para base64'));
            return;
          }
          // Remove o prefixo "data:image/...;base64,"
          const base64 = result.split(',')[1];
          if (!base64) {
            reject(new Error('Erro ao extrair base64 do resultado'));
            return;
          }
          resolve(base64);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Erro ao ler arquivo com FileReader'));
      reader.readAsDataURL(blob);
    });

    console.log('✅ Imagem convertida para base64');
    console.log('📊 Tamanho do base64:', base64Image.length, 'caracteres');

    // Processa com Tesseract.js
    console.log('🤖 Iniciando processamento OCR...');
    const result = await Tesseract.recognize(
      `data:image/jpeg;base64,${base64Image}`,
      'por', // Português brasileiro
      {
        logger: (m) => {
          const progress = m.progress || 0;
          const status = m.status || 'Processando...';
          
          if (onProgress) {
            onProgress(progress, status);
          }
          
          if (__DEV__) {
            if (m.status === 'recognizing text') {
              console.log(`📊 Progresso do OCR: ${Math.round(progress * 100)}% - ${status}`);
            }
          }
        },
      }
    );

    if (!result || !result.data || !result.data.text) {
      throw new Error('Nenhum texto detectado na imagem');
    }

    const extractedText = result.data.text.trim();
    
    if (extractedText.length === 0) {
      throw new Error('Texto extraído está vazio. A imagem pode não conter texto legível.');
    }
    
    console.log('✅ OCR concluído com sucesso!');
    console.log('📝 Tamanho do texto extraído:', extractedText.length, 'caracteres');
    console.log('📝 Preview (primeiros 150 chars):', extractedText.substring(0, 150));
    
    return extractedText;
  } catch (error: any) {
    console.error('❌ Erro no OCR:', error);
    console.error('❌ Stack trace:', error.stack);
    
    // Mensagens de erro mais amigáveis
    if (error.message?.includes('fetch')) {
      throw new Error('Erro ao acessar a imagem. Verifique se o arquivo existe e está acessível.');
    } else if (error.message?.includes('FileReader')) {
      throw new Error('Erro ao processar a imagem. Tente novamente com outra foto.');
    } else if (error.message?.includes('Tesseract')) {
      throw new Error('Erro ao processar imagem com OCR. Verifique se a imagem está nítida.');
    }
    
    throw new Error(`Erro ao processar imagem: ${error.message || 'Erro desconhecido'}`);
  }
};

// ========================
// EXTRAÇÃO DE DADOS ESTRUTURADOS
// ========================

/**
 * Extrai dados estruturados de um documento
 * Esta função processa o texto extraído e identifica valores, datas, etc.
 */
export const extractDocumentData = async (
  imageUri: string,
  documentType: 'nota_fiscal' | 'recibo' | 'comprovante_pagamento' = 'nota_fiscal',
  onProgress?: (progress: number, status: string) => void
): Promise<ExtractedData> => {
  try {
    console.log('🔍 Extraindo dados estruturados...');
    console.log('📄 Tipo de documento:', documentType);

    // Primeiro, extrai o texto
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
    const datePatterns = [
      /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/g,
      /(?:data|emissão|emissao)[:\s]*(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/gi,
    ];

    for (const pattern of datePatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        const dateStr = matches[0].replace(/[^\d\/\-\.]/gi, '');
        const parts = dateStr.split(/[\/\-\.]/);
        
        if (parts.length === 3) {
          const [day, month, year] = parts;
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
              !lowerLine.includes('r$') &&
              !lowerLine.includes('recibo')) {
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

// ========================
// PRÉ-PROCESSAMENTO DE IMAGEM (OPCIONAL)
// ========================

/**
 * Melhora a qualidade da imagem antes do OCR
 * Aumenta contraste e nitidez
 * 
 * TODO: Implementar com expo-image-manipulator se necessário
 */
export const preprocessImage = async (imageUri: string): Promise<string> => {
  // Por enquanto, retorna a URI original
  // Futuro: redimensionar, aumentar contraste, etc.
  return imageUri;
};
