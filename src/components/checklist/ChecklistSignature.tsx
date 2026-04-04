import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Clock, User, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface Props {
  userName: string;
  userRole: string;
  startTime: string;
  endTime: string;
  onAccept: () => void;
}

const roleLabels: Record<string, string> = {
  coordinador: 'Coordinador / Admin',
  encargado: 'Encargado del Checklist',
  consulta: 'Acceso de Consulta',
};

export default function ChecklistSignature({ userName, userRole, startTime, endTime, onAccept }: Props) {
  const [accepted, setAccepted] = useState(false);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Firma Electrónica</h3>
            <p className="text-sm text-muted-foreground">Certificación de cumplimiento del checklist quirúrgico</p>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border bg-background p-5">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Responsable</p>
              <p className="text-sm font-semibold text-foreground">{userName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Rol</p>
              <p className="text-sm font-semibold text-foreground">{roleLabels[userRole] || userRole}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Hora de inicio</p>
              <p className="text-sm font-semibold text-foreground">{startTime}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Hora de finalización</p>
              <p className="text-sm font-semibold text-foreground">{endTime}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
          <Checkbox
            id="accept"
            checked={accepted}
            onCheckedChange={(v) => setAccepted(v === true)}
            className="mt-0.5"
          />
          <label htmlFor="accept" className="text-sm text-foreground cursor-pointer">
            Certifico que he completado todas las verificaciones del checklist de seguridad quirúrgica de la OMS de manera fiel y precisa, y acepto la responsabilidad del registro.
          </label>
        </div>

        <Button
          onClick={onAccept}
          disabled={!accepted}
          className="mt-6 w-full gap-2"
          size="lg"
        >
          <CheckCircle2 className="h-5 w-5" />
          Firmar y Completar Cirugía
        </Button>
      </div>
    </motion.div>
  );
}
