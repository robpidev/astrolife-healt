import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(process.env.DATABASE_PATH ?? 'data/astrolife.db');
db.exec('PRAGMA foreign_keys=ON');
const days = [[9,70,118,76,98],[10,72,120,78,98],[11,76,122,79,97],[12,71,119,77,99],[13,69,117,75,98],[14,74,121,78,97],[15,72,118,76,98]];
db.exec('BEGIN IMMEDIATE');
try {
 if (!db.prepare('SELECT id FROM astronauts WHERE id=?').get('demo-1')) throw new Error('Falta demo-1');
 for (const [day,pulse,systolic,diastolic,oxygen] of days) {
  for (const [code,value] of [['heart_rate',pulse],['blood_pressure',null],['spo2',oxygen]] as const) {
   const id = `demo-cardio-v1-${day}-${code}`;
   const expected = ['demo-1',null,code,value,`2026-11-${String(day).padStart(2,'0')}T08:00:00-05:00`,'simulated','Datos ficticios de demostración'];
   const old = db.prepare('SELECT astronaut_id,mission_id,metric_code,value,measured_at,source,notes FROM measurements WHERE id=?').get(id);
   if (old && JSON.stringify(Object.values(old)) !== JSON.stringify(expected)) throw new Error(`Conflicto: ${id}`);
   if (!old) db.prepare('INSERT INTO measurements(id,astronaut_id,mission_id,metric_code,value,measured_at,source,notes) VALUES(?,?,?,?,?,?,?,?)').run(id,...expected);
   if (code === 'blood_pressure') {
    for (const [component,number] of [['systolic',systolic],['diastolic',diastolic]] as const) {
     const previous = db.prepare('SELECT value,unit FROM measurement_components WHERE measurement_id=? AND component_code=?').get(id,component);
     if (previous && (previous.value !== number || previous.unit !== 'mmHg')) throw new Error(`Conflicto: ${id}/${component}`);
     if (!previous) db.prepare('INSERT INTO measurement_components(measurement_id,component_code,value,unit) VALUES(?,?,?,?)').run(id,component,number,'mmHg');
    }
   }
  }
 }
 db.exec('COMMIT');
 console.log('Datos ficticios cargados: 21 mediciones y 14 componentes, sin duplicados.');
} catch (error) {
 db.exec('ROLLBACK');
 throw error;
} finally {
 db.close();
}
