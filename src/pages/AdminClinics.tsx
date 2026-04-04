import { useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Building2, Plus, Loader2, Pencil, Trash2, Save, X } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function AdminClinics() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', nit: '', address: '', num_operating_rooms: '4' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', nit: '', address: '', num_operating_rooms: '4' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: clinics = [], isLoading } = useQuery({
    queryKey: ['clinics'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clinics').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const token = await getToken();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-clinic?action=create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...form, num_operating_rooms: parseInt(form.num_operating_rooms) || 4 }),
    });
    const result = await res.json();
    if (result.success) {
      toast.success(`Clínica "${form.name}" creada`);
      setForm({ name: '', nit: '', address: '', num_operating_rooms: '4' });
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['clinics'] });
    } else {
      toast.error(result.error || 'Error al crear clínica');
    }
    setSubmitting(false);
  };

  const startEdit = (c: typeof clinics[0]) => {
    setEditingId(c.id);
    setEditForm({ name: c.name, nit: c.nit, address: c.address, num_operating_rooms: String((c as any).num_operating_rooms || 4) });
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    setSavingEdit(true);
    const token = await getToken();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-clinic?action=update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ clinicId: editingId, ...editForm, num_operating_rooms: parseInt(editForm.num_operating_rooms) || 4 }),
    });
    const result = await res.json();
    if (result.success) {
      toast.success('Clínica actualizada');
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['clinics'] });
    } else {
      toast.error(result.error || 'Error al actualizar');
    }
    setSavingEdit(false);
  };

  const handleDelete = async (clinicId: string) => {
    setDeletingId(clinicId);
    const token = await getToken();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-clinic?action=delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ clinicId }),
    });
    const result = await res.json();
    if (result.success) {
      toast.success('Clínica eliminada');
      queryClient.invalidateQueries({ queryKey: ['clinics'] });
    } else {
      toast.error(result.error || 'Error al eliminar');
    }
    setDeletingId(null);
  };

  if (!user?.isSuperAdmin) {
    return <Layout><p className="text-destructive font-medium">No tienes permisos para ver esta página.</p></Layout>;
  }

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestión de Clínicas</h1>
          <p className="text-sm text-muted-foreground">Crea y administra las clínicas del sistema</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="h-4 w-4" /> Nueva Clínica
        </Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <form onSubmit={handleCreate} className="rounded-xl border bg-card p-6 space-y-4 max-w-lg">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" /> Crear nueva clínica
            </h2>
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input placeholder="Clínica del Norte" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>NIT</Label>
              <Input placeholder="900.123.456-7" value={form.nit} onChange={e => setForm({ ...form, nit: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Dirección</Label>
              <Input placeholder="Calle 100 #15-20" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Número de Quirófanos</Label>
              <Input type="number" min="1" max="50" placeholder="4" value={form.num_operating_rooms} onChange={e => setForm({ ...form, num_operating_rooms: e.target.value })} required />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Crear Clínica
              </Button>
            </div>
          </form>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="grid grid-cols-[1fr_auto_1fr_auto_auto_auto] gap-4 border-b bg-muted/50 px-5 py-3 text-xs font-medium text-muted-foreground">
            <span>Nombre</span>
            <span>NIT</span>
            <span>Dirección</span>
            <span>Quirófanos</span>
            <span>Fecha</span>
            <span>Acciones</span>
          </div>
          {clinics.length === 0 ? (
            <div className="px-5 py-8 text-center text-muted-foreground">No hay clínicas registradas.</div>
          ) : clinics.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-b last:border-0">
              {editingId === c.id ? (
                <div className="px-5 py-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <Label className="text-xs">Nombre</Label>
                      <Input className="mt-1" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">NIT</Label>
                      <Input className="mt-1" value={editForm.nit} onChange={e => setEditForm({ ...editForm, nit: e.target.value })} />
                    </div>
                     <div>
                      <Label className="text-xs">Dirección</Label>
                      <Input className="mt-1" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
                    </div>
                     <div>
                      <Label className="text-xs">Quirófanos</Label>
                      <Input className="mt-1" type="number" min="1" max="50" value={editForm.num_operating_rooms} onChange={e => setEditForm({ ...editForm, num_operating_rooms: e.target.value })} />
                    </div>
                   </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleUpdate} disabled={savingEdit} className="gap-1.5">
                      {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Guardar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="gap-1.5">
                      <X className="h-3.5 w-3.5" /> Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-[1fr_auto_1fr_auto_auto_auto] items-center gap-4 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{c.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{c.nit}</span>
                  <span className="text-sm text-muted-foreground">{c.address}</span>
                  <span className="text-sm text-muted-foreground text-center">{(c as any).num_operating_rooms || 4}</span>
                  <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString('es-ES')}</span>
                  <div className="flex gap-1.5">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(c)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar "{c.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>Se eliminarán todos los datos asociados a esta clínica.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(c.id)} disabled={deletingId === c.id}>
                            {deletingId === c.id ? 'Eliminando...' : 'Eliminar'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </Layout>
  );
}
