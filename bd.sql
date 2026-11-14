PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS astronauts (
 id TEXT PRIMARY KEY,
 full_name TEXT NOT NULL,
 photo_path TEXT,
 nationality TEXT CHECK(nationality IS NULL OR length(nationality) BETWEEN 1 AND 80),
 sex TEXT CHECK(sex IS NULL OR sex IN ('femenino','masculino','intersexual','no_especificado')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS missions (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 start_at TEXT,
 end_at TEXT,
 description TEXT
);
CREATE TABLE IF NOT EXISTS mission_crew (
 mission_id TEXT NOT NULL REFERENCES missions(id),
 astronaut_id TEXT NOT NULL REFERENCES astronauts(id),
 role TEXT,
 PRIMARY KEY (mission_id, astronaut_id)
);
CREATE TABLE IF NOT EXISTS metric_definitions (
 code TEXT PRIMARY KEY,
 category TEXT NOT NULL,
 label TEXT NOT NULL,
 unit TEXT NOT NULL,
 value_kind TEXT NOT NULL CHECK(value_kind IN ('numeric','composite')),
 min_allowed REAL,
 max_allowed REAL
);
CREATE TABLE IF NOT EXISTS measurements (
 id TEXT PRIMARY KEY,
 astronaut_id TEXT NOT NULL REFERENCES astronauts(id),
 mission_id TEXT REFERENCES missions(id),
 metric_code TEXT NOT NULL REFERENCES metric_definitions(code),
 value REAL,
 measured_at TEXT NOT NULL,
 interval_start TEXT,
 interval_end TEXT,
 source TEXT NOT NULL CHECK(source IN ('manual','sensor','simulated')),
 notes TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(interval_start IS NULL OR interval_end IS NULL OR interval_end > interval_start)
);
CREATE INDEX IF NOT EXISTS idx_measurements_history ON measurements(astronaut_id,metric_code,measured_at DESC);
CREATE TABLE IF NOT EXISTS measurement_components (
 measurement_id TEXT NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
 component_code TEXT NOT NULL,
 value REAL NOT NULL,
 unit TEXT NOT NULL,
 PRIMARY KEY (measurement_id,component_code)
);
CREATE TABLE IF NOT EXISTS health_baselines (
 id TEXT PRIMARY KEY,
 astronaut_id TEXT NOT NULL REFERENCES astronauts(id),
 metric_code TEXT NOT NULL REFERENCES metric_definitions(code),
 baseline_value REAL NOT NULL,
 valid_from TEXT NOT NULL,
 valid_until TEXT,
 method TEXT,
 notes TEXT
);
CREATE TABLE IF NOT EXISTS exercise_sessions (
 id TEXT PRIMARY KEY,
 astronaut_id TEXT NOT NULL REFERENCES astronauts(id),
 mission_id TEXT REFERENCES missions(id),
 started_at TEXT NOT NULL,
 duration_minutes INTEGER NOT NULL CHECK(duration_minutes >= 0),
 exercise_type TEXT NOT NULL,
 source TEXT NOT NULL CHECK(source IN ('manual','sensor','simulated')),
 notes TEXT
);
CREATE TABLE IF NOT EXISTS symptom_records (
 id TEXT PRIMARY KEY,
 astronaut_id TEXT NOT NULL REFERENCES astronauts(id),
 mission_id TEXT REFERENCES missions(id),
 symptom_type TEXT NOT NULL,
 intensity INTEGER NOT NULL CHECK(intensity BETWEEN 0 AND 10),
 recorded_at TEXT NOT NULL,
 source TEXT NOT NULL CHECK(source IN ('manual','sensor','simulated')),
 notes TEXT
);
CREATE TABLE IF NOT EXISTS alert_rules (
 id TEXT PRIMARY KEY,
 metric_code TEXT NOT NULL REFERENCES metric_definitions(code),
 astronaut_id TEXT REFERENCES astronauts(id),
 lower_bound REAL,
 upper_bound REAL,
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 validated_by TEXT,
 notes TEXT,
 CHECK(lower_bound IS NOT NULL OR upper_bound IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS alerts (
 id TEXT PRIMARY KEY,
 rule_id TEXT NOT NULL REFERENCES alert_rules(id),
 measurement_id TEXT NOT NULL REFERENCES measurements(id),
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','acknowledged','resolved')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 resolved_at TEXT,
 message TEXT NOT NULL,
 UNIQUE(rule_id,measurement_id)
);


INSERT OR IGNORE INTO metric_definitions(code,category,label,unit,value_kind,min_allowed,max_allowed) VALUES
('heart_rate','cardiovascular','Frecuencia cardíaca','bpm','numeric',0,NULL),
('blood_pressure','cardiovascular','Presión arterial','mmHg','composite',NULL,NULL),
('spo2','cardiovascular','Saturación de oxígeno','%','numeric',0,100),
('sleep_duration','sleep','Duración de sueño','h','numeric',0,24),
('sleep_quality','sleep','Calidad del sueño','1-5','numeric',1,5),
('fatigue','sleep','Fatiga','0-10','numeric',0,10),
('muscle_strength','muscular','Fuerza muscular','N','numeric',0,NULL),
('muscle_pain','muscular','Dolor muscular','0-10','numeric',0,10),
('stress','mental','Estrés percibido','0-10','numeric',0,10),
('mood','mental','Estado de ánimo','1-5','numeric',1,5),
('reaction_time','mental','Tiempo de reacción','ms','numeric',0,NULL),
('cognitive_accuracy','mental','Aciertos en prueba cognitiva','%','numeric',0,100),
('radiation_interval','radiation','Dosis de radiación del intervalo','mSv','numeric',0,NULL),
('body_temperature','general','Temperatura corporal','°C','numeric',NULL,NULL),
('water_intake','general','Ingesta de agua','mL','numeric',0,NULL),
('body_mass','general','Masa corporal','kg','numeric',0,NULL);


-- Dashboard metadata extends the health schema without changing its TEXT identifiers.
CREATE TABLE IF NOT EXISTS crew_profiles (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 astronaut_id TEXT NOT NULL UNIQUE REFERENCES astronauts(id) ON DELETE CASCADE,
 role TEXT NOT NULL DEFAULT 'Especialista de misión',
 status TEXT NOT NULL DEFAULT 'entrenamiento' CHECK(status IN ('mision','entrenamiento','descanso')),
 tone TEXT NOT NULL DEFAULT 'indigo' CHECK(tone IN ('indigo','cyan','violet','amber','emerald')),
 xp_total INTEGER NOT NULL DEFAULT 0 CHECK(xp_total >= 0),
 streak_days INTEGER NOT NULL DEFAULT 0 CHECK(streak_days >= 0),
 missions_completed INTEGER NOT NULL DEFAULT 0 CHECK(missions_completed >= 0),
 badges TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(badges) AND json_type(badges) = 'array')
);
CREATE TABLE IF NOT EXISTS crew_tasks (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 profile_id INTEGER NOT NULL REFERENCES crew_profiles(id) ON DELETE CASCADE,
 title TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('salud','entrenamiento','mision','logistica')),
 done INTEGER NOT NULL DEFAULT 0 CHECK(done IN (0,1)),
 xp INTEGER NOT NULL CHECK(xp >= 0)
);
CREATE TABLE IF NOT EXISTS app_migrations (
 name TEXT PRIMARY KEY,
 applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
