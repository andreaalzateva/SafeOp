import { ChecklistQuestion } from '@/lib/mockData';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, User, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  question: ChecklistQuestion;
  onAnswer: (questionId: string, answer: 'si' | 'no') => void;
  onFollowUpAnswer?: (questionId: string, answer: 'si' | 'no') => void;
  index: number;
}

export default function QuestionCard({ question, onAnswer, onFollowUpAnswer, index }: Props) {
  const hasFollowUp = !!question.followUpText;
  const followUpTrigger = question.followUpOnYes ? 'si' : 'no';
  const showFollowUp = hasFollowUp && question.answer === followUpTrigger;
  const followUpBlocked = showFollowUp && question.followUpBlockAnswer != null && question.followUpAnswer === question.followUpBlockAnswer;
  const blockingNo = question.blockOnNo && question.answer === 'no';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`rounded-xl border bg-card p-4 transition-all ${
        blockingNo ? 'border-destructive/40 bg-destructive/5' :
        followUpBlocked ? 'border-destructive/40 bg-destructive/5' :
        question.answer === 'si' ? 'border-success/30' : question.answer === 'no' ? 'border-warning/30' : ''
      }`}
    >
      <p className="text-sm font-medium text-foreground mb-3">{question.text}</p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={question.answer === 'si' ? 'default' : 'outline'}
          onClick={() => onAnswer(question.id, 'si')}
          className={`gap-1.5 ${question.answer === 'si' ? 'bg-success hover:bg-success/90 text-white' : ''}`}
        >
          <CheckCircle2 className="h-4 w-4" /> Sí
        </Button>
        <Button
          type="button"
          size="sm"
          variant={question.answer === 'no' ? 'default' : 'outline'}
          onClick={() => onAnswer(question.id, 'no')}
          className={`gap-1.5 ${question.answer === 'no' ? 'bg-warning hover:bg-warning/90 text-white' : ''}`}
        >
          <XCircle className="h-4 w-4" /> No
        </Button>
        {question.answeredBy && (
          <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            {question.answeredBy} — {question.answeredAt}
          </span>
        )}
      </div>

      {blockingNo && (
        <p className="mt-2 text-xs text-destructive font-medium">
          ⚠ Esta verificación es obligatoria. No se puede continuar si la respuesta es "No".
        </p>
      )}

      {showFollowUp && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 border-t pt-3"
        >
          <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-warning" />
            {question.followUpText}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={question.followUpAnswer === 'si' ? 'default' : 'outline'}
              onClick={() => onFollowUpAnswer?.(question.id, 'si')}
              className={`gap-1.5 ${question.followUpAnswer === 'si' ? 'bg-success hover:bg-success/90 text-white' : ''}`}
            >
              <CheckCircle2 className="h-4 w-4" /> Sí
            </Button>
            <Button
              type="button"
              size="sm"
              variant={question.followUpAnswer === 'no' ? 'default' : 'outline'}
              onClick={() => onFollowUpAnswer?.(question.id, 'no')}
              className={`gap-1.5 ${question.followUpAnswer === 'no' ? 'bg-warning hover:bg-warning/90 text-white' : ''}`}
            >
              <XCircle className="h-4 w-4" /> No
            </Button>
          </div>
          {followUpBlocked && (
            <p className="mt-2 text-xs text-destructive font-medium">
              ⚠ No se puede continuar hasta que esta condición se resuelva.
            </p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
