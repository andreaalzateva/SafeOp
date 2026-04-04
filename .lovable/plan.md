

# Plan: Migrar SafeOp a Lovable Cloud

Migrar toda la aplicación de datos mock y autenticación local a Lovable Cloud (base de datos real + autenticación).

## Resumen para el usuario

Se reemplazará el sistema actual de usuarios falsos y datos de prueba por uno real. Esto significa:
- Login y registro con email/contraseña reales
- Las cirugías se guardan en la base de datos
- Los checklists, instrumentos y firmas se persisten
- Cada usuario tendrá su rol asignado en la base de datos

## Pasos técnicos

### 1. Reescribir `authContext.tsx` — Autenticación real
- Reemplazar mock login por `supabase.auth.signInWithPassword()`
- Agregar `signUp()` con asignación de rol en `user_roles`
- Usar `onAuthStateChange` para mantener sesión
- Cargar perfil y rol desde `profiles` + `user_roles` al iniciar sesión
- Agregar `resetPasswordForEmail()` para recuperación de contraseña
- Exportar tipo `User` actualizado (sin password, con datos de Supabase)

### 2. Reescribir `Login.tsx` — Formulario real
- Agregar opción de registro (sign up) además de login
- Conectar "Olvidé contraseña" a `resetPasswordForEmail()`
- Mantener flujo de selección de rol → credenciales
- En registro: guardar rol seleccionado en `user_roles`

### 3. Crear página `/reset-password` 
- Formulario para nueva contraseña
- Verificar token `type=recovery` en URL
- Llamar `supabase.auth.updateUser({ password })`
- Agregar ruta pública en `App.tsx`

### 4. Reescribir `Dashboard.tsx` — Datos reales
- Reemplazar `mockSurgeries` por query a tabla `surgeries`
- Usar `useQuery` de React Query para fetch con loading/error states
- Mantener filtrado por rol (coordinador ve todo, encargado ve las suyas)

### 5. Reescribir `NewSurgery.tsx` — Insert real
- `handleSubmit` hace `supabase.from('surgeries').insert()`
- Asigna `created_by` al usuario autenticado
- Mantener listas de cirujanos/anestesiólogos como datos estáticos (no cambian)

### 6. Reescribir `Checklist.tsx` — Persistencia completa
- Al avanzar cada fase: insertar `checklist_phases` y `checklist_answers`
- Instrumentos: insertar en tabla `instruments` al completar Time Out
- Sign Out: actualizar `final_count` en `instruments`
- Firma: insertar en `checklist_signatures`
- Actualizar `surgeries.status` en cada transición
- Cargar estado existente si la cirugía ya tiene fases completadas

### 7. Reescribir `History.tsx` — Query real
- Fetch de `surgeries` ordenadas por fecha

### 8. Reescribir `SurgeryDetail.tsx` — Datos reales
- Cargar cirugía, fases, respuestas, instrumentos y firma desde las tablas
- Reemplazar `checklistData` mock por queries relacionales

### 9. Actualizar `Layout.tsx`
- Adaptar `user` al nuevo tipo (perfil + rol de Supabase)
- `logout` usa `supabase.auth.signOut()`

### 10. Actualizar `ProtectedRoute` en `App.tsx`
- Verificar sesión de Supabase en lugar de estado mock
- Manejar estado de carga mientras se verifica la sesión

### 11. Habilitar auto-confirm de emails (para desarrollo)
- Usar `cloud--configure_auth` para activar auto-confirm, facilitando pruebas sin verificar email

### 12. Limpiar `mockData.ts`
- Eliminar `mockUsers`, `mockSurgeries` y tipos que ya no se usen
- Mantener listas estáticas (`surgeonsList`, `anesthesiologistsList`, `commonInstruments`, preguntas del checklist)

## Archivos afectados
- `src/lib/authContext.tsx` — reescritura completa
- `src/pages/Login.tsx` — agregar registro + conectar a auth real
- `src/pages/ResetPassword.tsx` — nuevo
- `src/pages/Dashboard.tsx` — queries reales
- `src/pages/NewSurgery.tsx` — insert real
- `src/pages/Checklist.tsx` — persistencia en DB
- `src/pages/History.tsx` — query real
- `src/pages/SurgeryDetail.tsx` — queries relacionales
- `src/components/Layout.tsx` — adaptar al nuevo user
- `src/App.tsx` — nueva ruta, ProtectedRoute actualizado
- `src/lib/mockData.ts` — limpieza

