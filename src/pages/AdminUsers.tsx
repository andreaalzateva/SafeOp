import { useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { UserPlus, Users, Mail, Lock, User, Shield, Loader2, Eye, EyeOff, Pencil, Trash2, Save, X } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const roleLabels: Record<string, string> = {
  supervisor: 'Supervisor',
  coordinador: 'Coordinador',
  encargado: 'Encargado del Checklist',
  consulta: 'Acceso de Consulta',
};

export default function AdminUsers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '', role: '', specialty: '', clinicId: '' });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: '', specialty: '', clinicId: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load clinics for super admin
  const { data: clinics = [] } = useQuery({
    queryKey: ['clinics'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clinics').select('*').order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user?.isSuperAdmin,
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, name, email, created_at, specialty, clinic_id, is_super_admin');
      if (pErr) throw pErr;
      const { data: roles, error: rErr } = await supabase.from('user_roles').select('user_id, role');
      if (rErr) throw rErr;

      // Load clinics for name mapping
      const { data: allClinics } = await supabase.from('clinics').select('id, name');
      const clinicMap = new Map((allClinics || []).map(c => [c.id, c.name]));

      let result = profiles.map((p) => {
        const roleRow = roles.find((r) => r.user_id === p.id);
        return { ...p, role: roleRow?.role || 'sin rol', clinicName: p.clinic_id ? clinicMap.get(p.clinic_id) || '' : '', is_super_admin: (p as any).is_super_admin || false };
      });

      // If not super admin, only show users from same clinic
      if (!user?.isSuperAdmin && user?.clinicId) {
        result = result.filter(u => (u as any).clinic_id === user.clinicId);
      }

      return result;
    },
  });

  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.role) { toast.error('Selecciona un rol'); return; }
    if (form.role === 'consulta' && !form.specialty) { toast.error('Selecciona una especialidad'); return; }
    if (user?.isSuperAdmin && !form.clinicId) { toast.error('Selecciona una clínica'); return; }
    setSubmitting(true);

    const token = await getToken();
    const body: Record<string, string | undefined> = {
      email: form.email,
      password: form.password,
      name: form.name,
      role: form.role,
      specialty: form.role === 'consulta' ? form.specialty : undefined,
    };
    if (user?.isSuperAdmin && form.clinicId) {
      body.clinicId = form.clinicId;
    }

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });

    const result = await res.json();
    if (result.success) {
      toast.success(`Usuario ${form.name} creado exitosamente`);
      setForm({ email: '', password: '', name: '', role: '', specialty: '', clinicId: '' });
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } else {
      toast.error(result.error || 'Error al crear usuario');
    }
    setSubmitting(false);
  };

  const startEdit = (u: typeof users[0]) => {
    setEditingId(u.id);
    setEditForm({ name: u.name, role: u.role, specialty: u.specialty || '', clinicId: (u as any).clinic_id || '' });
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    setSavingEdit(true);
    const token = await getToken();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user?action=update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        userId: editingId,
        name: editForm.name,
        role: editForm.role,
        specialty: editForm.role === 'consulta' ? editForm.specialty : undefined,
        clinicId: editForm.clinicId || undefined,
      }),
    });
    const result = await res.json();
    if (result.success) {
      toast.success('Usuario actualizado');
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } else {
      toast.error(result.error || 'Error al actualizar');
    }
    setSavingEdit(false);
  };

  const handleDelete = async (userId: string) => {
    setDeletingId(userId);
    const token = await getToken();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user?action=delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId }),
    });
    const result = await res.json();
    if (result.success) {
      toast.success('Usuario eliminado');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } else {
      toast.error(result.error || 'Error al eliminar');
    }
    setDeletingId(null);
  };

  if (user?.role !== 'supervisor') {
    return <Layout><p className="text-destructive font-medium">No tienes permisos para ver esta página.</p></Layout>;
  }

  // Available roles depend on super admin status
  const availableRoles = user?.isSuperAdmin
    ? ['supervisor', 'coordinador', 'encargado', 'consulta']
    : ['coordinador', 'encargado', 'consulta'];

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestión de Usuarios</h1>
          <p className="text-sm text-muted-foreground">Crea y administra los usuarios del sistema</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <UserPlus className="h-4 w-4" /> Nuevo Usuario
        </Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <form onSubmit={handleCreate} className="rounded-xl border bg-card p-6 space-y-4 max-w-lg">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" /> Crear nuevo usuario
            </h2>

            <div className="space-y-1.5">
              <Label>Nombre completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Dr. Juan Pérez" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="pl-10" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="email" placeholder="usuario@hospital.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="pl-10" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type={showPassword ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="pl-10 pr-10" required minLength={6} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v, specialty: '', clinicId: '' })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar rol" /></SelectTrigger>
                <SelectContent>
                  {availableRoles.map(r => (
                    <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {user?.isSuperAdmin && (
              <div className="space-y-1.5">
                <Label>Clínica</Label>
                <Select value={form.clinicId} onValueChange={(v) => setForm({ ...form, clinicId: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar clínica" /></SelectTrigger>
                  <SelectContent>
                    {clinics.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.role === 'consulta' && (
              <div className="space-y-1.5">
                <Label>Especialidad</Label>
                <Select value={form.specialty} onValueChange={(v) => setForm({ ...form, specialty: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar especialidad" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cirujano">Cirujano</SelectItem>
                    <SelectItem value="anestesiologo">Anestesiólogo</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Crear Usuario
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
          <div className={`grid gap-4 border-b bg-muted/50 px-5 py-3 text-xs font-medium text-muted-foreground ${user?.isSuperAdmin ? 'grid-cols-[1fr_1fr_auto_auto_auto_auto]' : 'grid-cols-[1fr_1fr_auto_auto_auto]'}`}>
            <span>Nombre</span>
            <span>Correo</span>
            <span>Rol</span>
            {user?.isSuperAdmin && <span>Clínica</span>}
            <span>Fecha</span>
            <span>Acciones</span>
          </div>
          {users.length === 0 ? (
            <div className="px-5 py-8 text-center text-muted-foreground">No hay usuarios registrados.</div>
          ) : users.map((u, i) => (
            <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-b last:border-0">
              {editingId === u.id ? (
                <div className="px-5 py-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Nombre</Label>
                      <Input className="mt-1" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Rol</Label>
                      <Select value={editForm.role} onValueChange={v => setEditForm({ ...editForm, role: v, specialty: '' })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {availableRoles.map(r => (
                            <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {editForm.role === 'consulta' && (
                      <div>
                        <Label className="text-xs">Especialidad</Label>
                        <Select value={editForm.specialty} onValueChange={v => setEditForm({ ...editForm, specialty: v })}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cirujano">Cirujano</SelectItem>
                            <SelectItem value="anestesiologo">Anestesiólogo</SelectItem>
                            <SelectItem value="otro">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {user?.isSuperAdmin && (
                      <div>
                        <Label className="text-xs">Clínica</Label>
                        <Select value={editForm.clinicId} onValueChange={v => setEditForm({ ...editForm, clinicId: v })}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar clínica" /></SelectTrigger>
                          <SelectContent>
                            {clinics.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
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
                <div className={`grid items-center gap-4 px-5 py-4 ${user?.isSuperAdmin ? 'grid-cols-[1fr_1fr_auto_auto_auto_auto]' : 'grid-cols-[1fr_1fr_auto_auto_auto]'}`}>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{u.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{u.email}</span>
                  <div className="flex flex-col items-start gap-0.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                      u.role === 'supervisor' ? 'bg-destructive/10 text-destructive' : u.role === 'coordinador' ? 'bg-primary/10 text-primary' : u.role === 'encargado' ? 'bg-warning/10 text-warning' : 'bg-accent/10 text-accent-foreground'
                    }`}>
                      <Shield className="h-3 w-3" />
                      {roleLabels[u.role] || u.role}
                    </span>
                    {u.role === 'consulta' && u.specialty && (
                      <span className="text-xs text-muted-foreground capitalize ml-1">{u.specialty === 'anestesiologo' ? 'Anestesiólogo' : u.specialty === 'cirujano' ? 'Cirujano' : 'Otro'}</span>
                    )}
                  </div>
                  {user?.isSuperAdmin && (
                    <span className="text-xs text-muted-foreground">{(u as any).clinicName || '—'}</span>
                  )}
                  <span className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString('es-ES')}</span>
                  <div className="flex gap-1.5">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(u)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {u.id !== user?.id && !(u as any).is_super_admin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar a {u.name}?</AlertDialogTitle>
                            <AlertDialogDescription>Esta acción eliminará permanentemente al usuario.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(u.id)} disabled={deletingId === u.id}>
                              {deletingId === u.id ? 'Eliminando...' : 'Eliminar'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
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
