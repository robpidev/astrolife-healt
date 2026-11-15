import { describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { parseCardiovascularForm, heartRateWarning, bloodPressureWarning } from '#lib/server/cardiovascular-validation.js';
import type { CardiovascularInput } from '#lib/server/cardiovascular-validation.js';

process.env.DATABASE_PATH = ':memory:';
const { getDb } = await import('#lib/server/db.js');
const { registerCardiovascularReadings, listCardiovascularReadings } = await import('#lib/server/cardiovascular.js');

function form(values: Record<string, string>): FormData {
 const result = new FormData();
 for (const [key,value] of Object.entries(values)) result.set(key,value);
 return result;
}
function createProfile(): number {
 const db=getDb();
 const key=randomUUID();
 db.prepare('INSERT INTO astronauts(id,full_name) VALUES(?,?)').run(key,'Test Person');
 return Number(db.prepare('INSERT INTO crew_profiles(astronaut_id) VALUES(?)').run(key).lastInsertRowid);
}

describe('cardiovascular registration validation', () => {
 it('accepts only the selected measurement and ignores unrelated invalid fields', () => {
  expect(parseCardiovascularForm(form({metric_code:'spo2',spo2:'98,5',heart_rate:'invalid'})).data).toEqual({metric_code:'spo2',spo2:98.5});
  expect(parseCardiovascularForm(form({metric_code:'heart_rate',heart_rate:'72'})).data).toEqual({metric_code:'heart_rate',heart_rate:72});
 });
 it.each(['', 'NaN', 'Infinity', '251', '19', '72.5'])('rejects invalid pulse %s', (heart_rate) => {
  expect(parseCardiovascularForm(form({metric_code:'heart_rate',heart_rate})).errors.heart_rate).toBeTruthy();
 });
 it.each(['', 'all', 'temperature'])('rejects missing or invalid metric %s', (metric_code) => {
  const result=parseCardiovascularForm(form({metric_code,heart_rate:'72'}));
  expect(result.data).toBeNull();
  expect(result.errors.metric_code).toBeTruthy();
 });
 it('rejects incomplete or inverted blood pressure and out of range oxygen', () => {
  expect(parseCardiovascularForm(form({metric_code:'blood_pressure',systolic:'118'})).errors.diastolic).toBeTruthy();
  expect(parseCardiovascularForm(form({metric_code:'blood_pressure',systolic:'70',diastolic:'80'})).errors.systolic).toBeTruthy();
  expect(parseCardiovascularForm(form({metric_code:'spo2',spo2:'101'})).errors.spo2).toBeTruthy();
 });
});

describe('manual cardiovascular persistence', () => {
 const inputs: CardiovascularInput[] = [
  {metric_code:'heart_rate',heart_rate:72},
  {metric_code:'blood_pressure',systolic:118,diastolic:76},
  {metric_code:'spo2',spo2:98}
 ];
 it.each(inputs)('saves only $metric_code for the selected profile', (input) => {
  const db=getDb();
  const profile=createProfile();
  const other=createProfile();
  expect(registerCardiovascularReadings(profile,input)).toBe(true);
  const rows=listCardiovascularReadings(profile);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({metric_code:input.metric_code,source:'manual'});
  expect(Number.isFinite(Date.parse(rows[0].measured_at))).toBe(true);
  expect(listCardiovascularReadings(other)).toEqual([]);
  const components=db.prepare('SELECT component_code,value FROM measurement_components WHERE measurement_id=? ORDER BY component_code').all(rows[0].id);
  if (input.metric_code==='blood_pressure') {
   expect(rows[0]).toMatchObject({value:null,systolic:118,diastolic:76});
   expect(components).toHaveLength(2);
  } else {
   expect(rows[0].value).toBe(input.metric_code==='heart_rate'?input.heart_rate:input.spo2);
   expect(components).toEqual([]);
  }
 });
 it('does not write for a missing profile', () => {
  expect(registerCardiovascularReadings(999999,{metric_code:'heart_rate',heart_rate:72})).toBe(false);
  expect(listCardiovascularReadings(999999)).toEqual([]);
 });
 it('rolls back a blood pressure registration if component insertion fails', () => {
  const db=getDb();
  const profile=createProfile();
  const before=Number(db.prepare('SELECT count(*) AS count FROM measurements').get()?.count);
  db.exec("CREATE TRIGGER reject_registration_component BEFORE INSERT ON measurement_components BEGIN SELECT RAISE(ABORT,'test failure'); END;");
  try {
   expect(()=>registerCardiovascularReadings(profile,{metric_code:'blood_pressure',systolic:118,diastolic:76})).toThrow();
   expect(Number(db.prepare('SELECT count(*) AS count FROM measurements').get()?.count)).toBe(before);
   expect(listCardiovascularReadings(profile)).toEqual([]);
  } finally { db.exec('DROP TRIGGER reject_registration_component'); }
 });
});

describe('heart rate informational warnings', () => {
 it.each([60, 100, null, Number.NaN, Number.POSITIVE_INFINITY])('does not warn for boundary or absent/invalid value %s', (value) => {
  expect(heartRateWarning(value)).toBeNull();
 });
 it.each([59, 101, 110])('warns without rejecting a storable pulse %s', (value) => {
  expect(heartRateWarning(value)).toContain('referencia de reposo');
  expect(parseCardiovascularForm(form({metric_code:'heart_rate',heart_rate:String(value)})).data).toEqual({metric_code:'heart_rate',heart_rate:value});
 });
 it('returns the current 110 pulse instead of a future simulated reading', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-15T06:08:00.000Z'));
  try {
   const profile=createProfile();
   const db=getDb();
   const person=db.prepare('SELECT astronaut_id FROM crew_profiles WHERE id=?').get(profile);
   if (!person) throw new Error('Profile missing');
   db.prepare("INSERT INTO measurements(id,astronaut_id,metric_code,value,measured_at,source) VALUES(?,?,'heart_rate',72,?,'simulated')").run(randomUUID(),person.astronaut_id,'2026-11-15T13:00:00.000Z');
   expect(registerCardiovascularReadings(profile,{metric_code:'heart_rate',heart_rate:110})).toBe(true);
   const rows=listCardiovascularReadings(profile);
   expect(rows).toHaveLength(1);
   expect(rows[0]).toMatchObject({value:110,source:'manual'});
   expect(rows[0].warning).toContain('referencia de reposo');
  } finally { vi.useRealTimers(); }
 });
});

describe('configured blood pressure reference', () => {
 it.each([[120,80],[119,79],[null,80],[120,null],[Number.NaN,80],[120,Number.POSITIVE_INFINITY]])('does not warn for %s / %s', (systolic,diastolic) => {
  expect(bloodPressureWarning(systolic,diastolic)).toBeNull();
 });
 it.each([[121,80],[120,81]])('warns for either component strictly over its configured reference: %s / %s', (systolic,diastolic) => {
  expect(bloodPressureWarning(systolic,diastolic)).toContain('referencia configurada de 120/80 mmHg');
  expect(parseCardiovascularForm(form({metric_code:'blood_pressure',systolic:String(systolic),diastolic:String(diastolic)})).data).toEqual({metric_code:'blood_pressure',systolic,diastolic});
 });
 it.each([[121,80],[120,81],[120,80],[119,79]])('persists %s / %s without blocking and returns the corresponding warning', (systolic,diastolic) => {
  const profile=createProfile();
  expect(registerCardiovascularReadings(profile,{metric_code:'blood_pressure',systolic,diastolic})).toBe(true);
  const rows=listCardiovascularReadings(profile);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({metric_code:'blood_pressure',systolic,diastolic,warning:bloodPressureWarning(systolic,diastolic)});
 });
});
