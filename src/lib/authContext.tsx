import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';

export type UserRole = 'supervisor' | 'coordinador' | 'encargado' | 'consulta';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  clinicId: string | null;
  clinicName: string | null;
  isSuperAdmin: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function loadAppUser(userId: string): Promise<AppUser | null> {
  const [profileRes, roleRes] = await Promise.all([
    supabase.from('profiles').select('name, email, clinic_id, is_super_admin').eq('id', userId).single(),
    supabase.from('user_roles').select('role').eq('user_id', userId).single(),
  ]);

  if (profileRes.error || roleRes.error || !profileRes.data || !roleRes.data) {
    console.error('loadAppUser failed:', { profileErr: profileRes.error, roleErr: roleRes.error });
    return null;
  }

  let clinicName: string | null = null;
  const clinicId = (profileRes.data as any).clinic_id;
  if (clinicId) {
    const { data: clinic } = await supabase.from('clinics').select('name').eq('id', clinicId).single();
    clinicName = clinic?.name || null;
  }

  return {
    id: userId,
    name: profileRes.data.name,
    email: profileRes.data.email,
    role: roleRes.data.role as UserRole,
    clinicId,
    clinicName,
    isSuperAdmin: (profileRes.data as any).is_super_admin || false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }

    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        const appUser = await loadAppUser(session.user.id);
        if (mounted) setUser(appUser);
      }
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT') { setUser(null); setLoading(false); return; }
      if (event === 'TOKEN_REFRESHED' && session?.user) {
        const appUser = await loadAppUser(session.user.id);
        if (mounted && appUser) setUser(appUser);
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const login = async (email: string, password: string, role: UserRole): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured) return { success: false, error: 'Backend no configurado. Conecta Supabase para habilitar la autenticación.' };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: 'Correo o contraseña incorrectos.' };

    const { data: roleRow, error: roleErr } = await supabase
      .from('user_roles').select('role').eq('user_id', data.user.id).single();

    if (roleErr || !roleRow || roleRow.role !== role) {
      await supabase.auth.signOut();
      return { success: false, error: 'El rol seleccionado no corresponde a este usuario.' };
    }

    const appUser = await loadAppUser(data.user.id);
    if (appUser) { setUser(appUser); return { success: true }; }
    return { success: false, error: 'Error al cargar perfil de usuario.' };
  };

  const signUp = async (email: string, password: string, name: string, role: UserRole): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) return { success: false, error: error.message };
    if (!data.user) return { success: false, error: 'No se pudo crear el usuario.' };

    const { error: roleError } = await supabase.rpc('assign_user_role', { _user_id: data.user.id, _role: role });
    if (roleError) return { success: false, error: 'Error al asignar el rol: ' + roleError.message };

    const appUser = await loadAppUser(data.user.id);
    if (appUser) { setUser(appUser); return { success: true }; }
    return { success: false, error: 'Error al cargar perfil de usuario.' };
  };

  const logout = async () => { await supabase.auth.signOut(); setUser(null); };

  return (
    <AuthContext.Provider value={{ user, loading, login, signUp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
