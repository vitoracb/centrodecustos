import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useEffect,
} from 'react';
import { Alert } from 'react-native';
import { CostCenter } from './CostCenterContext';
import { supabase } from '@/src/lib/supabaseClient';
import { uploadFileToStorage } from '@/src/lib/storageUtils';

export type ContractCategory = 'principal' | 'terceirizados';

export interface ContractDocument {
  id?: string;
  fileName: string;
  fileUri: string;
  mimeType?: string | null;
}

export interface Contract {
  id: string;
  name: string;
  category: ContractCategory;
  date: string;
  docs: number;
  value?: number;
  center: CostCenter;
  documents?: ContractDocument[];
  createdAt?: number;
}

interface ContractContextType {
  contracts: Contract[];
  loading: boolean;
  error: string | null;
  addContract: (contract: Omit<Contract, 'id' | 'docs'>) => Promise<void>;
  getContractsByCenter: (center: CostCenter) => Contract[];
  addDocumentToContract: (contractId: string, document: Omit<ContractDocument, 'id'>) => Promise<void>;
  getAllContracts: () => Contract[];
  refresh: () => Promise<void>;
}

const ContractContext = createContext<ContractContextType | undefined>(undefined);

export const useContracts = () => {
  const context = useContext(ContractContext);
  if (!context) {
    throw new Error('useContracts must be used within ContractProvider');
  }
  return context;
};

interface ContractProviderProps {
  children: ReactNode;
}

const allowedCenters: CostCenter[] = ['valenca', 'cna', 'cabralia'];

const normalizeCenter = (code?: string | null): CostCenter => {
  const normalized = code?.toLowerCase() ?? 'valenca';
  return (allowedCenters.includes(normalized as CostCenter)
    ? normalized
    : 'valenca') as CostCenter;
};

const isoToBr = (iso?: string | null): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = date.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const brToIso = (br?: string | null): string | null => {
  if (!br) return null;
  const [dd, mm, yyyy] = br.split('/');
  if (!dd || !mm || !yyyy) return null;
  return `${yyyy}-${mm}-${dd}`;
};

const mapRowToContract = (row: any, documents: ContractDocument[] = []): Contract => ({
  id: row.id,
  name: row.name ?? '',
  category: (row.category ?? 'principal') as ContractCategory,
  date: isoToBr(row.contract_date),
  docs: documents.length,
  value: row.value ? Number(row.value) : undefined,
  center: normalizeCenter(row.cost_centers?.code),
  documents,
  createdAt: row.created_at ? new Date(row.created_at).getTime() : undefined,
});

export const ContractProvider = ({ children }: ContractProviderProps) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadContracts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: contractsData, error: contractsError } = await supabase
        .from('contracts')
        .select(`
          id,
          name,
          category,
          contract_date,
          value,
          created_at,
          cost_centers ( code )
        `)
        .order('created_at', { ascending: false });

      if (contractsError) {
        console.error('❌ Erro ao carregar contratos:', contractsError);
        setError(contractsError.message);
        setLoading(false);
        return;
      }

      const { data: documentsData, error: documentsError } = await supabase
        .from('contract_documents')
        .select('id, contract_id, file_name, file_url, mime_type')
        .order('created_at', { ascending: false });

      if (documentsError) {
        console.error('❌ Erro ao carregar documentos de contratos:', documentsError);
      }

      const documentsByContract: Record<string, ContractDocument[]> = {};
      (documentsData ?? []).forEach((doc: any) => {
        if (!documentsByContract[doc.contract_id]) {
          documentsByContract[doc.contract_id] = [];
        }
        documentsByContract[doc.contract_id].push({
          id: doc.id,
          fileName: doc.file_name,
          fileUri: doc.file_url,
          mimeType: doc.mime_type ?? null,
        });
      });

      const mapped = (contractsData ?? []).map((row: any) =>
        mapRowToContract(row, documentsByContract[row.id] ?? []),
      );

      setContracts(mapped);
    } catch (err: any) {
      console.error('❌ Erro inesperado ao carregar contratos:', err);
      setError(err.message ?? 'Erro inesperado ao carregar contratos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  const getCostCenterId = useCallback(async (center: CostCenter) => {
    const { data, error } = await supabase
      .from('cost_centers')
      .select('id')
      .eq('code', center)
      .maybeSingle();

    if (error || !data) {
      throw new Error('Não foi possível encontrar o centro de custo informado.');
    }

    return data.id as string;
  }, []);

  const addContract = useCallback(
    async (contract: Omit<Contract, 'id' | 'docs'>) => {
      try {
        const costCenterId = await getCostCenterId(contract.center);

        // Garante que a categoria está em minúsculas e é um valor válido
        const normalizedCategory = contract.category.toLowerCase() as ContractCategory;
        if (normalizedCategory !== 'principal' && normalizedCategory !== 'terceirizados') {
          throw new Error(`Categoria inválida: ${contract.category}. Use 'principal' ou 'terceirizados'.`);
        }

        const payload: any = {
          name: contract.name,
          category: normalizedCategory,
          contract_date: brToIso(contract.date),
          cost_center_id: costCenterId,
        };

        if (contract.value !== undefined && contract.value !== null) {
          payload.value = contract.value;
        }

        const { data: contractData, error: contractError } = await supabase
          .from('contracts')
          .insert(payload)
          .select(`
            id,
            name,
            category,
            contract_date,
            value,
            created_at,
            cost_centers ( code )
          `)
          .maybeSingle();

        if (contractError || !contractData) {
          throw contractError ?? new Error('Erro ao criar contrato');
        }

        const documentsToUpload = contract.documents ?? [];
        const uploadedDocuments: ContractDocument[] = [];

        for (const doc of documentsToUpload) {
          const fileUrl = await uploadFileToStorage(
            doc.fileUri,
            doc.fileName,
            doc.mimeType,
            'documentos',
            'contracts',
          );

          if (!fileUrl) {
            console.warn('⚠️ Não foi possível fazer upload do documento:', doc.fileName);
            continue;
          }

          const { data: docData, error: docError } = await supabase
            .from('contract_documents')
            .insert({
              contract_id: contractData.id,
              file_name: doc.fileName,
              file_url: fileUrl,
              mime_type: doc.mimeType ?? null,
            })
            .select('id, file_name, file_url, mime_type')
            .maybeSingle();

          if (!docError && docData) {
            uploadedDocuments.push({
              id: docData.id,
              fileName: docData.file_name,
              fileUri: docData.file_url,
              mimeType: docData.mime_type ?? null,
            });
          }
        }

        const newContract = mapRowToContract(contractData, uploadedDocuments);
        // Preserva o value na memória local mesmo se não veio do banco
        // (a coluna 'value' precisa ser adicionada ao banco para persistir)
        if (contract.value !== undefined && contract.value !== null) {
          newContract.value = contract.value;
        }
        setContracts((prev) => [newContract, ...prev]);

        // Envia notificação push sobre novo contrato
        try {
          const { notificationService } = await import('@/src/lib/notifications');
          await notificationService.notifyNewContract(newContract.name, contract.center);
        } catch (notifError) {
          // Falha silenciosa - notificações não são críticas
          console.warn('Erro ao enviar notificação:', notifError);
        }
      } catch (err: any) {
        console.error('❌ Erro em addContract:', err);
        Alert.alert('Erro', 'Não foi possível salvar o contrato. Tente novamente.');
        throw err;
      }
    },
    [getCostCenterId],
  );

  const addDocumentToContract = useCallback(
    async (contractId: string, document: Omit<ContractDocument, 'id'>) => {
      try {
        const fileUrl = await uploadFileToStorage(
          document.fileUri,
          document.fileName,
          document.mimeType,
          'documentos',
          'contracts',
        );

        if (!fileUrl) {
          throw new Error('Não foi possível fazer upload do arquivo.');
        }

        const { data, error } = await supabase
          .from('contract_documents')
          .insert({
            contract_id: contractId,
            file_name: document.fileName,
            file_url: fileUrl,
            mime_type: document.mimeType ?? null,
          })
          .select('id, file_name, file_url, mime_type')
          .maybeSingle();

        if (error || !data) {
          throw error ?? new Error('Erro ao salvar documento');
        }

        const newDocument: ContractDocument = {
          id: data.id,
          fileName: data.file_name,
          fileUri: data.file_url,
          mimeType: data.mime_type ?? null,
        };

        setContracts((prev) =>
          prev.map((contract) => {
            if (contract.id !== contractId) return contract;
            const existingDocs = contract.documents ?? [];
            return {
              ...contract,
              documents: [...existingDocs, newDocument],
              docs: existingDocs.length + 1,
            };
          }),
        );
      } catch (err: any) {
        console.error('❌ Erro em addDocumentToContract:', err);
        Alert.alert('Erro', 'Não foi possível adicionar o documento.');
        throw err;
      }
    },
    [],
  );

  const getContractsByCenter = useCallback(
    (center: CostCenter) => contracts.filter((contract) => contract.center === center),
    [contracts],
  );

  const getAllContracts = useCallback(() => contracts, [contracts]);

  return (
    <ContractContext.Provider
      value={{
        contracts,
        loading,
        error,
        addContract,
        getContractsByCenter,
        addDocumentToContract,
        getAllContracts,
        refresh: loadContracts,
      }}
    >
      {children}
    </ContractContext.Provider>
  );
};
