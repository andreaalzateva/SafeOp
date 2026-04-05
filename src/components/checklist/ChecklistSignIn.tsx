import { ChecklistQuestion } from '@/lib/mockData';
import QuestionCard from './QuestionCard';
import { motion } from 'framer-motion';
import { User, Stethoscope, Weight } from 'lucide-react';

interface Props {
  questions: ChecklistQuestion[];
  onAnswer: (questionId: string, answer: 'si' | 'no') => void;
  onFollowUpAnswer?: (questionId: string, answer: 'si' | 'no') => void;
  patientName?: string;
  patientId?: string;
  patientWeight?: number | null;
  surgeonName?: string;
  anesthesiologistName?: string;
}

export default function ChecklistSignIn({ questions, onAnswer, onFollowUpAnswer, patientName, patientId, patientWeight, surgeonName, anesthesiologistName }: Props) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      {/* Patient info card */}
      {(patientName || patientId) && (
        <div className="flex items-start gap-3 rounded-xl border bg-primary/5 border-primary/20 p-4">
          <User className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Confirmar Identidad del Paciente</p>
            {patientName && <p className="text-sm text-muted-foreground">Nombre: <span className="font-medium text-foreground">{patientName}</span></p>}
            {patientId && <p className="text-sm text-muted-foreground">Identificación: <span className="font-medium text-foreground">{patientId}</span></p>}
            {patientWeight != null && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Weight className="h-3.5 w-3.5" /> Peso: <span className="font-medium text-foreground">{patientWeight} kg</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Medical team card */}
      {(surgeonName || anesthesiologistName) && (
        <div className="flex items-start gap-3 rounded-xl border bg-accent/5 border-accent/20 p-4">
          <Stethoscope className="h-5 w-5 text-accent mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Equipo Médico</p>
            {surgeonName && <p className="text-sm text-muted-foreground">Médico Cirujano: <span className="font-medium text-foreground">{surgeonName}</span></p>}
            {anesthesiologistName && <p className="text-sm text-muted-foreground">Ayudante / Anestesiólogo: <span className="font-medium text-foreground">{anesthesiologistName}</span></p>}
          </div>
        </div>
      )}

      {questions.map((q, i) => (
        <QuestionCard key={q.id} question={q} onAnswer={onAnswer} onFollowUpAnswer={onFollowUpAnswer} index={i} />
      ))}
    </motion.div>
  );
}

