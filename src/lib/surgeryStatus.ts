export const statusConfig: Record<string, { label: string; color: string }> = {
  programada: { label: 'Programada', color: 'bg-blue-100 text-blue-700' },
  'sign-in': { label: 'Sign In', color: 'bg-amber-100 text-amber-700' },
  'time-out': { label: 'Time Out', color: 'bg-orange-100 text-orange-700' },
  'sign-out': { label: 'Sign Out', color: 'bg-purple-100 text-purple-700' },
  completada: { label: 'Completada', color: 'bg-emerald-100 text-emerald-700' },
};

export function getStatusConfig(status: string) {
  return statusConfig[status] || statusConfig.programada;
}
