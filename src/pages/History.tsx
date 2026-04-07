import { useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/lib/authContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Clock, Loader2, Search, Filter } from 'lucide-react';
import { getStatusConfig } from '@/lib/surgeryStatus';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-ES', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

export default function History() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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
    return <Layout><div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></Layout>;
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Historial de Cirugías</h1>
        <p className="text-sm text-muted-foreground">Registro completo con trazabilidad</p>
      </div>

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

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/50 text-xs font-medium text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium border-r border-border">Paciente</th>
              <th className="px-4 py-3 text-left font-medium border-r border-border">Procedimiento</th>
              <th className="px-4 py-3 text-left font-medium border-r border-border">Sala</th>
              <th className="px-4 py-3 text-left font-medium border-r border-border">Fecha</th>
              <th className="px-4 py-3 text-left font-medium border-r border-border">Hora</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                {searchTerm || statusFilter !== 'all' ? 'No se encontraron resultados con los filtros aplicados.' : 'No hay cirugías registradas.'}
              </td></tr>
            ) : filtered.map((s, i) => (
              <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-t border-border">
                <td className="px-4 py-4 border-r border-border">
                  <p className="text-sm font-medium text-foreground">{s.patient}</p>
                  <p className="text-xs text-muted-foreground">{s.surgeon}</p>
                </td>
                <td className="px-4 py-4 text-sm text-muted-foreground border-r border-border">{s.procedure_name}</td>
                <td className="px-4 py-4 text-sm text-muted-foreground border-r border-border">{s.room}</td>
                <td className="px-4 py-4 text-sm text-muted-foreground whitespace-nowrap border-r border-border">{formatFullDate(s.date)}</td>
                <td className="px-4 py-4 text-sm text-muted-foreground border-r border-border">{s.time}</td>
                <td className="px-4 py-4">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusConfig(s.status).color}`}>
                    {getStatusConfig(s.status).label}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}