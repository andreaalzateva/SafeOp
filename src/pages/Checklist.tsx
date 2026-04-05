import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/authContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { signInQuestions, timeOutQuestions, signOutQuestions, commonInstruments } from '@/lib/mockData';
import type { ChecklistQuestion, InstrumentCount } from '@/lib/mockData';
import ChecklistSignIn from '@/components/checklist/ChecklistSignIn';
import ChecklistTimeOut from '@/components/checklist/ChecklistTimeOut';
import ChecklistSignOut from '@/components/checklist/ChecklistSignOut';
import ChecklistSignature from '@/components/checklist/ChecklistSignature';
import { motion } from 'framer-motion';
import { CheckCircle2, MapPin, Clock, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const moments = [
  { key: 'sign-in', label: 'Sign In', subtitle: 'Antes de la anestesia' },
  { key: 'time-out', label: 'Time Out', subtitle: 'Antes de la incisión' },
  { key: 'sign-out', label: 'Sign Out', subtitle: 'Antes de cerrar' },
  { key: 'signature', label: 'Firma', subtitle: 'Firma electrónica' },
];

const statusToMoment: Record<string, number> = {
  'programada': 0,
  'sign-in': 1,
  'time-out': 2,
  'sign-out': 3,
};

export default function Checklist() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: surgery, isLoading } = useQuery({
    queryKey: ['surgery', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('surgeries').select('*').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
  });

  const [currentMoment, setCurrentMoment] = useState(0);
  const [completed, setCompleted] = useState([false, false, false, false]);
  const [startTime] = useState(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));

  const [signInAnswers, setSignInAnswers] = useState<ChecklistQuestion[]>(
    signInQuestions.map((q) => ({ ...q, answer: null }))
  );
  const [timeOutAnswers, setTimeOutAnswers] = useState<ChecklistQuestion[]>(
    timeOutQuestions.map((q) => ({ ...q, answer: null }))
  );
  const [instruments, setInstruments] = useState<InstrumentCount[]>(
    commonInstruments.map((name, i) => ({ id: `inst-${i}`, name, initialCount: 0 }))
  );
  const [signOutAnswers, setSignOutAnswers] = useState<ChecklistQuestion[]>(
    signOutQuestions.map((q) => ({ ...q, answer: null }))
  );
  const [finalInstruments, setFinalInstruments] = useState<InstrumentCount[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (surgery) {
      const momentIdx = statusToMoment[surgery.status] ?? 0;
      setCurrentMoment(momentIdx);
      const comp = [false, false, false, false];
      for (let i = 0; i < momentIdx; i++) comp[i] = true;
      setCompleted(comp);
    }
  }, [surgery]);

  if (isLoading) {
    return <Layout><div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></Layout>;
  }

  if (!surgery) {
    return <Layout><p className="text-muted-foreground">Cirugía no encontrada.</p></Layout>;
  }

  const noBlockingAnswers = (questions: ChecklistQuestion[]) =>
    questions.every((q) => !(q.blockOnNo && q.answer === 'no'));

  const allSignInAnswered = signInAnswers.every((q) => q.answer !== null);
  const signInFollowUpsOk = signInAnswers.every((q) => {
    const trigger = q.followUpOnYes ? 'si' : 'no';
    if (q.followUpText && q.answer === trigger) {
      return q.followUpAnswer !== null;
    }
    return true;
  });
  const allTimeOutAnswered = timeOutAnswers.every((q) => q.answer !== null);
  const usedInstruments = instruments.filter((i) => i.initialCount > 0);
  const allSignOutAnswered = signOutAnswers.every((q) => q.answer !== null);
  const instrumentsMatch = finalInstruments.length > 0 && finalInstruments.every((i) => i.finalCount === i.initialCount);

  const canAdvance = () => {
    if (currentMoment === 0) return allSignInAnswered && signInFollowUpsOk && noBlockingAnswers(signInAnswers);
    if (currentMoment === 1) return allTimeOutAnswered && usedInstruments.length > 0 && noBlockingAnswers(timeOutAnswers);
    if (currentMoment === 2) return allSignOutAnswered && instrumentsMatch && noBlockingAnswers(signOutAnswers);
    return true;
  };

  const handleAnswer = (list: ChecklistQuestion[], setList: React.Dispatch<React.SetStateAction<ChecklistQuestion[]>>, questionId: string, answer: 'si' | 'no') => {
    setList(list.map((q) => {
      if (q.id !== questionId) return q;
      const trigger = q.followUpOnYes ? 'si' : 'no';
      const resetFollowUp = answer !== trigger ? null : q.followUpAnswer;
      return { ...q, answer, followUpAnswer: resetFollowUp, answeredBy: user?.name, answeredAt: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) };
    }));
  };

  const handleFollowUpAnswer = (list: ChecklistQuestion[], setList: React.Dispatch<React.SetStateAction<ChecklistQuestion[]>>, questionId: string, answer: 'si' | 'no') => {
    setList(list.map((q) =>
      q.id === questionId ? { ...q, followUpAnswer: answer } : q
    ));
  };

  const savePhase = async (phase: string, questions: ChecklistQuestion[]) => {
    // Create phase record
    const { data: phaseRow, error: phaseErr } = await supabase.from('checklist_phases').insert({
      surgery_id: id!,
      phase,
      completed_at: new Date().toISOString(),
      completed_by: user?.id,
    }).select('id').single();
    if (phaseErr || !phaseRow) throw phaseErr;

    // Save answers
    if (questions.length > 0) {
      const answers = questions.flatMap((q) => {
        const rows = [{
          phase_id: phaseRow.id,
          question_id: q.id,
          question_text: q.text,
          answer: q.answer || null,
          answered_by: q.answeredBy || null,
          answered_at: q.answeredAt ? new Date().toISOString() : null,
        }];
        const trigger = q.followUpOnYes ? 'si' : 'no';
        if (q.followUpText && q.answer === trigger) {
          rows.push({
            phase_id: phaseRow.id,
            question_id: q.id + '-followup',
            question_text: q.followUpText,
            answer: q.followUpAnswer || null,
            answered_by: q.answeredBy || null,
            answered_at: q.answeredAt ? new Date().toISOString() : null,
          });
        }
        return rows;
      });
      const { error: ansErr } = await supabase.from('checklist_answers').insert(answers);
      if (ansErr) throw ansErr;
    }
    return phaseRow.id;
  };

  const handleNext = async () => {
    if (!canAdvance()) {
      toast.error('Debes completar todos los campos antes de continuar.');
      return;
    }

    setSaving(true);
    try {
      const phaseKey = moments[currentMoment].key;
      const nextStatus = moments[currentMoment + 1]?.key || 'completada';

      if (currentMoment === 0) {
        await savePhase('sign-in', signInAnswers);
      } else if (currentMoment === 1) {
        await savePhase('time-out', timeOutAnswers);
        // Save instruments
        const instRows = usedInstruments.map((inst) => ({
          surgery_id: id!,
          name: inst.name,
          initial_count: inst.initialCount,
        }));
        await supabase.from('instruments').insert(instRows);
      } else if (currentMoment === 2) {
        await savePhase('sign-out', signOutAnswers);
        // Update final counts
        for (const inst of finalInstruments) {
          await supabase.from('instruments')
            .update({ final_count: inst.finalCount })
            .eq('surgery_id', id!)
            .eq('name', inst.name);
        }
      }

      // Update surgery status
      await supabase.from('surgeries').update({ status: nextStatus as any }).eq('id', id!);

      const newCompleted = [...completed];
      newCompleted[currentMoment] = true;
      setCompleted(newCompleted);

      if (currentMoment === 1) {
        setFinalInstruments(usedInstruments.map((i) => ({ ...i, finalCount: undefined })));
      }

      if (currentMoment < 3) {
        setCurrentMoment(currentMoment + 1);
        toast.success(`${moments[currentMoment].label} completado`);
      }
    } catch (err: any) {
      toast.error('Error al guardar: ' + (err?.message || 'Error desconocido'));
    }
    setSaving(false);
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      await supabase.from('checklist_signatures').insert({
        surgery_id: id!,
        signer_name: user?.name || '',
        signer_role: user?.role || '',
        start_time: startTime,
        end_time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        accepted: true,
      });
      await supabase.from('surgeries').update({ status: 'completada' as any }).eq('id', id!);
      toast.success('¡Cirugía completada con trazabilidad completa!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error('Error al firmar: ' + (err?.message || ''));
    }
    setSaving(false);
  };

  return (
    <Layout>
      <div className="mb-6 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-semibold text-foreground">{surgery.patient}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">{surgery.procedure_name}</span>
          <span className="text-muted-foreground">•</span>
          <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{surgery.room}</span>
          <span className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3.5 w-3.5" />{surgery.time}</span>
        </div>
      </div>

      <div className="mb-8 flex items-center justify-center gap-2 flex-wrap">
        {moments.map((m, i) => (
          <div key={m.key} className="flex items-center gap-2">
            <div className={`flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-all ${
              i === currentMoment ? 'bg-primary text-primary-foreground' : completed[i] ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
            }`}>
              {completed[i] ? <CheckCircle2 className="h-4 w-4" /> : <span className="font-bold">{i + 1}</span>}
              <span className="hidden sm:inline">{m.label}</span>
            </div>
            {i < 3 && <div className={`h-0.5 w-6 ${completed[i] ? 'bg-success' : 'bg-border'}`} />}
          </div>
        ))}
      </div>

      <motion.div key={currentMoment} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">{moments[currentMoment].label}</h2>
        <p className="text-muted-foreground">{moments[currentMoment].subtitle}</p>
      </motion.div>

      {currentMoment === 0 && <ChecklistSignIn questions={signInAnswers} onAnswer={(qId, ans) => handleAnswer(signInAnswers, setSignInAnswers, qId, ans)} onFollowUpAnswer={(qId, ans) => handleFollowUpAnswer(signInAnswers, setSignInAnswers, qId, ans)} patientName={surgery.patient} patientId={(surgery as any).patient_id || undefined} patientWeight={(surgery as any).patient_weight || undefined} surgeonName={surgery.surgeon} anesthesiologistName={surgery.anesthesiologist} />}
      {currentMoment === 1 && <ChecklistTimeOut questions={timeOutAnswers} onAnswer={(qId, ans) => handleAnswer(timeOutAnswers, setTimeOutAnswers, qId, ans)} instruments={instruments} onUpdateInstruments={setInstruments} />}
      {currentMoment === 2 && <ChecklistSignOut questions={signOutAnswers} onAnswer={(qId, ans) => handleAnswer(signOutAnswers, setSignOutAnswers, qId, ans)} instruments={finalInstruments} onUpdateFinalCount={(instId, count) => setFinalInstruments((prev) => prev.map((i) => i.id === instId ? { ...i, finalCount: count } : i))} />}
      {currentMoment === 3 && <ChecklistSignature userName={user?.name || ''} userRole={user?.role || ''} startTime={startTime} endTime={new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} onAccept={handleComplete} />}

      {currentMoment < 3 && (
        <div className="mt-8 flex items-center justify-between">
          <Button variant="outline" onClick={() => currentMoment > 0 ? setCurrentMoment(currentMoment - 1) : navigate('/dashboard')} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> {currentMoment > 0 ? 'Anterior' : 'Volver'}
          </Button>
          <Button onClick={handleNext} className="gap-2" disabled={!canAdvance() || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Siguiente Momento <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </Layout>
  );
}
