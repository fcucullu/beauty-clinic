# Bloom

Plataforma de gestion para clinicas de belleza y estetica.

## Problema

Las clinicas de belleza gestionan citas, planes, pagos y comunicacion con clientes usando herramientas desconectadas (WhatsApp personal, agendas de papel, Excel). Esto genera errores, huecos en la agenda y mala experiencia para el cliente.

## Solucion

Bloom es una plataforma SaaS white-label que centraliza toda la gestion de una clinica de belleza en una sola app:

- **Portal Admin** (desktop-first): calendario de citas, gestion de clientes, servicios, profesionales, planes, finanzas y reporting
- **Portal Cliente** (mobile-first PWA): reservar citas, ver planes, pagos, programa de fidelizacion

Cada clinica tiene su propia marca (logo, colores, subdominio).

## Audiencia

Clinicas de belleza, centros de estetica, spas y profesionales independientes del sector belleza.

## Features principales

- Gestion de citas con calendario visual y optimizacion de huecos
- Planes y bonos (sesiones usadas vs disponibles)
- Pagos integrados con Stripe
- Catalogo de productos
- Ficha clinica por cliente (historial, fotos, notas)
- Finanzas y reporting (KPIs, exportar CSV/PDF)
- Programa de fidelizacion con puntos y referidos
- Comunicacion via WhatsApp Business (recordatorios 96h/24h)
- White-label: logo, colores, subdominio por clinica
- PWA instalable desde el movil

## Stack

- Next.js 14 (App Router)
- Tailwind CSS
- Supabase (Postgres + Auth + Storage)
- Stripe
- WhatsApp Business API
- Vercel + Cloudflare

## Desarrollo

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
