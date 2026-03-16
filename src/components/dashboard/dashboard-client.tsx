'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
    FileText, 
    Box, 
    FileInput, 
    Receipt, 
    Activity, 
    TrendingUp, 
    TrendingDown, 
    Clock, 
    Mail, 
    ChevronRight, 
    MoreHorizontal,
    Gem,
    Home
} from "lucide-react"
import { FinancialChart } from "@/components/dashboard/financial-chart"
import Link from "next/link"
import { format } from 'date-fns'
import { es } from 'date-fns/locale/es'
import { CalendarFinancialView } from '@/components/dashboard/calendar-financial-view'
import { cn, formatCurrency } from "@/lib/utils"
import { useGlobalFilter } from "@/components/providers/global-filter-provider"
import { useBudgets } from "@/hooks/use-budgets"
import { useDeliveryNotes } from "@/hooks/use-delivery-notes"
import { useInvoices } from "@/hooks/use-invoices"
import { useExpenses } from "@/hooks/use-expenses"
import { Skeleton } from "@/components/ui/skeleton"

function DocCard({
  title,
  total,
  count,
  icon: Icon,
  href,
  colorScheme = "blue"
}: {
  title: string,
  total: number,
  count: number,
  icon: any,
  href: string,
  colorScheme?: string
}) {
  const schemes: Record<string, { bg: string, icon: string, border: string, dot: string }> = {
    blue: { bg: "bg-primary/5", icon: "text-primary", border: "border-primary/10", dot: "bg-primary" },
    orange: { bg: "bg-orange-50", icon: "text-orange-600", border: "border-orange-100", dot: "bg-orange-500" },
    green: { bg: "bg-emerald-50", icon: "text-emerald-600", border: "border-emerald-100", dot: "bg-emerald-500" },
    red: { bg: "bg-red-50", icon: "text-red-600", border: "border-red-100", dot: "bg-red-500" },
    purple: { bg: "bg-purple-50", icon: "text-purple-600", border: "border-purple-100", dot: "bg-purple-500" },
  }

  const current = schemes[colorScheme] || schemes.blue

  return (
    <Link href={href} className="group">
      <div className={cn(
        "metric-card card-hover relative flex flex-col justify-between h-full min-h-[160px] cursor-pointer bg-white transition-all overflow-hidden border",
        current.border
      )}>
        <div className="flex justify-between items-start">
          <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shadow-sm brightness-110", current.bg)}>
            <Icon className={cn("h-5 w-5", current.icon)} />
          </div>
          <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
            <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", current.dot)} />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              {count} {count === 1 ? 'doc' : 'docs'}
            </span>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
          <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight font-mono">
            {formatCurrency(total)}
          </h3>
        </div>

        {/* Decorative micro-gradient on hover */}
        <div className={cn("absolute bottom-0 left-0 h-[3px] w-0 group-hover:w-full transition-all duration-500", current.dot)} />
      </div>
    </Link>
  )
}

export function DashboardClient({ initialHistorial = [] }: { initialHistorial?: any[] }) {
    const { month, year, profile } = useGlobalFilter()

    // Fetch all needed data using our profile-aware hooks
    const { budgets, totalCount: countBudgets, stats: budgetStats, isLoading: loadingBudgets } = useBudgets({ month, year, pageSize: 1000 })
    const { albaranes, totalCount: countAlbaranes, stats: albaranStats, isLoading: loadingAlbaranes } = useDeliveryNotes({ month, year, pageSize: 1000 })
    const { facturas, totalCount: countInvoices, stats: invoiceStats, isLoading: loadingInvoices } = useInvoices({ month, year, pageSize: 1000 })
    const { gastos, totalCount: countExpenses, stats: expenseStats, isLoading: loadingExpenses } = useExpenses({ month, year, pageSize: 1000 })

    const isLoading = loadingBudgets || loadingAlbaranes || loadingInvoices || loadingExpenses

    const totalFacturado = invoiceStats.totalFacturado || 0
    const totalGastos = expenseStats.totalGastos || 0
    const netProfit = totalFacturado - totalGastos

    const profileLabel = profile === 'personal' ? 'Flownexion' : 'Villa Blue'
    const profileSublabel = profile === 'personal' ? 'Consultoría IA' : 'Gasto Compartido'

    if (isLoading) {
        return (
            <div className="space-y-12 pb-20 animate-pulse">
                <div className="h-40 bg-slate-100 rounded-3xl" />
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-slate-100 rounded-2xl" />)}
                </div>
                <div className="h-[400px] bg-slate-100 rounded-3xl" />
            </div>
        )
    }

    return (
        <div className="space-y-12 pb-20">
            {/* Premium Header Layout */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200/60 pb-8">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className={cn("h-6 w-1 rounded-full", profile === 'personal' ? "bg-indigo-600" : "bg-sky-500")} />
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.3em]">PANEL PRINCIPAL</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "h-14 w-14 rounded-3xl flex items-center justify-center shadow-xl",
                            profile === 'personal' ? "bg-indigo-600" : "bg-sky-500"
                        )}>
                            {profile === 'personal' ? <Gem className="h-7 w-7 text-white" /> : <Home className="h-7 w-7 text-white" />}
                        </div>
                        <div>
                            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 leading-tight">
                                {profileLabel}
                            </h2>
                            <p className="text-slate-500 font-medium text-base md:text-lg">{profileSublabel}</p>
                        </div>
                    </div>
                </div>

                {/* Global Finance Health Badge */}
                <div className="flex items-center gap-4 bg-slate-900 px-6 py-3 rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-800">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Estado {month !== 'all' ? 'del Periodo' : 'Global'}</span>
                        <span className={cn(
                            "text-sm font-extrabold uppercase tracking-tight",
                            netProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                        )}>
                            {netProfit >= 0 ? 'Rendimiento Óptimo' : 'Revisar Cuentas'}
                        </span>
                    </div>
                    <div className="h-10 w-[1px] bg-slate-700 mx-1" />
                    <div className="relative flex h-4 w-4">
                        <span className={cn(
                            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                            netProfit >= 0 ? "bg-emerald-400" : "bg-rose-400"
                        )}></span>
                        <span className={cn(
                            "relative inline-flex rounded-full h-4 w-4 border-2 border-slate-900",
                            netProfit >= 0 ? "bg-emerald-500" : "bg-rose-500"
                        )}></span>
                    </div>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <DocCard
                    title="Presupuestos"
                    total={budgetStats.totalOfertado || 0}
                    count={countBudgets}
                    icon={FileText}
                    href="/presupuestos"
                    colorScheme="blue"
                />
                <DocCard
                    title="Albaranes"
                    total={albaranStats.totalEntregado || 0}
                    count={countAlbaranes}
                    icon={Box}
                    href="/albaranes"
                    colorScheme="orange"
                />
                <DocCard
                    title="Facturas"
                    total={totalFacturado}
                    count={countInvoices}
                    icon={FileInput}
                    href="/facturas"
                    colorScheme="green"
                />
                <DocCard
                    title="Gastos Totales"
                    total={totalGastos}
                    count={countExpenses}
                    icon={Receipt}
                    href="/gastos"
                    colorScheme="red"
                />
            </div>

            {/* Calendar Forecast View */}
            <CalendarFinancialView
                invoices={facturas}
                expenses={gastos}
                budgets={budgets}
                deliveryNotes={albaranes}
            />

            {/* Chart & Insights Section */}
            <div className="grid gap-8">
                <div className="metric-card bg-white shadow-xl shadow-slate-200/20 border-slate-100 overflow-hidden group">
                    <div className="flex flex-row justify-between items-center mb-10">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
                                <Activity className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight">Evolución de Tesorería</h3>
                                <p className="text-xs md:text-sm font-medium text-slate-400 mt-0.5">Ingresos vs Gastos acumulados</p>
                            </div>
                        </div>

                        <div className="bg-slate-50/80 px-6 py-4 rounded-2xl border border-slate-100 text-right group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
                            <span className="text-[10px] font-bold uppercase tracking-widest block mb-1 opacity-60">Beneficio Neto</span>
                            <span className={cn(
                                "text-2xl font-black font-mono tracking-tighter",
                                netProfit >= 0 ? "text-emerald-600 group-hover:text-emerald-400" : "text-rose-600 group-hover:text-rose-400"
                            )}>
                                {formatCurrency(netProfit)}
                            </span>
                        </div>
                    </div>
                    <div className="mt-4">
                        <FinancialChart
                            invoices={facturas}
                            expenses={gastos}
                        />
                    </div>
                </div>
            </div>

            {/* Modern Table Section (Historial) */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Clock className="h-6 w-6 text-primary" />
                        <h3 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight">Historial de Notificaciones</h3>
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl shadow-slate-200/10 overflow-hidden">
                    <div className="min-w-full overflow-x-auto">
                        <table className="w-full text-sm text-left align-middle">
                            <thead>
                                <tr className="bg-slate-50/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">
                                    <th className="px-8 py-5">Identificador</th>
                                    <th className="px-8 py-5">Entidad / Cliente</th>
                                    <th className="px-8 py-5">Documento</th>
                                    <th className="px-8 py-5">Cronología</th>
                                    <th className="px-8 py-5 text-right">Canal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {initialHistorial.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-2 opacity-30">
                                                <Mail className="h-12 w-12" />
                                                <p className="font-bold uppercase tracking-widest text-[10px]">No hay actividad reciente</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    initialHistorial.map((entry: any) => {
                                        const tipo = entry.tipo_documento?.toUpperCase()
                                        const isFactura = tipo?.includes('FACTURA')
                                        const isPresupuesto = tipo?.includes('PRESUPUESTO')

                                        return (
                                            <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <span className={cn(
                                                        "px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest border shadow-sm uppercase",
                                                        isFactura ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                                            isPresupuesto ? "bg-blue-50 text-blue-700 border-blue-100" :
                                                                "bg-amber-50 text-amber-700 border-amber-100"
                                                    )}>
                                                        {entry.tipo_documento}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">
                                                            {entry.destinatario || entry.usuario_nombre || 'Desconocido'}
                                                        </span>
                                                        <span className="text-xs text-slate-400 font-medium mt-0.5">{entry.email_destinatario}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                                                        {entry.numero_documento || 'ID: ' + entry.id.slice(0, 8)}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2 text-slate-500 font-medium whitespace-nowrap">
                                                        <Clock className="h-3.5 w-3.5 opacity-50" />
                                                        {format(new Date(entry.created_at), "dd MMM yyyy, HH:mm", { locale: es })}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold ring-1 ring-emerald-100">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                        ENVIADO
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
