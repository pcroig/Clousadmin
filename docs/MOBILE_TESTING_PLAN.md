# Plan de Testing Mobile - Clousadmin

**Versión**: 1.0.0  
**Fecha**: 2025-01-21  
**Estado**: Pendiente de Ejecución

---

## 📋 Resumen

Documento guía para realizar testing exhaustivo de la implementación mobile de Clousadmin en dispositivos reales iOS y Android.

**Estado actual**: Adaptación mobile completada al 93.75% (15/16 tareas). Testing en dispositivos reales es la última tarea crítica pendiente.

---

## 🎯 Objetivos del Testing

1. ✅ Verificar que todas las páginas son **completamente funcionales** en mobile
2. ✅ Confirmar que los **touch targets** cumplen con WCAG 2.1 (mínimo 44px)
3. ✅ Validar el **rendimiento** en dispositivos de gama baja y media
4. ✅ Identificar **edge cases** y problemas de usabilidad
5. ✅ Verificar **compatibilidad** entre navegadores mobile (Safari iOS, Chrome Android)

---

## 📱 Dispositivos Objetivo

### Prioridad Alta (Críticos)
- **iPhone 12/13/14** (iOS 15+) - Safari
- **Samsung Galaxy S21/S22** (Android 12+) - Chrome
- **iPhone SE (3rd gen)** - Pantalla pequeña crítica (375px)

### Prioridad Media
- **iPad Air/Pro** (Tablet) - Safari
- **Samsung Galaxy Tab** (Tablet) - Chrome
- **Google Pixel 6/7** - Chrome

### Prioridad Baja (Opcional)
- Dispositivos Android de gama baja
- Navegadores alternativos (Firefox, Edge mobile)

---

## 🧪 Checklist de Testing por Módulo

### 1. Dashboards

#### HR Dashboard (`/hr/dashboard`)
- [ ] FichajeBarMobile se muestra correctamente y es funcional
- [ ] PlantillaWidget modo compacto muestra 3 items (Trabajando, Ausentes, Sin fichar)
- [ ] Header "Buenos días" solo aparece en desktop (>=640px)
- [ ] Navegación a páginas de detalle funciona
- [ ] Widgets son touch-friendly (botones >=44px)

#### Manager Dashboard (`/manager/dashboard`)
- [ ] Mismo layout que HR dashboard
- [ ] Todos los widgets funcionan correctamente

#### Empleado Dashboard (`/empleado/dashboard`)
- [ ] Widgets optimizados se muestran correctamente
- [ ] Navegación rápida funcional

---

### 2. Horario (Fichajes y Ausencias)

#### Fichajes (`/hr/horario/fichajes`, `/manager/horario/fichajes`)
- [ ] **Mobile Header** compacto se muestra correctamente
- [ ] **Botón de filtros** abre Sheet desde bottom
- [ ] **Sheet de filtros** incluye todos los controles (búsqueda, estado, rango fechas)
- [ ] **Cards de jornadas** en mobile son legibles y clickeables
- [ ] **DataTable en desktop** muestra todas las columnas correctamente
- [ ] **Scroll horizontal** funciona en mobile cuando hay muchas columnas
- [ ] **Primera columna** (empleado) es sticky en mobile
- [ ] Navegación de fechas funciona (día/semana/mes)
- [ ] Modal de edición de fichaje se abre correctamente

#### Ausencias (`/hr/horario/ausencias`, `/manager/horario/ausencias`)
- [ ] Filtros en sheet funcionan (búsqueda, estado)
- [ ] Cards mobile muestran info completa (empleado, fechas, estado, balance)
- [ ] DataTable desktop responsive
- [ ] Modal de solicitar ausencia es full-screen en mobile
- [ ] DatePickers en modal funcionan con touch
- [ ] Botón "Crear Campaña" funcional

---

### 3. Organización

#### Personas (`/hr/organizacion/personas`)
- [ ] Header mobile compacto con botón de búsqueda
- [ ] Input de búsqueda funcional
- [ ] DataTable responsive con scroll horizontal
- [ ] Avatar + nombre visible en primera columna (sticky)
- [ ] Botones de acción (Añadir Persona, Denuncias, Onboarding) accesibles
- [ ] Click en row abre detalles

#### Equipos (`/hr/organizacion/equipos`)
- [ ] Mismo patrón que Personas
- [ ] DataTable muestra nombre, responsable, sede, miembros

#### Puestos (`/hr/organizacion/puestos`)
- [ ] DataTable con nombre, empleados, documentos
- [ ] Navegación funcional

---

### 4. Documentos y Nóminas

#### Documentos (`/hr/documentos`)
- [ ] Header mobile con título y botón "Crear"
- [ ] Tabs horizontales (Documentos/Plantillas) en grid 2 columnas
- [ ] Grid de carpetas funciona en mobile y desktop
- [ ] Modal de crear carpeta funcional
- [ ] Navegación a carpetas individuales funciona

#### Payroll (`/hr/payroll`)
- [ ] Header mobile con contador de eventos
- [ ] Cards de eventos son legibles
- [ ] Stepper de workflow visible
- [ ] Botones de acciones compactos y funcionales
- [ ] Modales de compensar horas, validar complementos funcionan
- [ ] Upload de nóminas funcional

---

### 5. Mi Espacio (Empleado)

#### Datos (`/empleado/mi-espacio/datos`)
- [ ] ProfileAvatar con foto se muestra correctamente
- [ ] Botones "Guardar" y "Denuncias" compactos
- [ ] Formularios de datos personales touch-friendly
- [ ] Inputs tienen touch targets >=44px

#### Horario (`/empleado/mi-espacio/horario`)
- [ ] Grid de balance (2 columnas en mobile, 4 en desktop)
- [ ] Tabs de Fichajes/Ausencias en grid 2 columnas
- [ ] Cards de fichajes legibles
- [ ] Botones de acción fullwidth en mobile

---

### 6. Modales y Formularios

#### SolicitarAusenciaModal
- [ ] Full-screen en mobile (<640px)
- [ ] Header sticky funcional
- [ ] DatePickers responsive (sheet en mobile)
- [ ] Botón "Solicitar" fullwidth en mobile
- [ ] Footer sticky con botones

#### Crear Campaña Ausencias
- [ ] Full-screen en mobile
- [ ] SearchableMultiSelect abre sheet
- [ ] DatePickers responsive
- [ ] Checkboxes con touch targets adecuados

#### SearchableSelect / MultiSelect
- [ ] Abre Sheet en mobile (bottom)
- [ ] Input de búsqueda funcional
- [ ] Items de lista tienen touch targets >=44px
- [ ] Footer con botón "Confirmar" en MultiSelect
- [ ] Cierra al seleccionar (SearchableSelect)

#### ResponsiveDatePicker
- [ ] Abre Sheet en mobile
- [ ] Botones de día tienen 44x44px
- [ ] Navegación entre meses funcional
- [ ] Botones "Cancelar" y "Limpiar" en footer

---

## 🔍 Tests de Usabilidad

### Interacciones Touch
- [ ] **Tap**: Todos los elementos clickeables responden al primer tap
- [ ] **Long press**: No se activa accidentalmente en listas
- [ ] **Swipe**: No interfiere con scroll vertical/horizontal
- [ ] **Pinch-to-zoom**: Deshabilitado correctamente en inputs (evita zoom accidental)
- [ ] **Double tap**: No causa zoom inesperado

### Navegación
- [ ] Breadcrumbs o botón "Volver" en todas las páginas de detalle
- [ ] Navegación entre tabs fluida
- [ ] Bottom navigation visible y accesible
- [ ] Links y botones fáciles de distinguir

### Formularios
- [ ] Teclado mobile apropiado según tipo de input (email, number, text)
- [ ] Labels visibles cuando input está focused
- [ ] Botón "Submit" accesible sin scroll
- [ ] Mensajes de error visibles y legibles

---

## ⚡ Tests de Performance

### Lighthouse Mobile (Target Scores)
```bash
# Ejecutar en Chrome DevTools
lighthouse https://app.clousadmin.com --preset=mobile --only-categories=performance,accessibility

# Targets mínimos
Performance:    >= 85
Accessibility:  >= 95
Best Practices: >= 90
```

### Métricas Críticas
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **TTI (Time to Interactive)**: < 3.5s

### Tests de Red
- [ ] **4G lento**: Página carga en <5s
- [ ] **3G**: Funcionalidad básica accesible
- [ ] **Offline**: Mensaje de error apropiado

---

## 🐛 Edge Cases a Verificar

### Datos Extremos
- [ ] Nombres muy largos en tablas (truncamiento con ellipsis)
- [ ] Listas con 0 items (empty states)
- [ ] Listas con 1000+ items (scroll performance)
- [ ] Campos de formulario con máximo caracteres

### Estados de la Aplicación
- [ ] Carga inicial (skeleton screens o spinners)
- [ ] Errores de red (mensajes claros)
- [ ] Sesión expirada (redirect a login)
- [ ] Sin permisos (mensajes de error)

### Orientación del Dispositivo
- [ ] Portrait mode funciona correctamente
- [ ] Landscape mode (tablets) mantiene usabilidad
- [ ] Transición entre orientaciones sin pérdida de datos

---

## 📊 Herramientas de Testing

### Emuladores (Desarrollo Rápido)
```bash
# Chrome DevTools
- Device Toolbar (Cmd+Shift+M / Ctrl+Shift+M)
- Preset: iPhone 12 Pro, Samsung Galaxy S20
- Throttling: Fast 3G o Slow 4G

# Safari Developer Tools (macOS)
- Develop > Enter Responsive Design Mode
```

### Dispositivos Reales (Testing Final)
- **iOS**: Safari con Web Inspector
- **Android**: Chrome con Remote Debugging

### Herramientas Automatizadas
```bash
# Lighthouse CLI
npm install -g lighthouse
lighthouse https://app.clousadmin.com --preset=mobile --view

# Pa11y (Accessibility)
npx pa11y https://app.clousadmin.com

# WebPageTest
# https://www.webpagetest.org/
```

---

## ✅ Criterios de Aceptación

Para considerar el testing completo, se deben cumplir:

1. ✅ **100% de páginas principales** probadas en iPhone y Android
2. ✅ **0 errores críticos** de usabilidad identificados
3. ✅ **Performance score >= 85** en Lighthouse Mobile
4. ✅ **Accessibility score >= 95** en Lighthouse
5. ✅ **Touch targets >= 44px** verificados en todas las interacciones
6. ✅ **Edge cases** documentados y manejados

---

## 📝 Reporte de Issues

### Formato para Reportar Bugs
```markdown
**Dispositivo**: iPhone 13 / iOS 16.5 / Safari
**Página**: /hr/horario/fichajes
**Severidad**: Alta / Media / Baja
**Descripción**: El botón de filtros no abre el sheet
**Pasos para Reproducir**:
1. Ir a /hr/horario/fichajes
2. Hacer click en botón "Filtros"
3. No ocurre nada

**Comportamiento Esperado**: Debería abrir sheet con filtros
**Screenshots**: [adjuntar]
```

---

## 🚀 Siguientes Pasos

1. **Asignar responsables** para cada módulo de testing
2. **Ejecutar checklist** en dispositivos reales
3. **Documentar issues** encontrados
4. **Priorizar fixes** (crítico > alto > medio > bajo)
5. **Iterar** hasta cumplir criterios de aceptación
6. **Aprobar release** mobile

---

**Documento creado**: 2025-01-21  
**Mantenido por**: Equipo QA Clousadmin

