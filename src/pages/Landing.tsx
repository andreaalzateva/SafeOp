import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ClipboardCheck, AlertTriangle, BarChart3, Users, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/authContext';

const features = [
  { icon: ClipboardCheck, title: 'Checklist Digital', desc: 'Los 3 momentos críticos de la OMS: Sign In, Time Out, Sign Out. Ningún paso se puede omitir.' },
  { icon: Lock, title: 'Bloqueo Inteligente', desc: 'Si algo falla, el sistema bloquea el avance. No se puede continuar sin resolver.' },
  { icon: Users, title: 'Firma Digital', desc: 'Quién confirmó qué y a qué hora. Trazabilidad completa por cada cirugía.' },
  { icon: BarChart3, title: 'Dashboard y Reportes', desc: 'Cumplimiento por sala, por cirujano. Datos reales para auditorías.' },
  { icon: AlertTriangle, title: 'Alertas en Tiempo Real', desc: 'Notificación inmediata al coordinador si un conteo no cuadra.' },
  { icon: Shield, title: 'Protección Legal', desc: 'Genera reportes de trazabilidad para proteger a la institución y al equipo.' },
];

const comparison = [
  { paper: 'Cualquiera puede saltarse pasos', safeop: 'Cada paso requiere confirmación específica' },
  { paper: 'Se pierde o archiva sin leer', safeop: 'Historial digital permanente por cirugía' },
  { paper: 'Sin auditoría posible', safeop: 'Dashboard con % de cumplimiento' },
  { paper: 'Si falta algo, nadie sabe', safeop: 'Alerta en tiempo real si el equipo intenta avanzar' },
  { paper: 'Un check sin nombre ni hora', safeop: 'Firma digital de quién confirmó cada paso y cuándo' },
];

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      const dest = user.role === 'supervisor' ? '/admin/usuarios' : '/dashboard';
      navigate(dest, { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 z-50 w-full border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">SafeOp</span>
          </div>
          <Button onClick={() => navigate('/login')} className="gap-2">
            Ingresar <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" />
              Plataforma de Seguridad Quirúrgica
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 max-w-4xl text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl"
          >
            Cada cirugía merece un{' '}
            <span className="text-primary">checklist que salve vidas</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 max-w-2xl text-lg text-muted-foreground"
          >
            SafeOp digitaliza el protocolo de seguridad quirúrgica de la OMS. 
            Obligatorio, digital y trazable — para que ningún hospital vuelva a decir que no lo sabía.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex gap-4"
          >
            <Button size="lg" onClick={() => navigate('/login')} className="gap-2 px-8">
              Comenzar ahora <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
              Conocer más
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-16 grid grid-cols-3 gap-8 md:gap-16"
          >
            {[
              { value: '7M+', label: 'Pacientes afectados/año' },
              { value: '2008', label: 'Recomendación OMS' },
              { value: '47%', label: 'Reducción de complicaciones' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-primary md:text-4xl">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t bg-card py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground">¿Por qué SafeOp?</h2>
            <p className="mt-3 text-muted-foreground">Como la aviación, pero para cirugías. El copiloto lee, el piloto responde, el sistema registra.</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-xl border bg-background p-6"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="border-t py-20">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-center text-3xl font-bold text-foreground">SafeOp vs. Papel Tradicional</h2>
          <div className="mt-12 overflow-hidden rounded-xl border">
            <div className="grid grid-cols-2 bg-muted">
              <div className="border-r p-4 text-center text-sm font-semibold text-destructive">📋 Papel Tradicional</div>
              <div className="p-4 text-center text-sm font-semibold text-primary">🛡️ SafeOp</div>
            </div>
            {comparison.map((row, i) => (
              <div key={i} className="grid grid-cols-2 border-t">
                <div className="border-r p-4 text-sm text-muted-foreground">{row.paper}</div>
                <div className="flex items-start gap-2 p-4 text-sm text-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  {row.safeop}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-primary py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground">
            Protege a tus pacientes y a tu equipo
          </h2>
          <p className="mt-4 text-primary-foreground/80">
            Un instrumento olvidado genera demandas de $50,000 a $500,000 USD. SafeOp cuesta mucho menos que esto.
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate('/login')}
            className="mt-8 gap-2 px-8"
          >
            Probar SafeOp <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">SafeOp</span>
          </div>
          <p className="text-sm text-muted-foreground">Hackathon MVP — Seguridad quirúrgica digital</p>
        </div>
      </footer>
    </div>
  );
}
