"""Load explicit, repeatable demonstration readings into an existing database."""
import sqlite3
import sys


def seed(connection):
    connection.execute('PRAGMA foreign_keys=ON')
    rows = [(9,70,118,76,98),(10,72,120,78,98),(11,76,122,79,97),(12,71,119,77,99),(13,69,117,75,98),(14,74,121,78,97),(15,72,118,76,98)]
    with connection:
        if not connection.execute("SELECT id FROM astronauts WHERE id=?", ('demo-1',)).fetchone():
            raise ValueError('Falta el astronauta demo-1')
        for day, pulse, systolic, diastolic, oxygen in rows:
            for code, value in [('heart_rate',pulse),('blood_pressure',None),('spo2',oxygen)]:
                key=f'demo-cardio-v1-{day}-{code}'
                expected=('demo-1',None,code,value,f'2026-11-{day:02}T08:00:00-05:00','simulated','Datos ficticios de demostración')
                existing=connection.execute('SELECT astronaut_id,mission_id,metric_code,value,measured_at,source,notes FROM measurements WHERE id=?',(key,)).fetchone()
                if existing is not None and tuple(existing)!=expected:
                    raise ValueError(f'Conflicto: {key}')
                if existing is None:
                    connection.execute('INSERT INTO measurements(id,astronaut_id,mission_id,metric_code,value,measured_at,source,notes) VALUES(?,?,?,?,?,?,?,?)',(key,*expected))
                if code=='blood_pressure':
                    for component, number in [('systolic',systolic),('diastolic',diastolic)]:
                        old=connection.execute('SELECT value,unit FROM measurement_components WHERE measurement_id=? AND component_code=?',(key,component)).fetchone()
                        if old is not None and tuple(old)!=(number,'mmHg'):
                            raise ValueError(f'Conflicto de componente: {key}')
                        if old is None:
                            connection.execute('INSERT INTO measurement_components(measurement_id,component_code,value,unit) VALUES(?,?,?,?)',(key,component,number,'mmHg'))

if __name__=='__main__':
    path=sys.argv[1] if len(sys.argv)>1 else 'data/astrolife.db'
    with sqlite3.connect(f'file:{path}?mode=rw',uri=True) as connection:
        seed(connection)
    print('Datos cardiovasculares de demostración cargados (sin duplicados).')
