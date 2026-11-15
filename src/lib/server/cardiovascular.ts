import { randomUUID } from 'node:crypto';
import type { CardiovascularInput } from '#lib/server/cardiovascular-validation.js';
import { heartRateWarning, bloodPressureWarning } from '#lib/server/cardiovascular-validation.js';
import { getDb } from '#lib/server/db.js';

export interface CardiovascularReading {
 id: string;
 metric_code: string;
 value: number | null;
 measured_at: string;
 source: string;
 systolic: number | null;
 diastolic: number | null;
 warning: string | null;
}

export function listCardiovascularReadings(profileId: number): CardiovascularReading[] {
 const rows = getDb().prepare(`
 WITH readings AS (
 SELECT m.* FROM measurements m
 JOIN crew_profiles p ON p.astronaut_id=m.astronaut_id
 WHERE p.id=? AND m.metric_code IN ('heart_rate','blood_pressure','spo2')
 AND julianday(m.measured_at) <= julianday(?)
 ), latest AS (SELECT MAX(julianday(measured_at)) AS stamp FROM readings)
 SELECT r.id,r.metric_code,r.value,r.measured_at,r.source,
 (SELECT value FROM measurement_components WHERE measurement_id=r.id AND component_code='systolic') AS systolic,
 (SELECT value FROM measurement_components WHERE measurement_id=r.id AND component_code='diastolic') AS diastolic
 FROM readings r, latest l
 WHERE julianday(r.measured_at)>l.stamp-7
 ORDER BY julianday(r.measured_at),r.id
 `).all(profileId, new Date().toISOString()) as unknown as Omit<CardiovascularReading, 'warning'>[];
 return rows.map((row) => ({ ...row, warning: row.metric_code === 'heart_rate' ? heartRateWarning(row.value) : row.metric_code === 'blood_pressure' ? bloodPressureWarning(row.systolic, row.diastolic) : null }));
}

export function registerCardiovascularReadings(profileId: number, input: CardiovascularInput): boolean {
 const db = getDb();
 db.exec('BEGIN IMMEDIATE');
 try {
  const profile = db.prepare('SELECT astronaut_id FROM crew_profiles WHERE id = ?').get(profileId);
  if (!profile) { db.exec('ROLLBACK'); return false; }
  const measuredAt = new Date().toISOString();
  const insert = db.prepare(`INSERT INTO measurements(id,astronaut_id,metric_code,value,measured_at,source,mission_id)
   VALUES(?,?,?,?,?,'manual',NULL)`);
  const component = db.prepare('INSERT INTO measurement_components(measurement_id,component_code,value,unit) VALUES(?,?,?,?)');
  const value = input.metric_code === 'heart_rate' ? input.heart_rate : input.metric_code === 'spo2' ? input.spo2 : null;
  const id = randomUUID();
  insert.run(id,profile.astronaut_id,input.metric_code,value,measuredAt);
  if (input.metric_code === 'blood_pressure') {
   component.run(id,'systolic',input.systolic,'mmHg');
   component.run(id,'diastolic',input.diastolic,'mmHg');
  }
  db.exec('COMMIT');
  return true;
 } catch (error) {
  db.exec('ROLLBACK');
  throw error;
 }
}
