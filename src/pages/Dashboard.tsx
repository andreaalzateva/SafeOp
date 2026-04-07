import { useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, User, ArrowRight, AlertTriangle, CheckCircle2, Activity, Eye, Loader2, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { statusConfig, getStatusConfig } from '@/lib/surgeryStatus';
import { getLocalToday } from '@/lib/utils';
import { signInQuestions, timeOutQuestions, signOutQuestions } from '@/lib/mockData';

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const isCoordinator = user?.role === 'coordinador';

  const { data: surgeries = [], isLoading } = useQuery({
    queryKey: ['surgeries', user?.clinicId],
    queryFn: async () => {
      let query = supabase
        .from('surgeries')
        .select('*')
        .order('date', { ascending: false })
        .order('time', { ascending: true });
      if (user?.clinicId) query = query.eq('clinic_id', user.clinicId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Build sets of question IDs that represent true alerts (blocking "no" answers)
  const blockOnNoIds = new Set(
    [...signInQuestions, ...timeOutQuestions, ...signOutQuestions]
      .filter(q => q.blockOnNo)
      .map(q => q.id)
  );
  const followUpBlockMap = new Map(
    [...signInQuestions, ...timeOutQuestions, ...signOutQuestions]
      .filter(q => q.followUpText && q.followUpBlockAnswer)
      .map(q => [q.id + '-followup', q.followUpBlockAnswer!])
  );

  // Count surgeries with truly invalid "no" answers (alerts) for coordinator dashboard
  // Uses only the canonical phase row per surgery (unique constraint ensures one per phase)
  const { data: alertCount = 0 } = useQuery({
    queryKey: ['surgery-alerts', user?.clinicId],
    queryFn: async () => {
      const surgeryIds = surgeries.map(s => s.id);
      if (surgeryIds.length === 0) return 0;

      // Only completed phases count for alerts
      const { data: phases } = await supabase
        .from('checklist_phases')
        .select('id, surgery_id')
        .in('surgery_id', surgeryIds)
        .not('completed_at', 'is', null);
      if (!phases || phases.length === 0) return 0;

      const { data: answers } = await supabase
        .from('checklist_answers')
        .select('phase_id, question_id, answer')
        .in('phase_id', phases.map(p => p.id));
      if (!answers) return 0;

      const phaseToSurgery = new Map(phases.map(p => [p.id, p.surgery_id]));
      const surgeriesWithAlerts = new Set<string>();

      for (const a of answers) {
        if (!a.answer) continue;
        const isBlockingNo = a.answer === 'no' && blockOnNoIds.has(a.question_id);
        const followUpBlock = followUpBlockMap.get(a.question_id);
        const isBlockingFollowUp = followUpBlock !== undefined && a.answer === followUpBlock;
        if (isBlockingNo || isBlockingFollowUp) {
          const surgeryId = phaseToSurgery.get(a.phase_id);
          if (surgeryId) surgeriesWithAlerts.add(surgeryId);
        }
      }
      return surgeriesWithAlerts.size;
    },
    enabled: isCoordinator && surgeries.length > 0,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const today = getLocalToday();
  const isConsulta = user?.role === 'consulta';

  const stats = isCoordinator
    ? [
        { label: 'Cirugías Hoy', value: surgeries.filter((s) => s.date === today).length, icon: Calendar, color: 'text-primary' },
        { label: 'En Curso', value: surgeries.filter((s) => !['programada', 'completada'].includes(s.status)).length, icon: Activity, color: 'text-warning' },
        { label: 'Completadas', value: surgeries.filter((s) => s.status === 'completada' && s.date === today).length, icon: CheckCircle2, color: 'text-success' },
        { label: 'Alertas', value: alertCount, icon: AlertTriangle, color: 'text-destructive' },
      ]
    : null;

  const filtered = surgeries.filter((s) => {
    const matchesSearch =
      !searchTerm ||
      s.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.procedure_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.surgeon.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.room && s.room.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {isCoordinator ? 'Dashboard del Coordinador' : user?.role === 'encargado' ? 'Mis Cirugías' : 'Cirugías Asignadas'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {stats && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl border bg-card p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <Icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <p className="mt-2 text-3xl font-bold text-foreground">{s.value}</p>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por paciente, procedimiento, cirujano o sala..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="programada">Programada</SelectItem>
              <SelectItem value="sign-in">Sign In</SelectItem>
              <SelectItem value="time-out">Time Out</SelectItem>
              <SelectItem value="sign-out">Sign Out</SelectItem>
              <SelectItem value="completada">Completada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            {searchTerm || statusFilter !== 'all' ? 'No se encontraron resultados con los filtros aplicados.' : 'No hay cirugías registradas aún.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((surgery, i) => {
            const status = getStatusConfig(surgery.status);
            const canStartChecklist = user?.role === 'encargado' && surgery.status !== 'completada' && surgery.date === today;

            return (
              <motion.div key={surgery.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl border bg-card p-5 transition-shadow hover:shadow-md">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-foreground">{surgery.patient}</h3>
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{surgery.procedure_name}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatFullDate(surgery.date)}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{surgery.time}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{surgery.room}</span>
                      <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{surgery.surgeon}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {(isConsulta || isCoordinator) && (
                      <Button variant="outline" onClick={() => navigate(`/cirugia/${surgery.id}`)} className="gap-2">
                        <Eye className="h-4 w-4" /> Ver Detalle
                      </Button>
                    )}
                    {canStartChecklist && (
                      <Button onClick={() => navigate(`/checklist/${surgery.id}`)} className="gap-2">
                        {surgery.status === 'programada' ? 'Iniciar Checklist' : 'Continuar'}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}



