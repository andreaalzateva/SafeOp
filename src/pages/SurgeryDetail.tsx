import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/authContext';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchableSelect from '@/components/SearchableSelect';
import { ArrowLeft, Calendar, CheckCircle2, XCircle, Clock, User, MapPin, Shield, Wrench, Loader2, Pencil, Trash2, Save, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { getLocalToday } from '@/lib/utils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function SurgeryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isCoordinator = user?.role === 'coordinador';

  const { data: surgery, isLoading: loadingSurgery } = useQuery({
    queryKey: ['surgery-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('surgeries').select('*').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
  });

  const [editForm, setEditForm] = useState({
    patient: '', patient_id: '', patient_weight: '', procedure_name: '', room: '', date: '', time: '',
    surgeon: '', anesthesiologist: '', checklist_owner: '',
  });

  const { data: consultaUsers = [] } = useQuery({
    queryKey: ['consulta-users', user?.clinicId],
    queryFn: async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'consulta');
      if (!roles || roles.length === 0) return [];
      let query = supabase.from('profiles').select('id, name, specialty, clinic_id').in('id', roles.map(r => r.user_id));
      if (user?.clinicId) query = query.eq('clinic_id', user.clinicId);
      const { data: profiles } = await query;
      return profiles || [];
    },
  });

  const { data: encargadoUsers = [] } = useQuery({
    queryKey: ['encargado-users', user?.clinicId],
    queryFn: async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'encargado');
      if (!roles || roles.length === 0) return [];
      let query = supabase.from('profiles').select('id, name, clinic_id').in('id', roles.map(r => r.user_id));
      if (user?.clinicId) query = query.eq('clinic_id', user.clinicId);
      const { data: profiles } = await query;
      return profiles || [];
    },
  });

  const surgeonsList = consultaUsers.filter(u => u.specialty === 'cirujano').map(u => u.name);
  const anesthesiologistsList = consultaUsers.filter(u => u.specialty === 'anestesiologo').map(u => u.name);
  const encargadosList = encargadoUsers.map(u => u.name);

  const { data: clinicData } = useQuery({
    queryKey: ['clinic-rooms', user?.clinicId],
    queryFn: async () => {
      if (!user?.clinicId) return null;
      const { data } = await supabase.from('clinics').select('num_operating_rooms').eq('id', user.clinicId).single();
      return data;
    },
    enabled: !!user?.clinicId,
  });
  const clinicRooms = (clinicData as any)?.num_operating_rooms || 4;

  const { data: phases = [] } = useQuery({
    queryKey: ['phases', id],
    queryFn: async () => {
      // Unique constraint ensures one row per (surgery_id, phase)
      const { data, error } = await supabase
        .from('checklist_phases')
        .select('*')
        .eq('surgery_id', id!)
        .not('completed_at', 'is', null)
        .order('created_at');
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: answers = [] } = useQuery({
    queryKey: ['answers', id],
    queryFn: async () => {
      const phaseIds = phases.map((p) => p.id);
      if (phaseIds.length === 0) return [];
      const { data, error } = await supabase.from('checklist_answers').select('*').in('phase_id', phaseIds);
      if (error) throw error;
      return data;
    },
    enabled: phases.length > 0,
  });

  const { data: instruments = [] } = useQuery({
    queryKey: ['instruments', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('instruments').select('*').eq('surgery_id', id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: signature } = useQuery({
    queryKey: ['signature', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('checklist_signatures').select('*').eq('surgery_id', id!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const startEditing = () => {
    if (!surgery) return;
    setEditForm({
      patient: surgery.patient,
      patient_id: (surgery as any).patient_id || '',
      patient_weight: (surgery as any).patient_weight ? String((surgery as any).patient_weight) : '',
      procedure_name: surgery.procedure_name,
      room: surgery.room,
      date: surgery.date,
      time: surgery.time,
      surgeon: surgery.surgeon,
      anesthesiologist: surgery.anesthesiologist,
      checklist_owner: surgery.checklist_owner,
    });
    setEditing(true);
  };

  const handleSave = async () => {
    const today = getLocalToday();
    if (editForm.date < today) {
      toast.error('No se puede programar una cirugía en una fecha pasada');
      return;
    }
    if (editForm.date === today && editForm.time) {
      const now = new Date();
      const [h, m] = editForm.time.split(':').map(Number);
      const selected = new Date();
      selected.setHours(h, m, 0, 0);
      if (selected <= now) {
        toast.error('La hora seleccionada ya pasó. Elige una hora futura.');
        return;
      }
    }
    setSaving(true);
    const { error } = await supabase.from('surgeries').update({
      patient: editForm.patient,
      patient_id: editForm.patient_id || null,
      patient_weight: editForm.patient_weight ? parseFloat(editForm.patient_weight) : null,
      procedure_name: editForm.procedure_name,
      room: editForm.room,
      date: editForm.date,
      time: editForm.time,
      surgeon: editForm.surgeon,
      anesthesiologist: editForm.anesthesiologist,
      checklist_owner: editForm.checklist_owner,
    }).eq('id', id!);
    if (error) {
      toast.error('Error al guardar: ' + error.message);
    } else {
      toast.success('Cirugía actualizada');
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['surgery-detail', id] });
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.from('surgeries').delete().eq('id', id!);
    if (error) {
      toast.error('Error al eliminar: ' + error.message);
      setDeleting(false);
    } else {
      toast.success('Cirugía eliminada');
      navigate('/dashboard');
    }
  };

  if (loadingSurgery) {
    return <Layout><div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></Layout>;
  }

  if (!surgery) {
    return <Layout><p className="text-muted-foreground">Cirugía no encontrada.</p></Layout>;
  }

  const hasData = phases.length > 0;

  const getPhaseAnswers = (phaseName: string) => {
    const phase = phases.find((p) => p.phase === phaseName);
    if (!phase) return [];
    return answers.filter((a) => a.phase_id === phase.id);
  };

  const getPhaseCompletedAt = (phaseName: string) => {
    const phase = phases.find((p) => p.phase === phaseName);
    return phase?.completed_at ? new Date(phase.completed_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : undefined;
  };

  return (
    <Layout>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{surgery.patient}</h1>
              <p className="text-sm text-muted-foreground">{surgery.procedure_name}</p>
            </div>
          </div>
          {isCoordinator && !editing && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={startEditing} className="gap-2">
                <Pencil className="h-4 w-4" /> Editar
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-2">
                    <Trash2 className="h-4 w-4" /> Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar esta cirugía?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. Se eliminarán todos los datos asociados.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                      {deleting ? 'Eliminando...' : 'Eliminar'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {/* Edit Form */}
        {editing && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 rounded-xl border bg-card p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Editar Cirugía</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Paciente</Label>
                <Input className="mt-1.5" value={editForm.patient} onChange={e => setEditForm({ ...editForm, patient: e.target.value })} />
              </div>
              <div>
                <Label>Identificación</Label>
                <Input className="mt-1.5" placeholder="Cédula o ID" value={editForm.patient_id} onChange={e => setEditForm({ ...editForm, patient_id: e.target.value })} />
              </div>
              <div>
                <Label>Peso del Paciente (kg)</Label>
                <Input className="mt-1.5" type="number" step="0.1" min="0" placeholder="Ej: 72.5" value={editForm.patient_weight} onChange={e => setEditForm({ ...editForm, patient_weight: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Procedimiento</Label>
                <Input className="mt-1.5" value={editForm.procedure_name} onChange={e => setEditForm({ ...editForm, procedure_name: e.target.value })} />
              </div>
              <div>
                <Label>Sala</Label>
                <Select value={editForm.room} onValueChange={v => setEditForm({ ...editForm, room: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: clinicRooms }, (_, i) => `Quirófano ${i + 1}`).map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fecha</Label>
                <Input className="mt-1.5" type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} />
              </div>
              <div>
                <Label>Hora</Label>
                <Input className="mt-1.5" type="time" value={editForm.time} onChange={e => setEditForm({ ...editForm, time: e.target.value })} />
              </div>
              <div>
                <Label>Cirujano</Label>
                <div className="mt-1.5">
                  <SearchableSelect options={surgeonsList} value={editForm.surgeon} onChange={v => setEditForm({ ...editForm, surgeon: v })} placeholder="Buscar cirujano..." />
                </div>
              </div>
              <div>
                <Label>Anestesiólogo</Label>
                <div className="mt-1.5">
                  <SearchableSelect options={anesthesiologistsList} value={editForm.anesthesiologist} onChange={v => setEditForm({ ...editForm, anesthesiologist: v })} placeholder="Buscar anestesiólogo..." />
                </div>
              </div>
              <div>
                <Label>Encargado del Checklist</Label>
                <div className="mt-1.5">
                  <SearchableSelect options={encargadosList} value={editForm.checklist_owner} onChange={v => setEditForm({ ...editForm, checklist_owner: v })} placeholder="Buscar encargado..." />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditing(false)} className="gap-2"><X className="h-4 w-4" /> Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2"><Save className="h-4 w-4" /> {saving ? 'Guardando...' : 'Guardar'}</Button>
            </div>
          </motion.div>
        )}

        <div className="mb-6 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(surgery.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3.5 w-3.5" />{surgery.time}</span>
            <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{surgery.room}</span>
            <span className="flex items-center gap-1 text-muted-foreground"><User className="h-3.5 w-3.5" />{surgery.surgeon}</span>
          </div>
        </div>

        {!hasData ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <p className="text-muted-foreground">Esta cirugía aún no tiene datos de checklist completados.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {getPhaseAnswers('sign-in').length > 0 && (
              <Section title="Sign In — Antes de la anestesia" completedAt={getPhaseCompletedAt('sign-in')}>
                {getPhaseAnswers('sign-in').map((q) => (
                  <AnswerRow key={q.id} text={q.question_text} answer={q.answer as 'si' | 'no' | null} answeredBy={q.answered_by || undefined} />
                ))}
              </Section>
            )}

            {getPhaseAnswers('time-out').length > 0 && (
              <Section title="Time Out — Antes de la incisión" completedAt={getPhaseCompletedAt('time-out')}>
                {getPhaseAnswers('time-out').map((q) => (
                  <AnswerRow key={q.id} text={q.question_text} answer={q.answer as 'si' | 'no' | null} answeredBy={q.answered_by || undefined} />
                ))}
                {instruments.length > 0 && (
                  <div className="mt-4 rounded-lg border bg-background p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Wrench className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold text-foreground">Instrumentos registrados</p>
                    </div>
                    <div className="space-y-1">
                      {instruments.map((i) => (
                        <div key={i.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                          <span className="text-foreground">{i.name}</span>
                          <span className="text-muted-foreground font-medium">{i.initial_count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Section>
            )}

            {getPhaseAnswers('sign-out').length > 0 && (
              <Section title="Sign Out — Antes de cerrar" completedAt={getPhaseCompletedAt('sign-out')}>
                {getPhaseAnswers('sign-out').map((q) => (
                  <AnswerRow key={q.id} text={q.question_text} answer={q.answer as 'si' | 'no' | null} answeredBy={q.answered_by || undefined} />
                ))}
                {instruments.some((i) => i.final_count !== null) && (
                  <div className="rounded-lg border bg-background p-4 mt-3">
                    <p className="text-sm font-semibold text-foreground mb-3">Verificación de Instrumentos</p>
                    <div className="overflow-hidden rounded-lg border">
                      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
                        <span>Instrumento</span>
                        <span className="w-16 text-center">Inicial</span>
                        <span className="w-16 text-center">Final</span>
                        <span className="w-12 text-center">OK</span>
                      </div>
                      {instruments.map((i) => (
                        <div key={i.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center border-t px-4 py-2">
                          <span className="text-sm text-foreground">{i.name}</span>
                          <span className="w-16 text-center text-sm">{i.initial_count}</span>
                          <span className="w-16 text-center text-sm">{i.final_count ?? '—'}</span>
                          <div className="w-12 flex justify-center">
                            {i.final_count === i.initial_count
                              ? <CheckCircle2 className="h-4 w-4 text-success" />
                              : <XCircle className="h-4 w-4 text-destructive" />
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Section>
            )}

            {signature && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Firma Electrónica</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  <div><span className="text-muted-foreground">Responsable:</span> <span className="font-medium text-foreground">{signature.signer_name}</span></div>
                  <div><span className="text-muted-foreground">Rol:</span> <span className="font-medium text-foreground capitalize">{signature.signer_role}</span></div>
                  <div><span className="text-muted-foreground">Inicio:</span> <span className="font-medium text-foreground">{signature.start_time}</span></div>
                  <div><span className="text-muted-foreground">Fin:</span> <span className="font-medium text-foreground">{signature.end_time}</span></div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" /> Checklist aceptado y firmado
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

function Section({ title, completedAt, children }: { title: string; completedAt?: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {completedAt && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{completedAt}</span>}
      </div>
      <div className="space-y-2">{children}</div>
    </motion.div>
  );
}

function AnswerRow({ text, answer, answeredBy }: { text: string; answer?: 'si' | 'no' | null; answeredBy?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-background p-3">
      {answer === 'si' ? <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0 text-success" /> : answer === 'no' ? <XCircle className="h-5 w-5 mt-0.5 shrink-0 text-warning" /> : <div className="h-5 w-5 mt-0.5 shrink-0 rounded-full border border-muted-foreground" />}
      <div className="flex-1">
        <p className="text-sm text-foreground">{text}</p>
        {answeredBy && <p className="mt-1 text-xs text-muted-foreground">{answeredBy}</p>}
      </div>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${answer === 'si' ? 'bg-success/10 text-success' : answer === 'no' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>
        {answer === 'si' ? 'Sí' : answer === 'no' ? 'No' : '—'}
      </span>
    </div>
  );
}
