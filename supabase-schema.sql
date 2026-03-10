-- Med+Dash Encrypted Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Encryption settings (stores verification hash)
CREATE TABLE IF NOT EXISTS encryption_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  verification_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patients
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT, -- encrypted
  age INTEGER,
  dob TEXT, -- encrypted
  sex TEXT,
  height TEXT, -- encrypted
  weight TEXT, -- encrypted
  bmi NUMERIC,
  blood_type TEXT, -- encrypted
  member_id TEXT, -- encrypted
  last_visit TEXT,
  next_checkup TEXT,
  primary_physician TEXT, -- encrypted
  insurance TEXT, -- encrypted
  emergency_contact TEXT, -- encrypted (JSON)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vitals
CREATE TABLE IF NOT EXISTS vitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vital_type TEXT NOT NULL, -- heart_rate, blood_pressure, etc. (not encrypted for querying)
  value TEXT, -- encrypted JSON
  unit TEXT,
  recorded_at TEXT, -- date string, not encrypted for querying
  status TEXT,
  reference_range TEXT,
  notes TEXT, -- encrypted
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lab Results
CREATE TABLE IF NOT EXISTS lab_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  panel_name TEXT, -- encrypted
  panel_abbr TEXT, -- not encrypted for display
  drawn_date TEXT, -- not encrypted for querying
  results TEXT, -- encrypted JSON array
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medications
CREATE TABLE IF NOT EXISTS medications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT, -- encrypted
  dose TEXT, -- encrypted
  frequency TEXT, -- encrypted
  purpose TEXT, -- encrypted
  start_date TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allergies
CREATE TABLE IF NOT EXISTS allergies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  allergen TEXT, -- encrypted
  severity TEXT, -- encrypted
  reaction TEXT, -- encrypted
  confirmed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Genetics
CREATE TABLE IF NOT EXISTS genetics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  provider TEXT,
  sequence_date TEXT,
  coverage TEXT,
  snps_analyzed TEXT,
  data TEXT, -- encrypted JSON blob
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT, -- encrypted
  file_type TEXT,
  parsed_data TEXT, -- encrypted JSON
  status TEXT DEFAULT 'pending',
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE encryption_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE genetics ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Encryption settings policies
CREATE POLICY "Users can view own encryption settings" ON encryption_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own encryption settings" ON encryption_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own encryption settings" ON encryption_settings FOR UPDATE USING (auth.uid() = user_id);

-- Patient policies
CREATE POLICY "Users can view own patient" ON patients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own patient" ON patients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own patient" ON patients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own patient" ON patients FOR DELETE USING (auth.uid() = user_id);

-- Vitals policies
CREATE POLICY "Users can view own vitals" ON vitals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own vitals" ON vitals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own vitals" ON vitals FOR DELETE USING (auth.uid() = user_id);

-- Lab results policies
CREATE POLICY "Users can view own labs" ON lab_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own labs" ON lab_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own labs" ON lab_results FOR DELETE USING (auth.uid() = user_id);

-- Medications policies
CREATE POLICY "Users can view own meds" ON medications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meds" ON medications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meds" ON medications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meds" ON medications FOR DELETE USING (auth.uid() = user_id);

-- Allergies policies
CREATE POLICY "Users can view own allergies" ON allergies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own allergies" ON allergies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own allergies" ON allergies FOR DELETE USING (auth.uid() = user_id);

-- Genetics policies
CREATE POLICY "Users can view own genetics" ON genetics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own genetics" ON genetics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own genetics" ON genetics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own genetics" ON genetics FOR DELETE USING (auth.uid() = user_id);

-- Documents policies
CREATE POLICY "Users can view own documents" ON documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON documents FOR DELETE USING (auth.uid() = user_id);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER genetics_updated_at BEFORE UPDATE ON genetics FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER encryption_settings_updated_at BEFORE UPDATE ON encryption_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
