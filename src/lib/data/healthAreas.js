/** Health navigation metadata; clinical values are loaded separately. */
export const healthAreas = [
  {
    "id": "cardiovascular",
    "label": "Cardiovascular",
    "metrics": [
      {
        "id": "heart-rate",
        "label": "Frecuencia cardíaca",
        "unit": "lpm"
      },
      {
        "id": "blood-pressure",
        "label": "Presión arterial",
        "unit": "mmHg"
      },
      {
        "id": "oxygen",
        "label": "Oxígeno",
        "unit": "%"
      }
    ]
  },
  {
    "id": "sleep",
    "label": "Sueño",
    "metrics": [
      {
        "id": "duration",
        "label": "Duración",
        "unit": "h"
      },
      {
        "id": "fatigue",
        "label": "Fatiga",
        "unit": ""
      }
    ]
  },
  {
    "id": "muscular",
    "label": "Salud muscular",
    "metrics": [
      {
        "id": "exercise",
        "label": "Ejercicio",
        "unit": "min"
      },
      {
        "id": "strength",
        "label": "Fuerza",
        "unit": ""
      },
      {
        "id": "pain",
        "label": "Dolor",
        "unit": ""
      }
    ]
  },
  {
    "id": "mental",
    "label": "Salud mental",
    "metrics": [
      {
        "id": "stress",
        "label": "Estrés",
        "unit": ""
      },
      {
        "id": "mood",
        "label": "Estado de ánimo",
        "unit": ""
      },
      {
        "id": "concentration",
        "label": "Concentración",
        "unit": ""
      }
    ]
  },
  {
    "id": "radiation",
    "label": "Radiación",
    "metrics": [
      {
        "id": "dose",
        "label": "Dosis",
        "unit": "mSv"
      }
    ]
  },
  {
    "id": "general",
    "label": "Salud general",
    "metrics": [
      {
        "id": "temperature",
        "label": "Temperatura",
        "unit": "°C"
      },
      {
        "id": "hydration",
        "label": "Hidratación",
        "unit": "L"
      },
      {
        "id": "weight",
        "label": "Peso",
        "unit": "kg"
      },
      {
        "id": "symptoms",
        "label": "Síntomas",
        "unit": ""
      }
    ]
  }
];
