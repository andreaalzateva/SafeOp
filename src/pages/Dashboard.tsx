import { useAuth } from '@/lib/authContext';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, User, ArrowRight, AlertTriangle, CheckCircle2, Activity, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const statusConfig: Record<string, { label: string; color: string }> = {
  programada: { label: 'Programada', color: 'bg-secondary text-secondary-foreground' },
  'sign-in': { label: 'Sign In', color: 'bg-primary/10 text-primary' },
  'time-out': { label: 'Time Out', color: 'bg-warning/10 text-warning' },
  'sign-out': { label: 'Sign Out', color: 'bg-accent/10 text-accent' },
  completada: { label: 'Completada', color: 'bg-success/10 text-success' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

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
  });

  const isCoordinator = user?.role === 'coordinador';
  const isConsulta = user?.role === 'consulta';

  const stats = isCoordinator
    ? [
        { label: 'Cirugías Hoy', value: surgeries.length, icon: Calendar, color: 'text-primary' },
        { label: 'En Curso', value: surgeries.filter((s) => !['programada', 'completada'].includes(s.status)).length, icon: Activity, color: 'text-warning' },
        { label: 'Completadas', value: surgeries.filter((s) => s.status === 'completada').length, icon: CheckCircle2, color: 'text-success' },
        { label: 'Alertas', value: 0, icon: AlertTriangle, color: 'text-destructive' },
      ]
    : null;

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

      {surgeries.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-muted-foreground">No hay cirugías registradas aún.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {surgeries.map((surgery, i) => {
            const status = statusConfig[surgery.status] || statusConfig.programada;
            const canStartChecklist = user?.role === 'encargado' && surgery.status !== 'completada';

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
