import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchableSelect from '@/components/SearchableSelect';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';

export default function NewSurgery() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    patient: '', patientId: '', procedure: '', room: '', date: '', time: '', surgeon: '', anesthesiologist: '', checklistOwner: '',
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

  const surgeonsList = consultaUsers.filter(u => u.specialty === 'cirujano').map(u => u.name);
  const anesthesiologistsList = consultaUsers.filter(u => u.specialty === 'anestesiologo').map(u => u.name);
  const encargadosList = encargadoUsers.map(u => u.name);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.surgeon || !form.anesthesiologist) {
      toast.error('Selecciona un cirujano y un anestesiólogo');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('surgeries').insert({
      patient: form.patient,
      patient_id: form.patientId || null,
      procedure_name: form.procedure,
      room: form.room,
      date: form.date,
      time: form.time,
      surgeon: form.surgeon,
      anesthesiologist: form.anesthesiologist,
      checklist_owner: form.checklistOwner,
      created_by: user?.id,
      clinic_id: user?.clinicId || null,
    });
    if (error) {
      toast.error('Error al programar la cirugía: ' + error.message);
    } else {
      toast.success('Cirugía programada exitosamente');
      navigate('/dashboard');
    }
    setSubmitting(false);
  };

  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Programar Cirugía</h1>
            <p className="text-sm text-muted-foreground">Complete los datos para crear una nueva cirugía</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border bg-card p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Nombre del Paciente</Label>
              <Input className="mt-1.5" placeholder="Nombre completo" value={form.patient} onChange={(e) => setForm({ ...form, patient: e.target.value })} required />
            </div>
            <div>
              <Label>Identificación del Paciente</Label>
              <Input className="mt-1.5" placeholder="Cédula o ID" value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} required />
            </div>
            <div className="sm:col-span-2">
              <Label>Procedimiento</Label>
              <Input className="mt-1.5" placeholder="Tipo de cirugía" value={form.procedure} onChange={(e) => setForm({ ...form, procedure: e.target.value })} required />
            </div>
            <div>
              <Label>Sala / Quirófano</Label>
              <Select onValueChange={(v) => setForm({ ...form, room: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: clinicRooms }, (_, i) => `Quirófano ${i + 1}`).map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha</Label>
              <Input className="mt-1.5" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div>
              <Label>Hora</Label>
              <Input className="mt-1.5" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required />
            </div>
            <div>
              <Label>Cirujano</Label>
              <div className="mt-1.5">
                <SearchableSelect options={surgeonsList} value={form.surgeon} onChange={(v) => setForm({ ...form, surgeon: v })} placeholder="Buscar cirujano..." />
              </div>
            </div>
            <div>
              <Label>Anestesiólogo</Label>
              <div className="mt-1.5">
                <SearchableSelect options={anesthesiologistsList} value={form.anesthesiologist} onChange={(v) => setForm({ ...form, anesthesiologist: v })} placeholder="Buscar anestesiólogo..." />
              </div>
            </div>
            <div>
              <Label>Encargado del Checklist</Label>
              <div className="mt-1.5">
                <SearchableSelect options={encargadosList} value={form.checklistOwner} onChange={(v) => setForm({ ...form, checklistOwner: v })} placeholder="Buscar encargado..." />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate('/dashboard')}>Cancelar</Button>
            <Button type="submit" className="gap-2" disabled={submitting}><Save className="h-4 w-4" /> Programar Cirugía</Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
