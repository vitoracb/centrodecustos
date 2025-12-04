-- TODAS AS COLUNAS DE TODAS AS TABELAS
-- Execute este SQL no banco NOVO

-- COST_CENTERS (4 colunas)
ALTER TABLE cost_centers ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE cost_centers ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE cost_centers ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE cost_centers ADD COLUMN IF NOT EXISTS created_at TEXT;

-- EQUIPMENTS (15 colunas)
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS year INTEGER;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS purchase_date TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS active BOOLEAN;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS created_at TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS next_review_date TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS deleted_at TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS current_hours INTEGER;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS hours_per_revision INTEGER;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS last_revision_hours TEXT;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS next_revision_hours INTEGER;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS hours_until_revision INTEGER;
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS cost_center_id TEXT;

-- EQUIPMENT_DOCUMENTS (9 colunas)
ALTER TABLE equipment_documents ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE equipment_documents ADD COLUMN IF NOT EXISTS equipment_id TEXT;
ALTER TABLE equipment_documents ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE equipment_documents ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE equipment_documents ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE equipment_documents ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE equipment_documents ADD COLUMN IF NOT EXISTS created_at TEXT;
ALTER TABLE equipment_documents ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE equipment_documents ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- EQUIPMENT_PHOTOS (7 colunas)
ALTER TABLE equipment_photos ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE equipment_photos ADD COLUMN IF NOT EXISTS equipment_id TEXT;
ALTER TABLE equipment_photos ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE equipment_photos ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE equipment_photos ADD COLUMN IF NOT EXISTS uploaded_at TEXT;
ALTER TABLE equipment_photos ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE equipment_photos ADD COLUMN IF NOT EXISTS file_name TEXT;

-- EQUIPMENT_REVIEWS (8 colunas)
ALTER TABLE equipment_reviews ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE equipment_reviews ADD COLUMN IF NOT EXISTS equipment_id TEXT;
ALTER TABLE equipment_reviews ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE equipment_reviews ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE equipment_reviews ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE equipment_reviews ADD COLUMN IF NOT EXISTS next_date TEXT;
ALTER TABLE equipment_reviews ADD COLUMN IF NOT EXISTS cost TEXT;
ALTER TABLE equipment_reviews ADD COLUMN IF NOT EXISTS created_at TEXT;

-- CONTRACTS (10 colunas)
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_date TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS active BOOLEAN;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS created_at TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS value INTEGER;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS deleted_at TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS cost_center_id TEXT;

-- CONTRACT_DOCUMENTS (7 colunas)
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS contract_id TEXT;
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS created_at TEXT;
ALTER TABLE contract_documents ADD COLUMN IF NOT EXISTS deleted_at TEXT;

-- ORDERS (12 colunas)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_date TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quote_file_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quote_file_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quote_file_mime_type TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS equipment_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cost_center_id TEXT;

-- ORDER_DOCUMENTS (8 colunas)
ALTER TABLE order_documents ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE order_documents ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE order_documents ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE order_documents ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE order_documents ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE order_documents ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE order_documents ADD COLUMN IF NOT EXISTS created_at TEXT;
ALTER TABLE order_documents ADD COLUMN IF NOT EXISTS approved BOOLEAN;

-- EMPLOYEE_DOCUMENTS (11 colunas)
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS employee_name TEXT;
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS document_name TEXT;
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS document_date TEXT;
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS equipment_id TEXT;
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS created_at TEXT;
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS deleted_at TEXT;
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS cost_center_id TEXT;

-- FIXED_EXPENSES (6 colunas)
ALTER TABLE fixed_expenses ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE fixed_expenses ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE fixed_expenses ADD COLUMN IF NOT EXISTS value INTEGER;
ALTER TABLE fixed_expenses ADD COLUMN IF NOT EXISTS day_of_month INTEGER;
ALTER TABLE fixed_expenses ADD COLUMN IF NOT EXISTS cost_center_id TEXT;
ALTER TABLE fixed_expenses ADD COLUMN IF NOT EXISTS created_at TEXT;

-- FINANCIAL_TRANSACTIONS (21 colunas)
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS value INTEGER;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS equipment_id TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS contract_id TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS created_at TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS reference TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS is_fixed BOOLEAN;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS sector TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS fixed_duration_months TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS installment_number INTEGER;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS installment_total TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS cost_center_id TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS debit_amount INTEGER;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS debit_description TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS has_debit BOOLEAN;

-- REVIEW_NOTIFICATIONS (7 colunas)
ALTER TABLE review_notifications ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE review_notifications ADD COLUMN IF NOT EXISTS equipment_id TEXT;
ALTER TABLE review_notifications ADD COLUMN IF NOT EXISTS review_date TEXT;
ALTER TABLE review_notifications ADD COLUMN IF NOT EXISTS days_until INTEGER;
ALTER TABLE review_notifications ADD COLUMN IF NOT EXISTS notified_at TEXT;
ALTER TABLE review_notifications ADD COLUMN IF NOT EXISTS notified_date TEXT;
ALTER TABLE review_notifications ADD COLUMN IF NOT EXISTS created_at TEXT;

