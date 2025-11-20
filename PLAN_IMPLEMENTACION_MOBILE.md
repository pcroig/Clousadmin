# 🗺️ PLAN DE IMPLEMENTACIÓN - Diseño Mobile Adaptado

**Plan detallado de implementación de diseño mobile nativo para Clousadmin**

---

## ✅ COMPLETADO (Commits realizados)

### 1. **Fundamentos de Arquitectura** ✅
- [x] Hooks de viewport (`use-media-query.ts`, `use-viewport.ts`)
- [x] `ViewportProvider` context global
- [x] `AdaptiveContainer` component
- [x] Sistema de haptic feedback
- [x] Integrado en `app/(dashboard)/layout.tsx`

### 2. **Componentes Mobile Nativos** ✅
- [x] `BottomSheet` (swipe-to-dismiss, safe area, gestures)
- [x] `ResponsiveDialog` (BottomSheet mobile, Dialog desktop)

### 3. **Widgets Refactorizados** ✅
- [x] **FichajeWidget** (PATRÓN DE REFERENCIA)
  - Hook: `useFichaje.ts`
  - Mobile: Layout vertical, 240px, touch 44px
  - Desktop: 2 columnas, anillo SVG, touch 36px
  - Code splitting implementado

### 4. **Optimizaciones WCAG** ✅
- [x] Touch targets 44px mobile
- [x] Botones/Inputs/Select/Textarea responsive
- [x] Imágenes optimizadas (-90%)
- [x] Next.js Image config (AVIF/WebP)

### 5. **Documentación** ✅
- [x] `MOBILE_UX_PRINCIPLES.md` (guía UX completa)
- [x] `ARQUITECTURA_MOBILE_NATIVA.md` (guía implementación)
- [x] `MOBILE_OPTIMIZATION_PLAN.md` (plan optimización)

---

## 📋 PENDIENTE DE IMPLEMENTACIÓN

## FASE 1: DASHBOARDS ADAPTATIVOS (Prioridad ALTA)

### 1.1. **Dashboard Empleado** ⏱️ ~3h

**Objetivo:** Mobile muestra SOLO lo crítico (Fichaje + Ausencias próximas)

**Estructura:**
```
/components/adaptive/EmpleadoDashboard/
  ├── index.tsx                    # Wrapper + code splitting
  ├── Mobile.tsx                   # Solo Fichaje + Ausencias próximas
  └── Desktop.tsx                  # Layout completo actual
```

**Mobile.tsx:**
```tsx
export function EmpleadoDashboardMobile({ ...props }) {
  return (
    <div className="space-y-3 p-4">
      {/* 1. Fichaje Widget - Ya refactorizado */}
      <FichajeWidget href="/empleado/mi-espacio/fichajes" />

      {/* 2. Ausencias Widget - SOLO próximas */}
      <AusenciasWidgetMobile
        proximasAusencias={props.ausenciasProximas}
        onOpenModal={() => setModalAusencia(true)}
      />

      {/* Notificaciones: OCULTO - accesible desde Bottom Nav */}
    </div>
  )
}
```

**Desktop.tsx:**
```tsx
export function EmpleadoDashboardDesktop({ ...props }) {
  return (
    <>
      {/* Header con saludo */}
      <h1>Buenos Días, {props.userName}</h1>

      {/* Grid 3 columnas */}
      <div className="grid grid-cols-3 gap-4">
        <FichajeWidget />
        <NotificacionesWidget maxItems={8} />  {/* Columna 2 filas */}
        <AusenciasWidgetDesktop {...props} />   {/* Completo */}
      </div>
    </>
  )
}
```

**index.tsx:**
```tsx
import dynamic from 'next/dynamic'

const Mobile = dynamic(() => import('./Mobile'), { ssr: false })
const Desktop = dynamic(() => import('./Desktop'), { ssr: false })

export function EmpleadoDashboard(props) {
  return (
    <AdaptiveContainer
      mobile={<Mobile {...props} />}
      desktop={<Desktop {...props} />}
    />
  )
}
```

**Cambios en dashboard-client.tsx:**
```tsx
// Antes: lógica mezclada
return (
  <div className="grid grid-cols-1 md:grid-cols-2">
    {/* CSS responsive */}
  </div>
)

// Después: componente adaptativo
return <EmpleadoDashboard {...props} />
```

---

### 1.2. **AusenciasWidget Refactorizado** ⏱️ ~2h

**Problema actual:** Tiene mobile/desktop pero NO usa patrón adaptativo

**Refactor:**
```
/components/adaptive/AusenciasWidget/
  ├── index.tsx          # Wrapper + code splitting
  ├── Mobile.tsx         # SOLO próximas (sin estadísticas, sin pasadas)
  └── Desktop.tsx        # Vista completa
```

**Mobile.tsx (360px altura, reducido):**
```tsx
export function AusenciasWidgetMobile({
  proximasAusencias,
  onOpenModal,
  onClickAusencia,
}) {
  return (
    <Card className="h-[360px]">
      {/* Header con botón Solicitar */}
      <div className="flex justify-between p-4">
        <h3>Próximas ausencias</h3>
        <Button onClick={onOpenModal} size="sm">
          Solicitar
        </Button>
      </div>

      {/* Lista SOLO próximas (max 5) */}
      <div className="overflow-y-auto p-4">
        {proximasAusencias.slice(0, 5).map(ausencia => (
          <AusenciaItemMobile key={ausencia.id} {...ausencia} />
        ))}
      </div>

      {/* Footer: Ver todas */}
      <div className="p-4 border-t">
        <Link href="/empleado/mi-espacio/ausencias">
          Ver todas
        </Link>
      </div>
    </Card>
  )
}
```

**Desktop.tsx (mantener actual):**
```tsx
export function AusenciasWidgetDesktop({
  diasAcumulados,
  diasDisponibles,
  diasUtilizados,
  proximasAusencias,
  ausenciasPasadas,
  periodo,
  onOpenModal,
}) {
  return (
    <WidgetCard title="Ausencias" href="/empleado/mi-espacio/ausencias">
      {/* Selector periodo */}
      <PeriodoSelector periodo={periodo} />

      {/* Estadísticas (3 columnas) */}
      <div className="grid grid-cols-3 gap-3">
        <Stat value={diasAcumulados} label="Acumulados" />
        <Stat value={diasDisponibles} label="Disponibles" />
        <Stat value={diasUtilizados} label="Utilizados" />
      </div>

      {/* Próximas */}
      <AusenciasList ausencias={proximasAusencias} />

      {/* Pasadas */}
      <AusenciasList ausencias={ausenciasPasadas} pasadas />
    </WidgetCard>
  )
}
```

---

### 1.3. **Dashboard Manager** ⏱️ ~4h

**Mobile:** Prioridad en gestión de equipo

**Orden mobile:**
1. **Solicitudes Widget** (crítico - 480px)
2. **Plantilla Widget** (estado equipo - 240px)
3. **Fichaje Widget** (importante - 240px)
4. ❌ Notificaciones (oculto)
5. ❌ Auto-Completado (oculto)

**Estructura:**
```
/components/adaptive/ManagerDashboard/
  ├── index.tsx
  ├── Mobile.tsx       # Solo Solicitudes + Plantilla + Fichaje
  └── Desktop.tsx      # Layout completo
```

**Mobile.tsx:**
```tsx
export function ManagerDashboardMobile({ ...props }) {
  return (
    <div className="space-y-3 p-4">
      {/* 1. CRÍTICO: Solicitudes (aprob/rechazar) */}
      <SolicitudesWidgetMobile
        solicitudes={props.solicitudes.slice(0, 5)}  // Max 5
      />

      {/* 2. CRÍTICO: Estado del equipo */}
      <PlantillaWidgetMobile
        trabajando={props.trabajando}
        ausentes={props.ausentes}
        sinFichar={props.sinFichar}
      />

      {/* 3. IMPORTANTE: Fichaje propio */}
      <FichajeWidget />
    </div>
  )
}
```

---

### 1.4. **Dashboard HR Admin** ⏱️ ~6h

**TOTALMENTE DIFERENTE en mobile (como dijiste)**

**Mobile:** KPIs + Alertas críticas

```
/components/adaptive/HRAdminDashboard/
  ├── index.tsx
  ├── Mobile.tsx       # KPIs + Top 3 solicitudes
  └── Desktop.tsx      # Layout 4 columnas
```

**Mobile.tsx (NUEVO diseño):**
```tsx
export function HRAdminDashboardMobile({ ...props }) {
  return (
    <div className="space-y-3 p-4">
      {/* 1. KPIs Críticos (NUEVO Widget) */}
      <KPIsWidget>
        <KPIStat
          value={props.empleadosActivos}
          total={props.empleadosTotales}
          label="Empleados activos hoy"
          variant="success"
        />
        <KPIStat
          value={props.solicitudesPendientes}
          label="Solicitudes pendientes"
          variant="warning"
          link="/hr/bandeja-entrada"
        />
        <KPIStat
          value={props.fichajesIncidencias}
          label="Fichajes con incidencias"
          variant="error"
          link="/hr/horario/fichajes"
        />
        <KPIStat
          value={props.contratosVencer}
          label="Contratos por vencer (30d)"
          variant="info"
          link="/hr/contratos"
        />
      </KPIsWidget>

      {/* 2. Top 3 Solicitudes urgentes */}
      <SolicitudesWidgetMobile
        solicitudes={props.solicitudes.slice(0, 3)}
        showUrgentOnly
      />

      {/* 3. Plantilla Global (compacta) */}
      <PlantillaWidgetMobile
        showAvatars={false}  // Solo números
        {...props.plantilla}
      />

      {/* FAB: Búsqueda rápida empleado */}
      <FAB icon={<Search />} onClick={openSearchModal} />
    </div>
  )
}
```

**Desktop.tsx (layout 4 columnas):**
```tsx
export function HRAdminDashboardDesktop({ ...props }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {/* Col 1 */}
      <KPIsWidget />
      <FichajesIncidenciasWidget />

      {/* Col 2 (span 2 filas) */}
      <SolicitudesWidget />

      {/* Col 3 */}
      <PlantillaWidget />
      <AutoCompletadoWidget />

      {/* Col 4 */}
      <AlertasSistemaWidget />
      <ProximosEventosWidget />
    </div>
  )
}
```

---

## FASE 2: WIDGETS ADAPTATIVOS (Prioridad MEDIA)

### 2.1. **NotificacionesWidget** ⏱️ ~2h
- Mobile: Oculto (acceso desde Bandeja Entrada)
- Desktop: Mantener actual

### 2.2. **SolicitudesWidget** ⏱️ ~3h
- Mobile: Max 5 items, botones grandes
- Desktop: Mantener actual

### 2.3. **PlantillaWidget** ⏱️ ~2h
- Mobile: Sin avatares, solo números + enlaces
- Desktop: Con avatares (actual)

---

## FASE 3: MODALES ADAPTATIVOS (Prioridad MEDIA)

### 3.1. **solicitar-ausencia-modal** ⏱️ ~1h
```tsx
// Antes
<Dialog>...</Dialog>

// Después
<ResponsiveDialog
  title="Solicitar Ausencia"
  footer={<>
    <Button variant="outline">Cancelar</Button>
    <Button>Solicitar</Button>
  </>}
>
  <AusenciaForm />
</ResponsiveDialog>
```

### 3.2. **fichaje-manual-modal** ⏱️ ~1h
```tsx
<ResponsiveDialog title="Fichaje Manual">
  <FichajeManualForm />
</ResponsiveDialog>
```

### 3.3. **preferencias-vacaciones-modal** ⏱️ ~1h
```tsx
<ResponsiveDialog title="Preferencias Vacaciones">
  <PreferenciasForm />
</ResponsiveDialog>
```

---

## FASE 4: PWA COMPLETO (Prioridad ALTA)

### 4.1. **Service Worker** ⏱️ ~3h
- Configurar next-pwa (ya instalado)
- Estrategias de caché
- Offline fallback
- Background sync

### 4.2. **Manifest completo** ⏱️ ~1h
- Icons generados (script listo)
- Shortcuts a acciones
- Screenshots

### 4.3. **Install Prompt** ⏱️ ~2h
- Componente `PWAInstallPrompt`
- Lógica beforeinstallprompt
- Preferencias usuario

---

## FASE 5: FEATURES UX MOBILE (Prioridad BAJA)

### 5.1. **Pull-to-Refresh** ⏱️ ~3h
- Hook `usePullToRefresh`
- Componente `PullToRefresh`
- Integrar en listas (fichajes, ausencias)

### 5.2. **Swipe Gestures** ⏱️ ~4h
- Componente `SwipeableItem`
- Acciones swipe en listas
- Haptic feedback integrado

### 5.3. **Skeleton Loaders Optimizados** ⏱️ ~2h
- Skeletons por widget
- Performance optimizado

---

## 📊 ESTIMACIÓN TOTAL

| Fase | Tiempo | Prioridad |
|------|--------|-----------|
| Fase 1: Dashboards | ~15h | ⭐⭐⭐ ALTA |
| Fase 2: Widgets | ~7h | ⭐⭐ MEDIA |
| Fase 3: Modales | ~3h | ⭐⭐ MEDIA |
| Fase 4: PWA | ~6h | ⭐⭐⭐ ALTA |
| Fase 5: Features UX | ~9h | ⭐ BAJA |
| **TOTAL** | **~40h** | (~1 semana) |

---

## 🚀 QUICK WINS (Empezar por aquí)

**Implementación rápida y alto impacto:**

1. **EmpleadoDashboard Mobile** (~3h) ← Empezar aquí
   - Mobile: Solo Fichaje + Ausencias próximas
   - Mayor impacto (usuarios más frecuentes)

2. **Migrar modales a ResponsiveDialog** (~3h)
   - Mejor UX mobile inmediata
   - Implementación simple

3. **PWA básico** (~4h)
   - Instalable como app
   - Gran valor percibido

**Total Quick Wins: ~10h** (1-2 días)

---

## 📝 CHECKLIST POR COMPONENTE

Al refactorizar cada componente, verificar:

**Arquitectura:**
- [ ] Hook separado con lógica (`use[Component].ts`)
- [ ] Mobile.tsx con UX nativa
- [ ] Desktop.tsx mantiene funcionalidad completa
- [ ] index.tsx con code splitting
- [ ] Usa `AdaptiveContainer`

**Mobile UX:**
- [ ] Touch targets ≥ 44px
- [ ] Spacing ≥ 8px entre elementos
- [ ] Solo info crítica visible
- [ ] Acciones principales destacadas
- [ ] Altura optimizada (scroll mínimo)

**Performance:**
- [ ] Code splitting implementado
- [ ] Bundle mobile verificado
- [ ] Lazy loading de imágenes
- [ ] Animaciones ≤ 300ms

**Testing:**
- [ ] Hook testeado separado
- [ ] Mobile UI testeado
- [ ] Desktop UI testeado
- [ ] Responsive verificado (375px, 390px, 768px, 1024px)

---

## 🎯 ORDEN RECOMENDADO DE IMPLEMENTACIÓN

### Semana 1:
**Día 1-2:** EmpleadoDashboard + AusenciasWidget refactor
**Día 3:** Migrar modales a ResponsiveDialog
**Día 4-5:** ManagerDashboard refactor

### Semana 2:
**Día 1-2:** HR Admin Dashboard (diseño nuevo)
**Día 3-4:** PWA completo
**Día 5:** Testing y ajustes

---

## 💡 TIPS DE IMPLEMENTACIÓN

### 1. **Copiar patrón de FichajeWidget**

```bash
# Para crear nuevo widget adaptativo
cp -r components/adaptive/FichajeWidget components/adaptive/MiWidget
# Luego renombrar y adaptar lógica
```

### 2. **Testing rápido de breakpoints**

```bash
# En DevTools
# Mobile: 375px (iPhone SE)
# Mobile Large: 390px (iPhone 14)
# Tablet: 768px (iPad)
# Desktop: 1024px
```

### 3. **Verificar bundle size**

```bash
npm run build
# Revisar .next/analyze/ si bundle analyzer está configurado
```

---

## 📚 DOCUMENTOS DE REFERENCIA

- `docs/MOBILE_UX_PRINCIPLES.md` - Decisiones de UX
- `docs/ARQUITECTURA_MOBILE_NATIVA.md` - Guía de implementación
- `components/adaptive/FichajeWidget/` - Patrón de referencia
- `components/mobile/BottomSheet.tsx` - Componente mobile nativo
- `components/adaptive/ResponsiveDialog.tsx` - Modal adaptativo

---

**Última actualización:** 18 Noviembre 2025
**Próxima revisión:** Después de implementar Fase 1
