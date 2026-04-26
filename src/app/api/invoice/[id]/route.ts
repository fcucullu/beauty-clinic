import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get appointment with all details
  const { data: apt } = await supabase
    .from('bloom_appointments')
    .select(`
      *,
      client:bloom_users!bloom_appointments_client_id_fkey(*),
      professional:bloom_professionals!bloom_appointments_professional_id_fkey(*, user:bloom_users(*)),
      service:bloom_services(*)
    `)
    .eq('id', id)
    .single()

  if (!apt) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Get tenant info for branding
  const { data: tenant } = await supabase
    .from('bloom_tenants')
    .select('*')
    .eq('id', apt.tenant_id)
    .single()

  const invoiceDate = new Date(apt.start_time).toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
  const invoiceNumber = `BL-${apt.id.slice(0, 8).toUpperCase()}`
  const serviceName = apt.service?.name || 'Servicio'
  const servicePrice = apt.service?.price || 0
  const duration = apt.service?.duration_minutes || 0
  const clientName = apt.client?.full_name || ''
  const clientEmail = apt.client?.email || ''
  const professionalName = apt.professional?.user?.full_name || ''
  const clinicName = tenant?.name || 'Bloom'
  const primaryColor = tenant?.primary_color || '#8B5CF6'
  const taxRate = 21
  const subtotal = servicePrice
  const tax = Math.round(subtotal * taxRate) / 100
  const total = subtotal + tax

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factura ${invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; background: #fff; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .logo { display: flex; align-items: center; gap: 12px; }
    .logo-icon { width: 40px; height: 40px; border-radius: 10px; background: ${primaryColor}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; }
    .clinic-name { font-size: 22px; font-weight: 700; }
    .invoice-title { text-align: right; }
    .invoice-title h1 { font-size: 28px; color: ${primaryColor}; font-weight: 700; }
    .invoice-title p { color: #666; font-size: 14px; margin-top: 4px; }
    .details { display: flex; justify-content: space-between; margin-bottom: 32px; }
    .details-section h3 { font-size: 12px; text-transform: uppercase; color: #999; letter-spacing: 0.5px; margin-bottom: 8px; }
    .details-section p { font-size: 14px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead { background: #f9fafb; }
    th { text-align: left; padding: 12px 16px; font-size: 12px; text-transform: uppercase; color: #666; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb; }
    th:last-child, td:last-child { text-align: right; }
    td { padding: 16px; font-size: 14px; border-bottom: 1px solid #f3f4f6; }
    .totals { display: flex; justify-content: flex-end; }
    .totals-table { width: 280px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
    .totals-row.total { border-top: 2px solid #1a1a1a; padding-top: 12px; margin-top: 4px; font-size: 18px; font-weight: 700; }
    .total-amount { color: ${primaryColor}; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #999; font-size: 12px; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .status-completed { background: #dcfce7; color: #166534; }
    .status-pending { background: #fef9c3; color: #854d0e; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <div class="logo-icon">${clinicName.charAt(0)}</div>
      <span class="clinic-name">${clinicName}</span>
    </div>
    <div class="invoice-title">
      <h1>FACTURA</h1>
      <p>${invoiceNumber}</p>
    </div>
  </div>

  <div class="details">
    <div class="details-section">
      <h3>Cliente</h3>
      <p><strong>${clientName}</strong></p>
      <p>${clientEmail}</p>
    </div>
    <div class="details-section">
      <h3>Fecha</h3>
      <p>${invoiceDate}</p>
      <p>Profesional: ${professionalName}</p>
      <p>
        <span class="status ${apt.status === 'completed' ? 'status-completed' : 'status-pending'}">
          ${apt.status === 'completed' ? 'Completado' : apt.status === 'confirmed' ? 'Confirmado' : 'Pendiente'}
        </span>
      </p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Servicio</th>
        <th>Duracion</th>
        <th>Precio</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>${serviceName}</strong></td>
        <td>${duration} min</td>
        <td>${subtotal.toFixed(2)} &euro;</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-table">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>${subtotal.toFixed(2)} &euro;</span>
      </div>
      <div class="totals-row">
        <span>IVA (${taxRate}%)</span>
        <span>${tax.toFixed(2)} &euro;</span>
      </div>
      <div class="totals-row total">
        <span>Total</span>
        <span class="total-amount">${total.toFixed(2)} &euro;</span>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>${clinicName} &mdash; Factura generada automaticamente</p>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
