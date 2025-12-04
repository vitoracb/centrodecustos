-- Remover constraints NOT NULL que estão causando problemas na importação

-- employee_documents
ALTER TABLE employee_documents ALTER COLUMN document_type DROP NOT NULL;
ALTER TABLE employee_documents ALTER COLUMN employee DROP NOT NULL;

-- contracts  
ALTER TABLE contracts ALTER COLUMN date DROP NOT NULL;

-- Qualquer outra tabela com NOT NULL problemático
ALTER TABLE equipments ALTER COLUMN name DROP NOT NULL;
ALTER TABLE equipments ALTER COLUMN brand DROP NOT NULL;
ALTER TABLE equipments ALTER COLUMN year DROP NOT NULL;
