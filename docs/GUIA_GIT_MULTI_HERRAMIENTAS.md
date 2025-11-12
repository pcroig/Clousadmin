# 🔄 Guía Súper Sencilla: Git para Múltiples Herramientas

**Para usar Claude Code, Claude Code Web y Cursor al mismo tiempo sin perder código**

---

## 🎯 Regla de Oro

> **UNA RAMA POR CONVERSACIÓN**  
> Cada conversación = una rama nueva. Así nunca pierdes código.

---

## 📋 Conceptos Básicos

- **Rama**: Tu espacio de trabajo separado (como una carpeta independiente)
- **Commit**: Guardar tus cambios
- **Push**: Subir a GitHub (¡MUY IMPORTANTE! Así no pierdes nada)
- **Pull Request (PR)**: Pedir que tus cambios se integren en el código principal

---

## 🤔 ¿Qué es "Abrir en CLI" y "Crear PR"?

### "Abrir en CLI" (Claude Code Web)

Cuando ves `claude --teleport session_...` significa que Claude quiere abrir tu proyecto en tu terminal local. 

**¿Qué hacer?**
- **Puedes ignorarlo** si trabajas desde la web
- **O copiar el comando** y ejecutarlo en tu terminal si quieres trabajar localmente

**No es necesario hacerlo** - puedes seguir trabajando desde Claude Code Web sin problemas.

### "Crear PR" (Pull Request)

Un **Pull Request (PR)** es como pedir permiso para integrar tus cambios en el código principal.

**¿Cuándo crear un PR?**
- Cuando terminas una funcionalidad completa
- Cuando quieres que alguien revise tus cambios antes de integrarlos
- Cuando trabajas en equipo

**¿Cómo crear un PR?**
1. Ve a GitHub en tu navegador
2. Verás un botón "Compare & pull request" en tu rama
3. O ve a: `https://github.com/pcroig/Clousadmin/compare/main...tu-rama`

**💡 Tip**: Si trabajas solo, puedes fusionar directamente sin crear PR (ver sección "Terminar Tarea").

---

## 🚀 Comandos Esenciales (Copia y Pega)

### 1️⃣ Empezar Nueva Conversación/Tarea

```bash
git checkout main
git pull origin main
git checkout -b feature/nombre-tarea
```

**Ejemplos de nombres:**
- `feature/rate-limit` → Mejoras en rate limit
- `feature/claude-ui` → Mejoras de UI en Claude
- `fix/cursor-bug` → Fix de bug en Cursor

---

### 2️⃣ Guardar Cambios (Hacer Cada 30-60 min)

```bash
git add .
git commit -m "feat: descripción de lo que haces"
git push origin feature/nombre-tarea
```

**Ejemplos de mensajes:**
- `"feat: mejorar rate limit"`
- `"fix: corregir bug en ausencias"`
- `"WIP: trabajo en progreso"` (si no está terminado)

---

### 3️⃣ Antes de Cambiar de Herramienta

**SIEMPRE haz esto antes de cerrar:**

```bash
git add .
git commit -m "WIP: guardando trabajo"
git push origin feature/nombre-tarea
git status
```

Si `git status` dice "nothing to commit" → ✅ Todo guardado.

---

### 4️⃣ Volver a una Conversación

```bash
git checkout feature/nombre-tarea
git pull origin feature/nombre-tarea
```

---

### 5️⃣ Terminar Tarea (Fusionar en main)

```bash
git add .
git commit -m "feat: completar [nombre funcionalidad]"
git push origin feature/nombre-tarea

git checkout main
git pull origin main
git merge feature/nombre-tarea
git push origin main
```

---

## 📝 Checklist Rápido

**Antes de cerrar CUALQUIER herramienta:**

```bash
git status          # Ver qué has cambiado
git add .           # Agregar cambios
git commit -m "..." # Guardar
git push origin ... # Subir a GitHub
git status          # Verificar que está limpio
```

---

## 🔍 Ver Estado Actual

```bash
git status          # Ver qué archivos cambiaron
git branch          # Ver en qué rama estás
git branch -a       # Ver todas las ramas
```

---

## 🆘 Problemas Comunes

### Error: "Cambios no guardados"

**Solución:**
```bash
git add .
git commit -m "WIP: guardando cambios"
git checkout otra-rama
```

### Error: "Rama ya existe"

**Solución:**
```bash
git checkout feature/nombre-rama-existente
```

### Recuperar Código Perdido

```bash
git reflog                    # Ver todos los commits
git checkout -b recuperacion abc1234  # Recuperar commit específico
```

---

## 💡 Ejemplo Real: 3 Conversaciones Simultáneas

**Lunes - Conversación 1 (Cursor):**
```bash
git checkout main
git pull origin main
git checkout -b feature/cursor-rate-limit
# ... trabajas ...
git add .
git commit -m "feat: mejorar rate limit"
git push origin feature/cursor-rate-limit
```

**Lunes - Conversación 2 (Claude Code Web):**
```bash
git checkout main
git pull origin main
git checkout -b feature/claude-ui
# ... trabajas ...
git add .
git commit -m "feat: mejorar formularios"
git push origin feature/claude-ui
```

**Martes - Vuelves a Conversación 1:**
```bash
git checkout feature/cursor-rate-limit
git pull origin feature/cursor-rate-limit
# ... continúas trabajando ...
```

---

## ✅ Resumen: 5 Comandos que Necesitas Saber

1. **Empezar**: `git checkout -b feature/nombre`
2. **Guardar**: `git add . && git commit -m "mensaje" && git push origin feature/nombre`
3. **Cambiar rama**: `git checkout feature/nombre`
4. **Ver estado**: `git status`
5. **Ver rama actual**: `git branch`

---

**Última actualización**: Enero 2025  
**Versión**: 2.0 - Simplificada
