-- Script para restaurar constraints após migração
-- Execute DEPOIS de rodar o script de migração com sucesso

-- 1. Restaurar NOT NULL (comentado porque alguns registros têm valores nulos)
-- ALTER TABLE contracts ALTER COLUMN date SET NOT NULL;
-- ALTER TABLE employee_documents ALTER COLUMN employee SET NOT NULL;

-- 2. Recriar foreign keys
ALTER TABLE equipments ADD CONSTRAINT equipments_cost_center_id_fkey 
  FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id);

ALTER TABLE contracts ADD CONSTRAINT contracts_cost_center_id_fkey 
  FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id);

ALTER TABLE orders ADD CONSTRAINT orders_cost_center_id_fkey 
  FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id);

ALTER TABLE orders ADD CONSTRAINT orders_equipment_id_fkey 
  FOREIGN KEY (equipment_id) REFERENCES equipments(id);

ALTER TABLE employee_documents ADD CONSTRAINT employee_documents_cost_center_id_fkey 
  FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id);

ALTER TABLE employee_documents ADD CONSTRAINT employee_documents_equipment_id_fkey 
  FOREIGN KEY (equipment_id) REFERENCES equipments(id);

ALTER TABLE contract_documents ADD CONSTRAINT contract_documents_contract_id_fkey 
  FOREIGN KEY (contract_id) REFERENCES contracts(id);

ALTER TABLE review_notifications ADD CONSTRAINT review_notifications_equipment_id_fkey 
  FOREIGN KEY (equipment_id) REFERENCES equipments(id);

ALTER TABLE financial_transactions ADD CONSTRAINT financial_transactions_cost_center_id_fkey 
  FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id);

ALTER TABLE financial_transactions ADD CONSTRAINT financial_transactions_equipment_id_fkey 
  FOREIGN KEY (equipment_id) REFERENCES equipments(id);

ALTER TABLE financial_transactions ADD CONSTRAINT financial_transactions_contract_id_fkey 
  FOREIGN KEY (contract_id) REFERENCES contracts(id);
