# 📤 ADICIONAR BOTÃO DE COMPARTILHAR RELATÓRIO

## 🎯 Objetivo:

Adicionar um botão "Compartilhar" no modal de prévia do relatório que permite compartilhar o PDF/Excel via WhatsApp, email, etc.

---

## 📦 Instalação de Dependência:

O React Native tem uma API nativa para compartilhar arquivos. Instale:

```bash
npx expo install expo-sharing
```

---

## ✅ PASSO 1: Modificar a função de exportação

### Arquivo: `lib/reportExport.ts` (ou onde estão as funções exportToPDF e exportToExcel)

Atualmente as funções **não retornam o caminho do arquivo**. Precisamos modificá-las para retornar o URI do arquivo salvo.

**ANTES (exemplo):**
```typescript
export const exportToPDF = async (data: ReportData) => {
  // ... código de geração ...
  await FileSystem.writeAsStringAsync(fileUri, pdfBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  
  await shareAsync(fileUri);
};
```

**DEPOIS:**
```typescript
export const exportToPDF = async (data: ReportData): Promise<string> => {
  // ... código de geração ...
  const fileUri = `${FileSystem.documentDirectory}relatorio_${timestamp}.pdf`;
  
  await FileSystem.writeAsStringAsync(fileUri, pdfBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  
  return fileUri; // ✅ RETORNA o caminho do arquivo
};

export const exportToExcel = async (data: ReportData): Promise<string> => {
  // ... código de geração ...
  const fileUri = `${FileSystem.documentDirectory}relatorio_${timestamp}.xlsx`;
  
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  
  return fileUri; // ✅ RETORNA o caminho do arquivo
};
```

---

## ✅ PASSO 2: Criar função de compartilhamento

### Arquivo: `lib/shareUtils.ts` (criar novo arquivo)

```typescript
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';

export const shareFile = async (fileUri: string, fileName: string) => {
  try {
    // Verifica se o compartilhamento está disponível
    const isAvailable = await Sharing.isAvailableAsync();
    
    if (!isAvailable) {
      Alert.alert(
        'Compartilhamento não disponível',
        'Seu dispositivo não suporta compartilhamento de arquivos.'
      );
      return;
    }

    // Compartilha o arquivo
    await Sharing.shareAsync(fileUri, {
      mimeType: fileUri.endsWith('.pdf') 
        ? 'application/pdf' 
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: `Compartilhar ${fileName}`,
      UTI: fileUri.endsWith('.pdf') ? 'com.adobe.pdf' : 'org.openxmlformats.spreadsheetml.sheet',
    });
  } catch (error: any) {
    console.error('❌ Erro ao compartilhar arquivo:', error);
    Alert.alert('Erro ao compartilhar', 'Não foi possível compartilhar o arquivo.');
  }
};
```

---

## ✅ PASSO 3: Modificar o FinanceiroScreen.tsx

### Localização: Função `handleDownloadClosureReport` (aproximadamente linha 705)

**ANTES:**
```typescript
const handleDownloadClosureReport = useCallback(async () => {
  if (!reportPreview) return;
  try {
    if (reportPreview.type === 'pdf') {
      await exportToPDF(reportPreview.data);
      showSuccess('Relatório exportado', 'O relatório PDF foi gerado com sucesso');
    } else {
      await exportToExcel(reportPreview.data);
      showSuccess('Relatório exportado', 'O relatório Excel foi gerado com sucesso');
    }
    setReportPreview(null);
  } catch (error: any) {
    showError('Erro ao exportar', error.message || 'Tente novamente');
  }
}, [reportPreview, showSuccess, showError]);
```

**DEPOIS:**
```typescript
const [savedReportUri, setSavedReportUri] = useState<string | null>(null);

const handleDownloadClosureReport = useCallback(async () => {
  if (!reportPreview) return;
  try {
    let fileUri: string;
    
    if (reportPreview.type === 'pdf') {
      fileUri = await exportToPDF(reportPreview.data);
      showSuccess('Relatório exportado', 'O relatório PDF foi gerado com sucesso');
    } else {
      fileUri = await exportToExcel(reportPreview.data);
      showSuccess('Relatório exportado', 'O relatório Excel foi gerado com sucesso');
    }
    
    // ✅ Salva o URI do arquivo para poder compartilhar depois
    setSavedReportUri(fileUri);
  } catch (error: any) {
    showError('Erro ao exportar', error.message || 'Tente novamente');
  }
}, [reportPreview, showSuccess, showError]);

// ✅ NOVA FUNÇÃO para compartilhar
const handleShareClosureReport = useCallback(async () => {
  if (!savedReportUri || !reportPreview) return;
  
  const fileName = reportPreview.type === 'pdf' 
    ? `Relatorio_${reportPreview.data.period.year}_${reportPreview.data.period.month || 'Anual'}.pdf`
    : `Relatorio_${reportPreview.data.period.year}_${reportPreview.data.period.month || 'Anual'}.xlsx`;
  
  await shareFile(savedReportUri, fileName);
}, [savedReportUri, reportPreview]);
```

---

## ✅ PASSO 4: Modificar o ReportPreviewModal

### Arquivo: `components/ReportPreviewModal.tsx`

**Adicione uma prop para a função de compartilhar:**

```typescript
interface ReportPreviewModalProps {
  visible: boolean;
  html?: string;
  onClose: () => void;
  onDownload: () => void;
  onShare?: () => void; // ✅ NOVA PROP
  downloadLabel?: string;
  title?: string;
}

export const ReportPreviewModal = ({
  visible,
  html,
  onClose,
  onDownload,
  onShare, // ✅ NOVA PROP
  downloadLabel = 'Baixar',
  title = 'Prévia do Relatório',
}: ReportPreviewModalProps) => {
  return (
    <Modal visible={visible} animationType="slide">
      {/* ... conteúdo da modal ... */}
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerButton, styles.closeButton]}
          onPress={onClose}
        >
          <Text style={styles.closeButtonText}>Fechar</Text>
        </TouchableOpacity>
        
        {/* ✅ BOTÃO DE COMPARTILHAR */}
        {onShare && (
          <TouchableOpacity
            style={[styles.footerButton, styles.shareButton]}
            onPress={onShare}
          >
            <Share size={18} color="#FFFFFF" />
            <Text style={styles.downloadButtonText}>Compartilhar</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.footerButton, styles.downloadButton]}
          onPress={onDownload}
        >
          <Download size={18} color="#FFFFFF" />
          <Text style={styles.downloadButtonText}>{downloadLabel}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};
```

**Adicione o import do ícone Share:**
```typescript
import { X, Download, Share } from 'lucide-react-native';
```

**Adicione os estilos para o botão de compartilhar:**
```typescript
const styles = StyleSheet.create({
  // ... estilos existentes ...
  
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  closeButton: {
    backgroundColor: '#F5F5F7',
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  shareButton: {
    backgroundColor: '#34C759', // Verde do WhatsApp
  },
  downloadButton: {
    backgroundColor: '#0A84FF',
  },
  downloadButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
```

---

## ✅ PASSO 5: Conectar tudo no FinanceiroScreen

**Localize o ReportPreviewModal (aproximadamente linha 1360):**

**ANTES:**
```typescript
<ReportPreviewModal
  visible={!!reportPreview}
  html={reportPreview?.html}
  onClose={() => setReportPreview(null)}
  onDownload={handleDownloadClosureReport}
  downloadLabel={reportPreview?.type === 'pdf' ? 'Baixar PDF' : 'Baixar Excel'}
  title="Prévia do Relatório de Fechamento"
/>
```

**DEPOIS:**
```typescript
<ReportPreviewModal
  visible={!!reportPreview}
  html={reportPreview?.html}
  onClose={() => {
    setReportPreview(null);
    setSavedReportUri(null); // ✅ Limpa o URI salvo ao fechar
  }}
  onDownload={handleDownloadClosureReport}
  onShare={savedReportUri ? handleShareClosureReport : undefined} // ✅ NOVA PROP
  downloadLabel={reportPreview?.type === 'pdf' ? 'Baixar PDF' : 'Baixar Excel'}
  title="Prévia do Relatório de Fechamento"
/>
```

---

## ✅ PASSO 6: Adicionar import no FinanceiroScreen

No topo do arquivo `FinanceiroScreen.tsx`:

```typescript
import { shareFile } from '../lib/shareUtils';
```

---

## 🎯 Fluxo Completo:

1. **Usuário clica em "Gerar Relatório PDF/Excel"**
2. Modal de prévia abre
3. **Usuário clica em "Baixar PDF/Excel"**
4. Arquivo é salvo localmente
5. URI do arquivo é armazenado em `savedReportUri`
6. **Botão "Compartilhar" aparece** (verde, ícone do WhatsApp)
7. **Usuário clica em "Compartilhar"**
8. Menu nativo do sistema abre
9. Usuário escolhe WhatsApp (ou email, Telegram, etc.)
10. Arquivo é enviado! 🎉

---

## 🧪 Como Testar:

1. Vá em Financeiro → Fechamento
2. Clique em "Gerar Relatório PDF"
3. Modal de prévia abre
4. Clique em "Baixar PDF"
5. ✅ Botão "Compartilhar" (verde) aparece
6. Clique em "Compartilhar"
7. ✅ Menu do sistema abre com WhatsApp, Email, etc.
8. Escolha WhatsApp
9. ✅ Arquivo é anexado na conversa

---

## 📱 Resultado Visual:

```
┌─────────────────────────────────────┐
│  Prévia do Relatório de Fechamento  │
├─────────────────────────────────────┤
│                                     │
│  [Prévia do HTML/PDF aqui]          │
│                                     │
├─────────────────────────────────────┤
│  [Fechar] [📤 Compartilhar] [⬇️ Baixar] │
└─────────────────────────────────────┘
```

---

## 💡 Melhorias Opcionais:

### Opção 1: Compartilhar direto sem baixar primeiro

Se quiser que o botão "Compartilhar" gere e compartilhe sem precisar baixar antes:

```typescript
const handleShareClosureReport = useCallback(async () => {
  if (!reportPreview) return;
  
  try {
    // Gera o arquivo
    let fileUri: string;
    if (reportPreview.type === 'pdf') {
      fileUri = await exportToPDF(reportPreview.data);
    } else {
      fileUri = await exportToExcel(reportPreview.data);
    }
    
    // Compartilha imediatamente
    const fileName = reportPreview.type === 'pdf' 
      ? `Relatorio_${reportPreview.data.period.year}.pdf`
      : `Relatorio_${reportPreview.data.period.year}.xlsx`;
    
    await shareFile(fileUri, fileName);
  } catch (error: any) {
    showError('Erro ao compartilhar', error.message || 'Tente novamente');
  }
}, [reportPreview, showError]);
```

### Opção 2: Compartilhar direto para WhatsApp

```typescript
import { Linking } from 'react-native';

const shareToWhatsApp = async (fileUri: string, message: string) => {
  const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
  
  const canOpen = await Linking.canOpenURL(whatsappUrl);
  if (canOpen) {
    await Linking.openURL(whatsappUrl);
    // Nota: WhatsApp não permite anexar arquivos via deep link
    // Então use o método de compartilhamento nativo acima
  }
};
```

---

**Qual opção você prefere?**
1. Botão "Compartilhar" que aparece **depois de baixar**
2. Botão "Compartilhar" que **gera e compartilha direto**

Me diga e eu ajusto o código! 🚀
