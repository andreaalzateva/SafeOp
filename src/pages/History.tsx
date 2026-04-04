import Layout from '@/components/Layout';
import { useAuth } from '@/lib/authContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function History() {
  const { user } = useAuth();

  const { data: surgeries = [], isLoading } = useQuery({
    queryKey: ['surgeries-history', user?.clinicId],
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

  if (isLoading) {
    return <Layout><div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></Layout>;
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Historial de Cirugías</h1>
        <p className="text-sm text-muted-foreground">Registro completo con trazabilidad</p>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 border-b bg-muted/50 px-5 py-3 text-xs font-medium text-muted-foreground">
          <span>Paciente</span>
          <span>Procedimiento</span>
          <span>Sala</span>
          <span>Hora</span>
          <span>Estado</span>
        </div>
        {surgeries.length === 0 ? (
          <div className="px-5 py-8 text-center text-muted-foreground">No hay cirugías registradas.</div>
        ) : surgeries.map((s, i) => (
          <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="grid grid-cols-[1fr_1fr_auto_auto_auto] items-center gap-4 border-b px-5 py-4 last:border-0">
            <div>
              <p className="text-sm font-medium text-foreground">{s.patient}</p>
              <p className="text-xs text-muted-foreground">{s.surgeon}</p>
            </div>
            <p className="text-sm text-muted-foreground">{s.procedure_name}</p>
            <span className="text-sm text-muted-foreground">{s.room}</span>
            <span className="text-sm text-muted-foreground">{s.time}</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
              s.status === 'completada' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
            }`}>
              {s.status === 'completada' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              {s.status === 'completada' ? 'Completada' : 'Pendiente'}
            </span>
          </motion.div>
        ))}
      </div>
    </Layout>
  );
}
