import { ChecklistQuestion, InstrumentCount } from '@/lib/mockData';
import QuestionCard from './QuestionCard';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Props {
  questions: ChecklistQuestion[];
  onAnswer: (questionId: string, answer: 'si' | 'no') => void;
  instruments: InstrumentCount[];
  onUpdateFinalCount: (instrumentId: string, count: number) => void;
}

export default function ChecklistSignOut({ questions, onAnswer, instruments, onUpdateFinalCount }: Props) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Instrument comparison table FIRST */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-lg font-semibold text-foreground mb-4">Verificación de Instrumentos</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Ingresa la cantidad final de cada instrumento. Debe coincidir con la cantidad inicial para continuar.
        </p>

        <div className="overflow-hidden rounded-lg border">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 bg-muted/50 px-4 py-3 text-xs font-medium text-muted-foreground">
            <span>Instrumento</span>
            <span className="text-center w-20">Inicial</span>
            <span className="text-center w-20">Final</span>
            <span className="text-center w-16">Estado</span>
          </div>
          {instruments.map((inst) => {
            const matches = inst.finalCount !== undefined && inst.finalCount === inst.initialCount;
            const mismatch = inst.finalCount !== undefined && inst.finalCount !== inst.initialCount;
            return (
              <div key={inst.id} className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center border-t px-4 py-3 ${mismatch ? 'bg-destructive/5' : ''}`}>
                <span className="text-sm text-foreground">{inst.name}</span>
                <span className="text-center text-sm font-medium text-foreground w-20">{inst.initialCount}</span>
                <Input
                  type="number"
                  min={0}
                  value={inst.finalCount ?? ''}
                  onChange={(e) => onUpdateFinalCount(inst.id, parseInt(e.target.value) || 0)}
                  className="w-20 text-center"
                  placeholder="—"
                />
                <div className="w-16 flex justify-center">
                  {matches && <CheckCircle2 className="h-5 w-5 text-success" />}
                  {mismatch && <AlertTriangle className="h-5 w-5 text-destructive" />}
                </div>
              </div>
            );
          })}
        </div>

        {instruments.some((i) => i.finalCount !== undefined && i.finalCount !== i.initialCount) && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Las cantidades no coinciden. Verifica el conteo antes de continuar.
          </div>
        )}
      </div>

      {/* Questions AFTER instrument count */}
      <div className="space-y-3">
        {questions.map((q, i) => (
          <QuestionCard key={q.id} question={q} onAnswer={onAnswer} index={i} />
        ))}
      </div>
    </motion.div>
  );
}
