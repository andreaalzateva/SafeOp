export type UserRole = 'coordinador' | 'encargado' | 'consulta';

export interface ChecklistQuestion {
  id: string;
  text: string;
  answer?: 'si' | 'no' | null;
  answeredBy?: string;
  answeredAt?: string;
  followUpText?: string;
  followUpAnswer?: 'si' | 'no' | null;
  followUpOnYes?: boolean;
  followUpBlockAnswer?: 'si' | 'no';
  blockOnNo?: boolean;
}

export interface InstrumentCount {
  id: string;
  name: string;
  initialCount: number;
  finalCount?: number;
}

// Common surgical procedures list
export const commonProcedures = [
  'Apendicectomía',
  'Colecistectomía laparoscópica',
  'Hernioplastia inguinal',
  'Hernioplastia umbilical',
  'Cesárea',
  'Histerectomía',
  'Tiroidectomía',
  'Mastectomía',
  'Prostatectomía',
  'Nefrectomía',
  'Gastrectomía',
  'Colectomía',
  'Laparotomía exploratoria',
  'Artroscopia de rodilla',
  'Reemplazo total de rodilla',
  'Reemplazo total de cadera',
  'Cirugía de bypass coronario',
  'Reemplazo de válvula cardíaca',
  'Amigdalectomía',
  'Septoplastia',
  'Rinoplastia',
  'Cirugía de cataratas',
  'Biopsia excisional',
  'Drenaje de absceso',
  'Fasciotomía',
  'Reducción abierta y fijación interna (RAFI)',
  'Toracotomía',
  'Esplenectomía',
  'Pancreatectomía',
  'Derivación biliodigestiva',
];

// Doctors lists for dropdowns
export const surgeonsList = [
  'Dr. Carlos Mendoza',
  'Dr. Roberto Silva',
  'Dra. Patricia Gómez',
  'Dr. Alejandro Vega',
  'Dr. Fernando Castillo',
  'Dra. María Elena Ríos',
  'Dr. Andrés Herrera',
  'Dra. Claudia Morales',
];

export const anesthesiologistsList = [
  'Dra. Ana Ruiz',
  'Dr. Miguel Ángel Rojas',
  'Dr. Esteban Paredes',
  'Dra. Sofía Delgado',
  'Dr. Raúl Jiménez',
  'Dra. Valentina Ortega',
];

// Common surgical instruments
export const commonInstruments = [
  'Mango de bisturí #3',
  'Mango de bisturí #4',
  'Hojas de bisturí',
  'Tijera Mayo recta',
  'Tijera Mayo curva',
  'Tijera Metzenbaum',
  'Pinza Kelly recta',
  'Pinza Kelly curva',
  'Pinza Kocher',
  'Pinza Allis',
  'Pinza Babcock',
  'Pinza de disección sin dientes',
  'Pinza de disección con dientes',
  'Pinza de campo (Backhaus)',
  'Pinza de anillo recta',
  'Pinza de anillo curva',
  'Pinza Mixter',
  'Porta agujas',
  'Separador Farabeuf',
  'Separador Richardson',
  'Separador Diver',
  'Pinza Erina',
  'Cánula de aspiración (Yankauer)',
  'Gasas',
  'Compresas',
  'Agujas de sutura',
  'Clamp vascular',
  'Electrobisturí (punta)',
];

// WHO Surgical Safety Checklist — Sign In (Before anesthesia induction)
export const signInQuestions: Omit<ChecklistQuestion, 'answer' | 'answeredBy' | 'answeredAt'>[] = [
  { id: 'si0', text: '¿El paciente sabe de qué lo van a operar?', blockOnNo: true },
  { id: 'si0b', text: '¿Todos los miembros del equipo de cirugía se han presentado por su nombre y función?', blockOnNo: true },
  { id: 'si1', text: '¿Ha confirmado el paciente su identidad, el sitio quirúrgico, el procedimiento y su consentimiento?', blockOnNo: true },
  { id: 'si2', text: '¿Se ha marcado el sitio quirúrgico? (Sí / No procede)', blockOnNo: true },
  { id: 'si3', text: '¿Se ha completado la comprobación de los aparatos de anestesia y la medicación anestésica?', blockOnNo: true },
  { id: 'si4', text: '¿Se ha colocado el pulsioxímetro al paciente y funciona?', blockOnNo: true },
  { id: 'si_uci', text: '¿Se ha confirmado la disponibilidad de cama en UCI?', followUpText: '¿Es necesaria la cama de UCI para este paciente?', followUpBlockAnswer: 'si' },
  { id: 'si_equipo', text: '¿El equipo quirúrgico está listo y esterilizado?', blockOnNo: true },
  { id: 'si_meds', text: '¿Los medicamentos están anotados, listos y completos?', blockOnNo: true },
  { id: 'si5', text: '¿Tiene el paciente alergias conocidas?', followUpText: '¿Son conocidas y tenidas en cuenta?', followUpOnYes: true, followUpBlockAnswer: 'no' },
  { id: 'si6', text: '¿Tiene el paciente vía aérea difícil / riesgo de aspiración?', followUpText: '¿Hay materiales, equipos y ayuda disponible?', followUpOnYes: true, followUpBlockAnswer: 'no' },
  { id: 'si7', text: '¿Tiene el paciente riesgo de hemorragia >500 ml (7 ml/kg en niños)?', followUpText: '¿Se ha previsto la disponibilidad de líquidos y dos vías IV o centrales?', followUpOnYes: true, followUpBlockAnswer: 'no' },
];

// WHO Surgical Safety Checklist — Time Out (Before skin incision)
export const timeOutQuestions: Omit<ChecklistQuestion, 'answer' | 'answeredBy' | 'answeredAt'>[] = [
  { id: 'to3', text: '¿Se ha administrado profilaxis antibiótica en los últimos 60 minutos? (Sí / No procede)', blockOnNo: true },
  { id: 'to4', text: 'Cirujano: ¿Cuáles serán los pasos críticos o no sistematizados? ¿Cuánto durará la operación? ¿Cuál es la pérdida de sangre prevista?', blockOnNo: true },
  { id: 'to5', text: 'Anestesista: ¿Presenta el paciente algún problema específico?', blockOnNo: true },
  { id: 'to6', text: 'Equipo de enfermería: ¿Se ha confirmado la esterilidad (con resultados de los indicadores)? ¿Hay dudas o problemas relacionados con el instrumental y los equipos?', blockOnNo: true },
  { id: 'to7', text: '¿Pueden visualizarse las imágenes diagnósticas esenciales? (Sí / No procede)', blockOnNo: true },
];

// WHO Surgical Safety Checklist — Sign Out (Before patient leaves OR)
export const signOutQuestions: Omit<ChecklistQuestion, 'answer' | 'answeredBy' | 'answeredAt'>[] = [
  { id: 'so2', text: 'Se confirma verbalmente: el recuento de instrumentos, gasas y agujas', blockOnNo: true },
  { id: 'so3', text: 'Se confirma verbalmente: el etiquetado de las muestras (lectura de la etiqueta en voz alta, incluido el nombre del paciente)', blockOnNo: true },
  { id: 'so4', text: '¿Hay problemas que resolver relacionados con el instrumental y los equipos?', blockOnNo: true },
];