import { useState } from 'react';
import { ChecklistQuestion, InstrumentCount } from '@/lib/mockData';
import QuestionCard from './QuestionCard';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Wrench, Trash2 } from 'lucide-react';

interface Props {
  questions: ChecklistQuestion[];
  onAnswer: (questionId: string, answer: 'si' | 'no') => void;
  instruments: InstrumentCount[];
  onUpdateInstruments: (instruments: InstrumentCount[]) => void;
}

export default function ChecklistTimeOut({ questions, onAnswer, instruments, onUpdateInstruments }: Props) {
  const [newInstrument, setNewInstrument] = useState('');

  const updateCount = (id: string, count: number) => {
    onUpdateInstruments(instruments.map((i) => i.id === id ? { ...i, initialCount: Math.max(0, count) } : i));
  };

  const removeInstrument = (id: string) => {
    onUpdateInstruments(instruments.filter((i) => i.id !== id));
  };

  const addInstrument = () => {
    if (!newInstrument.trim()) return;
    const inst: InstrumentCount = {
      id: `inst-custom-${Date.now()}`,
      name: newInstrument.trim(),
      initialCount: 0,
    };
    onUpdateInstruments([...instruments, inst]);
    setNewInstrument('');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Questions */}
      <div className="space-y-3">
        {questions.map((q, i) => (
          <QuestionCard key={q.id} question={q} onAnswer={onAnswer} index={i} />
        ))}
      </div>

      {/* Instruments section */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Wrench className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Conteo de Instrumentos</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Ingresa la cantidad inicial de cada instrumento. Los que tengan cantidad 0 serán ignorados.
        </p>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {instruments.map((inst) => (
            <div key={inst.id} className="flex items-center gap-3 rounded-lg border bg-background p-3">
              <span className="flex-1 text-sm text-foreground">{inst.name}</span>
              <Input
                type="number"
                min={0}
                value={inst.initialCount}
                onChange={(e) => updateCount(inst.id, parseInt(e.target.value) || 0)}
                className="w-20 text-center"
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => removeInstrument(inst.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Add new instrument */}
        <div className="mt-4 flex gap-2">
          <Input
            placeholder="Agregar nuevo instrumento..."
            value={newInstrument}
            onChange={(e) => setNewInstrument(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInstrument())}
          />
          <Button type="button" variant="outline" onClick={addInstrument} className="gap-1.5 shrink-0">
            <Plus className="h-4 w-4" /> Agregar
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
