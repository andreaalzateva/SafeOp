import { useState, useEffect, useRef, useCallback } from 'react';
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
  'sign-in': 0,
  'time-out': 1,
  'sign-out': 2,
  'signature': 3,
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

  // Load existing phases and answers for this surgery
  const { data: existingPhases = [], isFetched: phasesFetched } = useQuery({
    queryKey: ['checklist-phases', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('checklist_phases').select('*').eq('surgery_id', id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: existingAnswers = [], isFetched: answersFetched } = useQuery({
    queryKey: ['checklist-answers', id],
    queryFn: async () => {
      const phaseIds = existingPhases.map(p => p.id);
      if (phaseIds.length === 0) return [];
      const { data, error } = await supabase.from('checklist_answers').select('*').in('phase_id', phaseIds);
      if (error) throw error;
      return data;
    },
    enabled: existingPhases.length > 0,
  });

  const { data: existingInstruments = [] } = useQuery({
    queryKey: ['checklist-instruments', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('instruments').select('*').eq('surgery_id', id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const [currentMoment, setCurrentMoment] = useState(0);
  const [completed, setCompleted] = useState([false, false, false, false]);
  const [startTime] = useState(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
  const [restored, setRestored] = useState(false);

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

  // Mark surgery as in-progress on entry
  useEffect(() => {
    if (!surgery || surgery.status !== 'programada') return;
    const updateStatus = async () => {
      const { error } = await supabase
        .from('surgeries')
        .update({ status: 'sign-in' })
        .eq('id', id!);
      if (error) console.error('Error updating surgery status:', error);
    };
    updateStatus();
  }, [surgery, id]);

  // Restore saved progress
  useEffect(() => {
    if (!surgery || restored || !phasesFetched) return;
    if (existingPhases.length > 0 && !answersFetched) return;

    const momentIdx = statusToMoment[surgery.status] ?? 0;
    setCurrentMoment(momentIdx);
    const comp = [false, false, false, false];
    for (let i = 0; i < momentIdx; i++) comp[i] = true;
    setCompleted(comp);

    // Restore saved answers into the current phase's state
    if (existingAnswers.length > 0) {
      const restoreAnswers = (
        questions: ChecklistQuestion[],
        phaseName: string
      ): ChecklistQuestion[] => {
        const phase = existingPhases.find(p => p.phase === phaseName);
        if (!phase) return questions;
        const phaseAnswers = existingAnswers.filter(a => a.phase_id === phase.id);
        return questions.map(q => {
          const saved = phaseAnswers.find(a => a.question_id === q.id);
          const savedFollowUp = phaseAnswers.find(a => a.question_id === q.id + '-followup');
          if (!saved) return q;
          return {
            ...q,
            answer: (saved.answer as 'si' | 'no') || null,
            answeredBy: saved.answered_by || undefined,
            answeredAt: saved.answered_at ? new Date(saved.answered_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : undefined,
            followUpAnswer: savedFollowUp ? (savedFollowUp.answer as 'si' | 'no') || null : q.followUpAnswer,
          };
        });
      };

      if (existingPhases.some(p => p.phase === 'sign-in')) {
        setSignInAnswers(prev => restoreAnswers(prev, 'sign-in'));
      }
      if (existingPhases.some(p => p.phase === 'time-out')) {
        setTimeOutAnswers(prev => restoreAnswers(prev, 'time-out'));
      }
      if (existingPhases.some(p => p.phase === 'sign-out')) {
        setSignOutAnswers(prev => restoreAnswers(prev, 'sign-out'));
      }
    }

    // Restore instruments
    if (existingInstruments.length > 0) {
      setInstruments(prev => {
        const restored = prev.map(inst => {
          const saved = existingInstruments.find(ei => ei.name === inst.name);
          if (saved) return { ...inst, initialCount: saved.initial_count };
          return inst;
        });
        const extraInstruments = existingInstruments
          .filter(ei => !prev.some(p => p.name === ei.name))
          .map((ei, idx) => ({ id: `extra-${idx}`, name: ei.name, initialCount: ei.initial_count }));
        return [...restored, ...extraInstruments];
      });

      if (momentIdx >= 2) {
        const usedInsts = existingInstruments.filter(ei => ei.initial_count > 0);
        setFinalInstruments(usedInsts.map((ei, idx) => ({
          id: `inst-final-${idx}`,
          name: ei.name,
          initialCount: ei.initial_count,
          finalCount: ei.final_count ?? undefined,
        })));
      }
    }

    setRestored(true);
  }, [surgery, existingPhases, existingAnswers, existingInstruments, restored, phasesFetched, answersFetched]);

  // Auto-save partial answers for the current phase
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const autoSavePhase = useCallback(async (phase: string, questions: ChecklistQuestion[]) => {
    const answeredQuestions = questions.filter(q => q.answer !== null);
    if (answeredQuestions.length === 0) return;

    // Upsert: delete existing partial phase, then re-insert
    const existingPhase = existingPhases.find(p => p.phase === phase);
    let phaseId: string;
    if (existingPhase) {
      phaseId = existingPhase.id;
      // Delete old answers for this phase
      await supabase.from('checklist_answers').delete().eq('phase_id', phaseId);
    } else {
      const { data: phaseRow, error } = await supabase.from('checklist_phases').insert({
        surgery_id: id!,
        phase,
        completed_by: user?.id,
      }).select('id').single();
      if (error || !phaseRow) return;
      phaseId = phaseRow.id;
    }

    const answers = answeredQuestions.flatMap((q) => {
      const rows = [{
        phase_id: phaseId,
        question_id: q.id,
        question_text: q.text,
        answer: q.answer || null,
        answered_by: q.answeredBy || null,
        answered_at: q.answeredAt ? new Date().toISOString() : null,
      }];
      const trigger = q.followUpOnYes ? 'si' : 'no';
      if (q.followUpText && q.answer === trigger && q.followUpAnswer) {
        rows.push({
          phase_id: phaseId,
          question_id: q.id + '-followup',
          question_text: q.followUpText,
          answer: q.followUpAnswer || null,
          answered_by: q.answeredBy || null,
          answered_at: q.answeredAt ? new Date().toISOString() : null,
        });
      }
      return rows;
    });
    if (answers.length > 0) {
      await supabase.from('checklist_answers').insert(answers);
    }
  }, [id, user, existingPhases]);

  // Debounced auto-save when answers change
  useEffect(() => {
    if (!restored || !id) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      const phaseKey = moments[currentMoment].key;
      const answersMap: Record<string, ChecklistQuestion[]> = {
        'sign-in': signInAnswers,
        'time-out': timeOutAnswers,
        'sign-out': signOutAnswers,
      };
      if (answersMap[phaseKey]) {
        autoSavePhase(phaseKey, answersMap[phaseKey]);
      }
    }, 2000);
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [signInAnswers, timeOutAnswers, signOutAnswers, currentMoment, restored, id, autoSavePhase]);

  if (isLoading) {
    return <Layout><div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></Layout>;
  }

  if (!surgery) {
    return <Layout><p className="text-muted-foreground">Cirugía no encontrada.</p></Layout>;
  }

  const today = new Date().toISOString().split('T')[0];
  if (surgery.date !== today) {
    return (
      <Layout>
        <div className="mx-auto max-w-lg mt-12 text-center rounded-xl border bg-card p-8">
          <p className="text-lg font-semibold text-foreground mb-2">Checklist no disponible</p>
          <p className="text-sm text-muted-foreground mb-4">
            Solo se puede realizar el checklist el mismo día en que la cirugía está programada.
          </p>
          <p className="text-sm text-muted-foreground">
            Fecha programada: <span className="font-medium text-foreground">{new Date(surgery.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </p>
          <Button className="mt-6" onClick={() => navigate('/dashboard')}>Volver al Dashboard</Button>
        </div>
      </Layout>
    );
  }

  const noBlockingAnswers = (questions: ChecklistQuestion[]) =>
    questions.every((q) => !(q.blockOnNo && q.answer === 'no'));

  const allSignInAnswered = signInAnswers.every((q) => q.answer !== null);
  const followUpsOk = (questions: ChecklistQuestion[]) => questions.every((q) => {
    const trigger = q.followUpOnYes ? 'si' : 'no';
    if (q.followUpText && q.answer === trigger) {
      if (q.followUpAnswer === null) return false;
      if (q.followUpBlockAnswer != null && q.followUpAnswer === q.followUpBlockAnswer) return false;
      return true;
    }
    return true;
  });
  const signInFollowUpsOk = followUpsOk(signInAnswers);
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