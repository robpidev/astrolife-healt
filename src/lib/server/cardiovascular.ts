import { getDb } from '#lib/server/db.js';

export interface CardiovascularReading {
 id: string;
 metric_code: string;
 value: number | null;
 measured_at: string;
 source: string;
 systolic: number | null;
 diastolic: number | null;
}

export function listCardiovascularReadings(profileId: number): CardiovascularReading[] {
 return getDb().prepare(`
 WITH readings AS (
 SELECT m.* FROM measurements m
 JOIN crew_profiles p ON p.astronaut_id=m.astronaut_id
 WHERE p.id=? AND m.metric_code IN ('heart_rate','blood_pressure','spo2')
 ), latest AS (SELECT MAX(julianday(measured_at)) AS stamp FROM readings)
 SELECT r.id,r.metric_code,r.value,r.measured_at,r.source,
 (SELECT value FROM measurement_components WHERE measurement_id=r.id AND component_code='systolic') AS systolic,
 (SELECT value FROM measurement_components WHERE measurement_id=r.id AND component_code='diastolic') AS diastolic
 FROM readings r, latest l
 WHERE julianday(r.measured_at)>l.stamp-7
 ORDER BY julianday(r.measured_at),r.id
 `).all(profileId) as unknown as CardiovascularReading[];
}
