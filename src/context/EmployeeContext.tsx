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

export interface EmployeeDocument {
  id: string;
  employee: string;
  documentName: string;
  date: string;
  fileName: string;
  fileUri: string;
  mimeType?: string | null;
  equipmentId: string;
  center: CostCenter;
  createdAt?: number;
  deletedAt?: number; // Timestamp quando foi deletado (soft delete)
}

type DocumentsByCenter = Record<CostCenter, Record<string, EmployeeDocument[]>>;

interface EmployeeContextType {
  documentsByCenter: DocumentsByCenter;
  addEmployeeDocument: (document: Omit<EmployeeDocument, 'id'>) => void;
  updateEmployeeDocument: (id: string, document: Partial<EmployeeDocument>) => void;
  deleteEmployeeDocument: (id: string) => void;
  deleteEmployee: (employeeName: string, equipmentId: string, center: CostCenter) => void;
  getEmployeesByCenter: (center: CostCenter) => string[];
  getEmployeesCountByCenter: (center: CostCenter) => number;
  getAllEmployeeDocuments: () => EmployeeDocument[];
  loadDocuments: () => Promise<void>;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

export const useEmployees = () => {
  const context = useContext(EmployeeContext);
  if (!context) {
    throw new Error('useEmployees must be used within EmployeeProvider');
  }
  return context;
};

interface EmployeeProviderProps {
  children: ReactNode;
}

const createEmptyDocumentsMap = (): DocumentsByCenter => ({
  valenca: {},
  cna: {},
  cabralia: {},
});

const normalizeCenter = (code?: string | null): CostCenter => {
  // Normaliza o código para minúsculas e usa 'valenca' como fallback
  return (code?.toLowerCase().trim() || 'valenca') as CostCenter;
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

const mapRowToDocument = (row: any): EmployeeDocument => ({
  id: row.id,
  employee: row.employee_name ?? '',
  documentName: row.document_name ?? '',
  date: isoToBr(row.document_date),
  fileName: row.file_name ?? 'Documento',
  fileUri: row.file_url ?? '',
  mimeType: row.mime_type ?? null,
  equipmentId: row.equipment_id,
  center: normalizeCenter(row.cost_centers?.code),
  createdAt: row.created_at ? new Date(row.created_at).getTime() : undefined,
  deletedAt: row.deleted_at ? new Date(row.deleted_at).getTime() : undefined,
});

const insertDocumentIntoMap = (
  map: DocumentsByCenter,
  document: EmployeeDocument,
): DocumentsByCenter => {
  const next = {
    ...map,
    [document.center]: { ...map[document.center] },
  };

  const equipmentDocs = next[document.center][document.equipmentId] ?? [];
  next[document.center][document.equipmentId] = [document, ...equipmentDocs];
  return next;
};

const removeDocumentFromMap = (map: DocumentsByCenter, id: string): DocumentsByCenter => {
  const next: DocumentsByCenter = {
    valenca: { ...map.valenca },
    cna: { ...map.cna },
    cabralia: { ...map.cabralia },
  };

  (Object.keys(next) as CostCenter[]).forEach(center => {
    const equipmentDocsMap = next[center];
    Object.keys(equipmentDocsMap).forEach(equipmentId => {
      const docs = equipmentDocsMap[equipmentId];
      if (!docs) return;
      const filtered = docs.filter(doc => doc.id !== id);
      if (filtered.length === 0) {
        delete equipmentDocsMap[equipmentId];
      } else {
        equipmentDocsMap[equipmentId] = filtered;
      }
    });
  });

  return next;
};

const findDocumentById = (
  map: DocumentsByCenter,
  id: string,
): { document: EmployeeDocument | null; center?: CostCenter; equipmentId?: string } => {
  for (const centerKey of Object.keys(map) as CostCenter[]) {
    const equipmentDocs = map[centerKey];
    for (const equipmentId of Object.keys(equipmentDocs)) {
      const docs = equipmentDocs[equipmentId];
      if (!docs) continue;
      const document = docs.find(doc => doc.id === id);
      if (document) {
        return { document, center: centerKey, equipmentId };
      }
    }
  }
  return { document: null };
};

export const EmployeeProvider = ({ children }: EmployeeProviderProps) => {
  const [documentsByCenter, setDocumentsByCenter] = useState<DocumentsByCenter>(
    createEmptyDocumentsMap(),
  );

  const loadDocuments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('employee_documents')
        .select(`
          id,
          employee_name,
          document_name,
          document_date,
          file_name,
          file_url,
          mime_type,
          equipment_id,
          created_at,
          deleted_at,
          cost_centers ( code )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao carregar documentos de funcionários:', error);
        return;
      }

      const mapped = (data ?? []).map(mapRowToDocument);
      const nextMap = createEmptyDocumentsMap();
      mapped.forEach(doc => {
        if (!doc.equipmentId) return;
        // Inclui todos os documentos (incluindo deletados) para rastreamento de atividades
        nextMap[doc.center][doc.equipmentId] = nextMap[doc.center][doc.equipmentId]
          ? [...nextMap[doc.center][doc.equipmentId], doc]
          : [doc];
      });
      setDocumentsByCenter(nextMap);
    } catch (err) {
      console.error('❌ Erro inesperado ao carregar documentos de funcionários:', err);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

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

  const addEmployeeDocument = useCallback(
    (document: Omit<EmployeeDocument, 'id'>) => {
      (async () => {
        try {
          const costCenterId = await getCostCenterId(document.center);

          const fileUrl = await uploadFileToStorage(
            document.fileUri,
            document.fileName,
            document.mimeType,
            'documentos',
            'employees',
          );

          if (!fileUrl) {
            throw new Error('Não foi possível enviar o arquivo.');
          }

          const payload = {
            employee_name: document.employee,
            document_name: document.documentName,
            document_date: brToIso(document.date),
            file_name: document.fileName,
            file_url: fileUrl,
            mime_type: document.mimeType ?? null,
            equipment_id: document.equipmentId,
            cost_center_id: costCenterId,
          };

          const { data, error } = await supabase
            .from('employee_documents')
            .insert(payload)
            .select(`
              id,
              employee_name,
              document_name,
              document_date,
              file_name,
              file_url,
              mime_type,
              equipment_id,
              created_at,
              cost_centers ( code )
            `)
            .maybeSingle();

          if (error || !data) {
            throw error;
          }

          const mapped = mapRowToDocument(data);
          setDocumentsByCenter(prev => insertDocumentIntoMap(prev, mapped));
        } catch (err) {
          console.error('❌ Erro em addEmployeeDocument:', err);
          Alert.alert('Erro', 'Não foi possível salvar o funcionário. Tente novamente.');
        }
      })();
    },
    [getCostCenterId],
  );

  const updateEmployeeDocument = useCallback(
    (id: string, updates: Partial<EmployeeDocument>) => {
      (async () => {
        try {
          const { document } = findDocumentById(documentsByCenter, id);
          if (!document) {
            throw new Error('Documento não encontrado para atualização.');
          }

          let nextFileUri = updates.fileUri ?? document.fileUri;
          let nextFileName = updates.fileName ?? document.fileName;
          let nextMimeType = updates.mimeType ?? document.mimeType ?? null;

          const isLocalFile =
            updates.fileUri && !updates.fileUri.startsWith('http') && !updates.fileUri.startsWith('https');

          if (isLocalFile && updates.fileUri) {
            const uploaded = await uploadFileToStorage(
              updates.fileUri,
              nextFileName,
              updates.mimeType ?? document.mimeType,
              'documentos',
              'employees',
            );
            if (!uploaded) {
              throw new Error('Não foi possível enviar o arquivo.');
            }
            nextFileUri = uploaded;
          }

          const nextCenter = updates.center ?? document.center;
          const nextEquipmentId = updates.equipmentId ?? document.equipmentId;
          let costCenterId: string | undefined;

          if (nextCenter !== document.center) {
            costCenterId = await getCostCenterId(nextCenter);
          }

          const payload: any = {
            employee_name: updates.employee ?? document.employee,
            document_name: updates.documentName ?? document.documentName,
            document_date: brToIso(updates.date ?? document.date),
            file_name: nextFileName,
            file_url: nextFileUri,
            mime_type: nextMimeType,
            equipment_id: nextEquipmentId,
          };

          if (costCenterId) {
            payload.cost_center_id = costCenterId;
          }

          const { data, error } = await supabase
            .from('employee_documents')
            .update(payload)
            .eq('id', id)
            .select(`
              id,
              employee_name,
              document_name,
              document_date,
              file_name,
              file_url,
              mime_type,
              equipment_id,
              created_at,
              cost_centers ( code )
            `)
            .maybeSingle();

          if (error || !data) {
            throw error;
          }

          const mapped = mapRowToDocument(data);
          setDocumentsByCenter(prev =>
            insertDocumentIntoMap(removeDocumentFromMap(prev, mapped.id), mapped),
          );
        } catch (err) {
          console.error('❌ Erro em updateEmployeeDocument:', err);
          Alert.alert('Erro', 'Não foi possível atualizar o funcionário.');
        }
      })();
    },
    [documentsByCenter, getCostCenterId],
  );

  const deleteEmployeeDocument = useCallback((id: string) => {
    (async () => {
      try {
        // Soft delete: marca como deletado ao invés de remover
        const deletedAt = new Date().toISOString();
        const { error } = await supabase
          .from('employee_documents')
          .update({ deleted_at: deletedAt })
          .eq('id', id);
        
        if (error) {
          throw error;
        }
        
        // Atualiza o estado marcando como deletado
        setDocumentsByCenter(prev => {
          const updated = { ...prev };
          (Object.keys(updated) as CostCenter[]).forEach(center => {
            const equipmentDocsMap = updated[center];
            Object.keys(equipmentDocsMap).forEach(equipmentId => {
              const docs = equipmentDocsMap[equipmentId];
              if (docs) {
                equipmentDocsMap[equipmentId] = docs.map(doc =>
                  doc.id === id
                    ? { ...doc, deletedAt: new Date(deletedAt).getTime() }
                    : doc
                );
              }
            });
          });
          return updated;
        });
      } catch (err) {
        console.error('❌ Erro em deleteEmployeeDocument:', err);
        Alert.alert('Erro', 'Não foi possível excluir o documento.');
      }
    })();
  }, []);

  const deleteEmployee = useCallback((employeeName: string, equipmentId: string, center: CostCenter) => {
    (async () => {
      try {
        // Busca todos os documentos do funcionário neste equipamento
        const centerDocs = documentsByCenter[center] ?? {};
        const equipmentDocs = centerDocs[equipmentId] ?? [];
        const employeeDocs = equipmentDocs.filter(doc => 
          doc.employee === employeeName && !doc.deletedAt
        );

        if (employeeDocs.length === 0) {
          Alert.alert('Aviso', 'Nenhum documento encontrado para este funcionário.');
          return;
        }

        // Soft delete: marca todos os documentos como deletados
        const deletedAt = new Date().toISOString();
        const docIds = employeeDocs.map(doc => doc.id);
        
        const { error } = await supabase
          .from('employee_documents')
          .update({ deleted_at: deletedAt })
          .in('id', docIds);
        
        if (error) {
          throw error;
        }
        
        // Atualiza o estado marcando todos os documentos como deletados
        setDocumentsByCenter(prev => {
          const updated = { ...prev };
          const equipmentDocsMap = updated[center];
          if (equipmentDocsMap && equipmentDocsMap[equipmentId]) {
            equipmentDocsMap[equipmentId] = equipmentDocsMap[equipmentId].map(doc =>
              docIds.includes(doc.id)
                ? { ...doc, deletedAt: new Date(deletedAt).getTime() }
                : doc
            );
          }
          return updated;
        });
      } catch (err) {
        console.error('❌ Erro em deleteEmployee:', err);
        Alert.alert('Erro', 'Não foi possível excluir o funcionário.');
      }
    })();
  }, [documentsByCenter]);

  const getEmployeesByCenter = useCallback(
    (center: CostCenter): string[] => {
      const centerDocs = documentsByCenter[center] ?? {};
      const employees = new Set<string>();
      Object.values(centerDocs).forEach(equipmentDocs => {
        equipmentDocs.forEach(doc => {
          // Exclui funcionários com documentos deletados
          if (!doc.deletedAt) {
            employees.add(doc.employee);
          }
        });
      });
      return Array.from(employees);
    },
    [documentsByCenter],
  );

  const getEmployeesCountByCenter = useCallback(
    (center: CostCenter) => getEmployeesByCenter(center).length,
    [getEmployeesByCenter],
  );

  const getAllEmployeeDocuments = useCallback((): EmployeeDocument[] => {
    const allDocuments: EmployeeDocument[] = [];
    Object.values(documentsByCenter).forEach(centerDocs => {
      Object.values(centerDocs).forEach(equipmentDocs => {
        allDocuments.push(...equipmentDocs);
      });
    });
    return allDocuments;
  }, [documentsByCenter]);

  return (
    <EmployeeContext.Provider
      value={{
        documentsByCenter,
        addEmployeeDocument,
        updateEmployeeDocument,
        deleteEmployeeDocument,
        deleteEmployee,
        getEmployeesByCenter,
        getEmployeesCountByCenter,
        getAllEmployeeDocuments,
        loadDocuments,
      }}
    >
      {children}
    </EmployeeContext.Provider>
  );
};
