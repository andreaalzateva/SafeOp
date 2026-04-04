import { ChecklistQuestion } from '@/lib/mockData';
import QuestionCard from './QuestionCard';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';

interface Props {
  questions: ChecklistQuestion[];
  onAnswer: (questionId: string, answer: 'si' | 'no') => void;
  onFollowUpAnswer?: (questionId: string, answer: 'si' | 'no') => void;
  patientName?: string;
  patientId?: string;
}

export default function ChecklistSignIn({ questions, onAnswer, onFollowUpAnswer, patientName, patientId }: Props) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      {(patientName || patientId) && (
        <div className="flex items-start gap-3 rounded-xl border bg-primary/5 border-primary/20 p-4">
          <User className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Confirmar Identidad del Paciente</p>
            {patientName && <p className="text-sm text-muted-foreground">Nombre: <span className="font-medium text-foreground">{patientName}</span></p>}
            {patientId && <p className="text-sm text-muted-foreground">Identificación: <span className="font-medium text-foreground">{patientId}</span></p>}
          </div>
        </div>
      )}
      {questions.map((q, i) => (
        <QuestionCard key={q.id} question={q} onAnswer={onAnswer} onFollowUpAnswer={onFollowUpAnswer} index={i} />
      ))}
    </motion.div>
  );
}
