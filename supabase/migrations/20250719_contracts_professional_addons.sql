-- فهارس تسريع الاستعلامات
CREATE INDEX idx_contracts_user_id ON contracts(user_id);
CREATE INDEX idx_contracts_type ON contracts(contract_type);
CREATE INDEX idx_contract_locations_contract_id ON contract_locations(contract_id);
CREATE INDEX idx_contract_locations_type ON contract_locations(type);
CREATE INDEX idx_contract_offers_contract_id ON contract_offers(contract_id);
CREATE INDEX idx_contract_offers_driver_id ON contract_offers(driver_id);
CREATE INDEX idx_contract_users_contract_id ON contract_users(contract_id);
CREATE INDEX idx_contract_users_user_id ON contract_users(user_id);

-- قيود منع التكرار
ALTER TABLE contract_offers ADD CONSTRAINT unique_offer_per_driver UNIQUE (contract_id, driver_id);
ALTER TABLE contract_users ADD CONSTRAINT unique_user_per_contract UNIQUE (contract_id, user_id, role);

-- تحديث تلقائي لحقل updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_contracts_updated_at
BEFORE UPDATE ON contracts
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- جدول التوثيق (audit_logs)
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  action VARCHAR(32),
  table_name VARCHAR(64),
  record_id BIGINT,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- جدول المرفقات
CREATE TABLE contract_attachments (
  id BIGSERIAL PRIMARY KEY,
  contract_id BIGINT REFERENCES contracts(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  type VARCHAR(32), -- image/pdf/other
  uploaded_at TIMESTAMP DEFAULT NOW()
);
