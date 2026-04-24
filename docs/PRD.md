# Bloom — Plataforma de Gestión para Clínicas de Belleza

## Resumen

Bloom es una plataforma SaaS white-label para clínicas de belleza y estética. Tiene dos portales:

- **Portal Admin** (desktop-first, responsive): gestión completa de la clínica
- **Portal Cliente** (mobile-first, PWA instalable): reservas, planes, pagos, catálogo

La plataforma es multi-tenant: cada clínica tiene su propia instancia con logo, colores y dominio personalizable. Ideal para demos a potenciales clientes.

---

## Arquitectura

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 (App Router) |
| Styling | Tailwind CSS + CSS variables para theming |
| Base de datos | Supabase (Postgres + Auth + Storage + Realtime) |
| Pagos | Stripe (suscripciones, pagos únicos, checkout) |
| Comunicación | WhatsApp Business API (Meta Cloud API) |
| Deploy | Vercel |
| DNS | Cloudflare |

### Multi-tenancy

- Cada clínica = un `tenant` en la base de datos
- Theming dinámico via CSS variables (colores primario/secundario, logo, nombre)
- Subdominio por clínica: `clinica-ejemplo.bloom.app`
- Row Level Security (RLS) en todas las tablas por `tenant_id`

---

## Módulos

### 1. Gestión de Citas

**Admin:**
- Calendario visual (día/semana/mes) con drag & drop
- Crear, editar, cancelar citas
- Duración variable por tipo de servicio (30min, 45min, 60min, 90min, etc.)
- Asignación a profesional específico
- Vista de agenda por profesional
- Optimización automática de huecos: sugiere horarios que minimizan tiempos muertos entre citas
- Recordatorios automáticos via WhatsApp: 96h y 24h antes de la cita
- Lista de espera para huecos cancelados
- Bloqueo de horarios (vacaciones, descansos)

**Cliente:**
- Selección de servicio → profesional → fecha/hora disponible
- Confirmación instantánea o pendiente de aprobación
- Ver, modificar y cancelar citas futuras
- Historial de citas pasadas

### 2. Gestión de Planes / Bonos

**Admin:**
- Crear planes: nombre, servicios incluidos, cantidad de sesiones, precio, vigencia
- Ejemplos: "Bono 10 sesiones láser", "Plan mensual facial ilimitado"
- Ver estado de cada plan vendido: sesiones usadas vs. disponibles
- Alertas cuando un plan está por vencer o le quedan pocas sesiones
- Renovación automática opcional

**Cliente:**
- Ver planes activos con progreso visual (5/10 sesiones usadas)
- Historial de uso por plan
- Comprar/renovar planes desde la app
- Notificación cuando quedan pocas sesiones

### 3. Pagos

**Admin:**
- Dashboard de cobros: pendientes, completados, reembolsos
- Generar cobros manuales
- Configurar precios por servicio y por plan
- Reportes de ingresos por período/servicio/profesional

**Cliente:**
- Pago de planes y servicios via Stripe Checkout
- Métodos de pago guardados
- Historial de pagos y facturas descargables
- Pago anticipado o al momento de la cita

### 4. Catálogo de Productos

**Admin:**
- CRUD de productos: nombre, descripción, precio, foto, stock, categoría
- Categorías personalizables
- Marcar productos como destacados
- Control de inventario básico

**Cliente:**
- Navegar catálogo por categorías
- Ver detalle de producto con fotos
- Solicitar producto (reserva para recoger en clínica)
- Productos recomendados post-tratamiento

### 5. Historial de Clientes (Ficha Clínica)

**Admin:**
- Ficha completa por cliente: datos personales, alergias, notas clínicas
- Historial de todos los servicios recibidos con fechas
- Fotos de antes/después por tratamiento
- Notas privadas por profesional
- Consentimientos firmados digitalmente
- Etiquetas/segmentos (VIP, frecuente, nuevo, etc.)

**Cliente:**
- Ver su propio historial de tratamientos
- Acceder a recomendaciones post-tratamiento
- Actualizar datos personales

### 6. Finanzas y Reporting

**Admin:**
- Dashboard con KPIs: ingresos mensuales, ticket medio, ocupación, retención
- Reportes por período: ingresos, gastos, beneficio
- Desglose por servicio, profesional, tipo de pago
- Comparativa mes a mes
- Exportar a CSV/PDF
- Gastos operativos: alquileres, productos, nóminas (input manual)

### 7. Programa de Fidelización

**Admin:**
- Configurar reglas de puntos: X puntos por euro gastado, bonos por referidos
- Definir recompensas canjeables: descuentos, servicios gratis, productos
- Ver ranking de clientes por puntos
- Campañas especiales: puntos dobles en fechas señaladas

**Cliente:**
- Ver saldo de puntos y nivel de fidelización
- Historial de puntos ganados/canjeados
- Catálogo de recompensas disponibles
- Canjear puntos por recompensas
- Compartir código de referido

### 8. Comunicación (WhatsApp Business)

**Integración:**
- WhatsApp Business API via Meta Cloud API (o Twilio como fallback)
- Templates pre-aprobados por Meta (requiere aprobación 24-48h)
- Número de WhatsApp Business por clínica (tenant)

**Admin:**
- Configurar mensajes automáticos y templates
- Chat directo con clientes desde el panel admin
- Ver historial de mensajes por cliente (en la ficha clínica)
- Campañas: enviar promociones/novedades a segmentos de clientes
- Métricas: mensajes enviados, leídos, respondidos

**Automático:**
- Confirmación de cita al reservar
- Recordatorio 96h antes de la cita
- Recordatorio 24h antes de la cita
- Confirmación de pago recibido
- Aviso de plan por vencer / pocas sesiones restantes
- Notificación de puntos de fidelización ganados
- Felicitación de cumpleaños (si tiene fecha registrada)

**Cliente:**
- Confirmar/cancelar cita respondiendo al WhatsApp
- Chat con la clínica
- Recibir recordatorios y promociones

---

## White-Label / Personalización

Para cada clínica (tenant) se configura:

| Campo | Ejemplo |
|-------|---------|
| `name` | Clínica Aurora |
| `logo_url` | /storage/tenants/aurora/logo.png |
| `primary_color` | #8B5CF6 |
| `secondary_color` | #F59E0B |
| `accent_color` | #EC4899 |
| `subdomain` | aurora.bloom.app |
| `custom_domain` | (opcional) citas.clinicaaurora.com |
| `welcome_message` | Bienvenida a Clínica Aurora |
| `business_hours` | L-V 9:00-20:00, S 10:00-14:00 |

El theming se aplica via CSS variables en el layout raíz:

```css
:root {
  --color-primary: var(--tenant-primary);
  --color-secondary: var(--tenant-secondary);
}
```

---

## Modelo de Datos (tablas principales)

Todas las tablas llevan prefijo `bloom_` y tienen `tenant_id`.

| Tabla | Descripción |
|-------|-------------|
| `bloom_tenants` | Clínicas registradas, config, theming |
| `bloom_users` | Usuarios (admin, profesional, cliente) |
| `bloom_professionals` | Profesionales de cada clínica |
| `bloom_services` | Catálogo de servicios por clínica |
| `bloom_appointments` | Citas agendadas |
| `bloom_plans` | Definición de planes/bonos |
| `bloom_plan_subscriptions` | Planes comprados por clientes |
| `bloom_plan_usage` | Sesiones usadas de cada plan |
| `bloom_products` | Catálogo de productos |
| `bloom_product_categories` | Categorías de productos |
| `bloom_client_records` | Ficha clínica por cliente |
| `bloom_client_notes` | Notas clínicas |
| `bloom_client_photos` | Fotos antes/después |
| `bloom_payments` | Registro de pagos |
| `bloom_expenses` | Gastos operativos |
| `bloom_loyalty_points` | Saldo y movimientos de puntos |
| `bloom_loyalty_rewards` | Recompensas canjeables |
| `bloom_loyalty_redemptions` | Canjes realizados |
| `bloom_referrals` | Referidos entre clientes |
| `bloom_whatsapp_templates` | Templates de WhatsApp aprobados |
| `bloom_messages` | Historial de mensajes WhatsApp |
| `bloom_message_campaigns` | Campañas de mensajes masivos |

---

## Roles y Permisos

| Rol | Acceso |
|-----|--------|
| `superadmin` | Todo (nosotros, para gestionar tenants) |
| `owner` | Todo dentro de su clínica |
| `admin` | Gestión completa excepto facturación del tenant |
| `professional` | Su agenda, fichas de sus clientes, notas |
| `client` | Sus citas, planes, pagos, perfil, fidelización |

Auth via Supabase Auth (email + magic link para clientes, email + password para admin).

---

## Flujos Principales

### Cliente reserva una cita
1. Abre la PWA → ve servicios disponibles
2. Selecciona servicio → elige profesional (o "sin preferencia")
3. Ve horarios disponibles (sistema optimiza huecos)
4. Confirma → recibe confirmación por WhatsApp
5. 96h y 24h antes: recordatorio automático por WhatsApp
6. Post-cita: se descuentan sesiones del plan si aplica

### Admin ve su día
1. Abre dashboard → ve citas de hoy por profesional
2. Vista de timeline con ocupación
3. Alertas: citas sin confirmar, pagos pendientes, planes por vencer
4. Click en cita → ve ficha del cliente, historial, notas

### Demo a potencial cliente (clínica)
1. Superadmin crea nuevo tenant con logo/colores del prospecto
2. Se genera subdominio: `demo-clinicax.bloom.app`
3. Se pre-cargan datos de ejemplo (servicios, citas, clientes ficticios)
4. El prospecto navega su "clínica" personalizada
5. Si convierte → se limpian datos demo y se activa en producción

---

## PWA y Experiencia Móvil

- Service Worker para funcionamiento offline básico (ver citas, catálogo cacheado)
- Prompt de instalación en primera visita desde móvil
- Notificaciones via WhatsApp Business API (recordatorios, confirmaciones)
- Splash screen con logo de la clínica
- Manifest dinámico por tenant (nombre, colores, icono de la clínica)

---

## Fases de Desarrollo

### Fase 1 — MVP (semanas 1-2)
- Setup: Next.js + Supabase + Tailwind + multi-tenancy básico
- Auth (login cliente con magic link, login admin con password)
- CRUD de servicios y profesionales
- Calendario de citas (crear, ver, cancelar)
- Disponibilidad básica por profesional
- Theming white-label (logo + colores)
- PWA con InstallPrompt
- Deploy en Vercel

### Fase 2 — Planes y Pagos (semana 3)
- Gestión de planes/bonos
- Integración Stripe (checkout, webhooks)
- Control de sesiones usadas vs. disponibles
- Historial de pagos

### Fase 3 — Ficha Clínica + Catálogo (semana 4)
- Ficha de cliente completa
- Notas clínicas y fotos
- Catálogo de productos
- Control de inventario básico

### Fase 4 — Reporting + Fidelización (semana 5)
- Dashboard financiero
- Reportes exportables
- Programa de puntos
- Sistema de referidos

### Fase 5 — Optimización (semana 6)
- Optimización inteligente de huecos en agenda
- Lista de espera
- Notificaciones push
- Datos demo para onboarding de clínicas
- QA completo y hardening

---

## Estructura del Proyecto

```
beauty-clinic/
  docs/                    # Documentación
  src/
    app/
      (admin)/             # Portal admin (layout propio)
        dashboard/
        appointments/
        clients/
        services/
        plans/
        products/
        finances/
        loyalty/
        settings/
      (client)/            # Portal cliente (layout propio)
        book/
        my-appointments/
        my-plans/
        catalog/
        rewards/
        profile/
      api/
        stats/
        webhooks/stripe/
        cron/
      login/
      register/
    components/
      admin/
      client/
      shared/
      ui/                  # Componentes base (Button, Card, Modal, etc.)
    lib/
      supabase/
      stripe/
      tenant/              # Config multi-tenant, theming
      scheduling/          # Lógica de optimización de horarios
    hooks/
    types/
  public/
  supabase/
    migrations/
```

---

## Notas Técnicas

- **Optimización de huecos**: al sugerir horarios, priorizar los que dejan bloques útiles libres (no fragmentos de 15min inutilizables)
- **Timezone**: todas las horas en timezone del tenant, almacenadas en UTC
- **Storage**: fotos de productos y fichas clínicas en Supabase Storage, organizadas por tenant
- **Rate limiting**: API routes con rate limiting para prevenir abuso
- **GDPR/protección de datos**: datos clínicos encriptados, derecho al olvido implementado
