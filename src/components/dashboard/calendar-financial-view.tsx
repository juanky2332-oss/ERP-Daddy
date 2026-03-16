'use client'

import React, { useState, useMemo } from 'react'
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    addWeeks,
    addYears,
    isAfter,
    isBefore,
    parseISO
} from 'date-fns'
import { es } from 'date-fns/locale/es'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Calendar as CalendarIcon, Info } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, TooltipPortal } from '@/components/ui/tooltip'

interface Transaction {
    id: string
    baseId: string // The original DB record ID
    fecha: string
    total: number
    descripcion: string
    empresa: string
    referencia: string
    tipo: 'ingreso_pagado' | 'ingreso_pendiente' | 'gasto' | 'presupuesto' | 'albaran'
    es_recurrente?: boolean
    frecuencia?: 'unico' | 'semanal' | 'quincenal' | 'mensual' | 'bimestral' | 'trimestral' | 'semestral' | 'anual'
    isForecast?: boolean
}

interface CalendarFinancialViewProps {
    invoices: any[]
    expenses: any[]
    budgets?: any[]
    deliveryNotes?: any[]
}

export function CalendarFinancialView({ invoices, expenses, budgets = [], deliveryNotes = [] }: CalendarFinancialViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date())

    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    const days = eachDayOfInterval({
        start: calendarStart,
        end: calendarEnd
    })

    // Helper to calculate occurrences of a recurring item in a given range
    const getOccurrences = (item: any, type: Transaction['tipo'], rangeStart: Date, rangeEnd: Date) => {
        const occurrences: Transaction[] = []
        const dateStr = item.fecha || item.created_at
        if (!dateStr) return occurrences
        
        const baseDate = parseISO(dateStr)
        const datePart = format(baseDate, 'yyyy-MM-dd')
        const today = new Date()

        let finalType = type
        if (type === 'ingreso_pendiente') {
            const isPaid = item.estado?.toUpperCase() === 'PAGADA' || 
                           item.estado?.toLowerCase() === 'pagada' || 
                           item.pagada === true || 
                           item.statuses?.some((s: string) => s.toLowerCase() === 'pagada')
            if (isPaid) finalType = 'ingreso_pagado'
        }

        // Base occurrence (always real)
        occurrences.push({
            id: item.id,
            baseId: item.id,
            fecha: datePart,
            total: item.total || 0,
            descripcion: item.descripcion || item.observaciones || '',
            empresa: item.cliente_razon_social || item.proveedor || item.cliente || 'S/N',
            referencia: item.numero || 'S/R',
            tipo: finalType,
            isForecast: false
        })

        if (!item.es_recurrente || item.frecuencia === 'unico') {
            return occurrences
        }

        // Projections
        const limitDate = item.fecha_limite_recurrencia ? parseISO(item.fecha_limite_recurrencia) : addYears(baseDate, 1)
        let checkDate = baseDate

        // Advance to next occurrence
        const advanceDate = (d: Date) => {
            if (item.frecuencia === 'semanal') return addWeeks(d, 1)
            if (item.frecuencia === 'quincenal') return addWeeks(d, 2)
            if (item.frecuencia === 'mensual') return addMonths(d, 1)
            if (item.frecuencia === 'bimestral') return addMonths(d, 2)
            if (item.frecuencia === 'trimestral') return addMonths(d, 3)
            if (item.frecuencia === 'semestral') return addMonths(d, 6)
            if (item.frecuencia === 'anual') return addYears(d, 1)
            return d
        }

        checkDate = advanceDate(checkDate)

        while (isBefore(checkDate, limitDate) || isSameDay(checkDate, limitDate)) {
            if (isAfter(checkDate, subMonths(rangeStart, 1)) && isBefore(checkDate, addMonths(rangeEnd, 1))) {
                occurrences.push({
                    id: `${item.id}-${checkDate.getTime()}`,
                    baseId: item.id,
                    fecha: format(checkDate, 'yyyy-MM-dd'),
                    total: item.total || 0,
                    descripcion: item.descripcion || 'Recurrente',
                    empresa: item.cliente_razon_social || item.proveedor || item.cliente || 'S/N',
                    referencia: item.numero || 'S/R',
                    es_recurrente: true,
                    frecuencia: item.frecuencia,
                    tipo: finalType,
                    isForecast: true
                })
            }
            checkDate = advanceDate(checkDate)
            if (item.frecuencia === 'unico') break
        }

        return occurrences
    }

    const allTransactions = useMemo(() => {
        const trans: Transaction[] = []

        // Invoices
        invoices.forEach(inv => {
            const occs = getOccurrences(inv, 'ingreso_pendiente', calendarStart, calendarEnd)
            trans.push(...occs)
        })

        // Expenses
        expenses.forEach(exp => {
            const occs = getOccurrences(exp, 'gasto', calendarStart, calendarEnd)
            trans.push(...occs)
        })

        // Budgets
        budgets.forEach(bud => {
            const occs = getOccurrences(bud, 'presupuesto', calendarStart, calendarEnd)
            trans.push(...occs)
        })

        // Delivery Notes
        deliveryNotes.forEach(dn => {
            const occs = getOccurrences(dn, 'albaran', calendarStart, calendarEnd)
            trans.push(...occs)
        })

        return trans
    }, [invoices, expenses, budgets, deliveryNotes, calendarStart, calendarEnd])

    const getDayData = (day: Date) => {
        const dayStr = format(day, 'yyyy-MM-dd')
        const dayTrans = allTransactions.filter(t => t.fecha === dayStr)
        const incomePaid = dayTrans.filter(t => t.tipo === 'ingreso_pagado').reduce((acc, t) => acc + t.total, 0)
        const incomePending = dayTrans.filter(t => t.tipo === 'ingreso_pendiente').reduce((acc, t) => acc + t.total, 0)
        const expense = dayTrans.filter(t => t.tipo === 'gasto').reduce((acc, t) => acc + t.total, 0)
        return { incomePaid, incomePending, expense, transactions: dayTrans }
    }

    const projectedRecurring = useMemo(() => {
        const today = new Date()
        const todayStr = format(today, 'yyyy-MM-dd')
        
        // Find recurring items that occur today or later in this month
        return allTransactions.filter(t => t.es_recurrente && (t.fecha === todayStr || isAfter(parseISO(t.fecha), today)) && isSameMonth(parseISO(t.fecha), today))
            .sort((a, b) => a.fecha.localeCompare(b.fecha))
            .slice(0, 5)
    }, [allTransactions])

    return (
        <Card className="p-6 border-slate-200 shadow-xl shadow-slate-200/20 bg-white overflow-hidden">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
                        <CalendarIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Sincronización Financiera ERP</h3>
                        <p className="text-xs font-bold text-slate-400 mt-0.5 uppercase tracking-wider">Reflejo en Tiempo Real</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-xl hover:bg-white hover:shadow-sm text-slate-600"
                        onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-black px-4 min-w-[140px] text-center uppercase tracking-tighter text-slate-700">
                        {format(currentDate, 'MMMM yyyy', { locale: es })}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-xl hover:bg-white hover:shadow-sm text-slate-600"
                        onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Main Calendar - Compacted */}
                <div className="flex-1">
                    <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map(day => (
                            <div key={day} className="bg-slate-50 py-2 text-center border-b border-slate-200">
                                <span className="text-[9px] font-black text-slate-400 tracking-[0.2em]">{day}</span>
                            </div>
                        ))}

                        {days.map((day, i) => {
                            const { transactions } = getDayData(day)
                            const isToday = isSameDay(day, new Date())
                            const isCurrentMonth = isSameMonth(day, monthStart)

                            return (
                                <div
                                    key={day.toString()}
                                    className={cn(
                                        "min-h-[110px] p-1.5 bg-white flex flex-col gap-1 transition-all group hover:z-10 relative",
                                        !isCurrentMonth && "bg-slate-50/30 grayscale-[0.8] opacity-40",
                                        isToday && "bg-indigo-50/30 ring-1 ring-inset ring-indigo-500 shadow-sm"
                                    )}
                                >
                                    <span className={cn(
                                        "text-[10px] font-black mb-1 p-1 w-6 h-6 flex items-center justify-center rounded-md",
                                        isToday ? "bg-indigo-600 text-white" : "text-slate-400"
                                    )}>
                                        {format(day, 'd')}
                                    </span>

                                    <div className="flex-1 space-y-1 overflow-y-auto max-h-[75px] custom-scrollbar scrollbar-hide">
                                        {transactions.map((t) => (
                                            <TooltipProvider key={t.id}>
                                                <Tooltip delayDuration={0}>
                                                    <TooltipTrigger asChild>
                                                        <div 
                                                            onClick={() => {
                                                                if (t.isForecast) {
                                                                    // Redirect to new item page with pre-filled data or open edit if base
                                                                    window.location.href = t.tipo === 'gasto' 
                                                                        ? `/gastos?template=${t.baseId}&date=${t.fecha}`
                                                                        : `/facturas?template=${t.baseId}&date=${t.fecha}`
                                                                } else {
                                                                    if (t.tipo === 'gasto') window.location.href = `/gastos?edit=${t.id}`
                                                                    else if (t.tipo === 'presupuesto') window.location.href = `/presupuestos?edit=${t.id}`
                                                                    else if (t.tipo === 'albaran') window.location.href = `/albaranes-firmados` // No edit page for delivery notes yet
                                                                    else window.location.href = `/facturas?edit=${t.id}`
                                                                }
                                                            }}
                                                            className={cn(
                                                            "text-[8px] font-bold px-1.5 py-1 rounded cursor-pointer flex flex-col gap-0.5 border shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-transform hover:scale-[1.02]",
                                                            t.tipo === 'ingreso_pagado' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                                            t.tipo === 'ingreso_pendiente' ? "bg-orange-50 text-orange-700 border-orange-100" :
                                                            t.tipo === 'gasto' ? "bg-rose-50 text-rose-700 border-rose-100" :
                                                            t.tipo === 'presupuesto' ? "bg-blue-50 text-blue-700 border-blue-100" :
                                                            "bg-amber-50 text-amber-700 border-amber-100",
                                                            t.isForecast && "border-dashed border-2 opacity-80"
                                                        )}>
                                                            <div className="flex justify-between items-center gap-1 overflow-hidden">
                                                                <span className="truncate flex-1 uppercase tracking-tighter font-black text-[9px]">
                                                                    {t.isForecast && "PREV. "}
                                                                    {t.tipo === 'gasto' 
                                                                        ? (t.descripcion || t.empresa || 'GASTO') 
                                                                        : t.tipo === 'presupuesto'
                                                                        ? (t.descripcion || t.empresa || 'PRESUPUESTO')
                                                                        : (t.empresa || t.descripcion || 'INGRESO')}
                                                                </span>
                                                                <span className="font-bold whitespace-nowrap opacity-90 text-[9px]">
                                                                    {t.total.toFixed(2)}€
                                                                </span>
                                                            </div>
                                                            {t.isForecast && (
                                                                <div className="flex items-center gap-1 opacity-70">
                                                                     <span className="text-[7px] italic font-medium">Previsión estimativa</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipPortal>
                                                        <TooltipContent 
                                                            side="top" 
                                                            className="bg-slate-950 text-white border border-white/10 rounded-2xl p-4 shadow-2xl z-[999] w-[260px] backdrop-blur-xl bg-opacity-90 animate-in fade-in zoom-in-95 duration-200"
                                                            sideOffset={8}
                                                        >
                                                            <div className="space-y-2">
                                                            <div className="flex items-center justify-between gap-4">
                                                                <span className={cn(
                                                                    "text-[9px] font-black uppercase tracking-widest",
                                                                    t.tipo === 'ingreso_pagado' ? "text-emerald-400" : 
                                                                    t.tipo === 'ingreso_pendiente' ? "text-orange-400" : 
                                                                    t.tipo === 'gasto' ? "text-rose-400" : 
                                                                    t.tipo === 'presupuesto' ? "text-blue-400" : "text-amber-400"
                                                                )}>
                                                                    {t.isForecast ? 'PREVISIÓN ' : ''}{t.tipo.replace('_', ' ').toUpperCase()}
                                                                </span>
                                                                <span className="text-sm font-black font-mono tracking-tighter text-white">
                                                                    {formatCurrency(t.total)}
                                                                </span>
                                                            </div>
                                                            <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-2" />
                                                            <div className="space-y-0.5">
                                                                <p className="text-[13px] font-black leading-tight text-white mb-1">{t.empresa && t.empresa !== 'S/N' ? t.empresa : (t.descripcion || 'Documento')}</p>
                                                                <p className="text-[10px] font-medium text-slate-400 flex items-center gap-1.5">
                                                                    <span className="opacity-50">Ref:</span> {t.referencia || 'N/A'}
                                                                </p>
                                                                <p className="text-[10px] font-medium text-slate-400 flex items-center gap-1.5">
                                                                    <span className="opacity-50">Fecha:</span> {format(parseISO(t.fecha), 'dd/MM/yyyy')}
                                                                </p>
                                                            </div>
                                                            {t.descripcion && t.empresa && t.empresa !== 'S/N' && (
                                                                <p className="text-[10px] italic text-slate-300 mt-2 leading-relaxed border-l border-white/30 pl-3 line-clamp-3 bg-white/5 p-2 rounded-lg">
                                                                    {t.descripcion}
                                                                </p>
                                                            )}
                                                            {t.isForecast && (
                                                                <div className="pt-3 border-t border-white/10 mt-3 flex items-center gap-2">
                                                                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                                                    <p className="text-[9px] text-indigo-300 font-black uppercase tracking-widest">Click para confirmar real</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                        </TooltipContent>
                                                    </TooltipPortal>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Sidebar Summary Index */}
                <div className="w-full lg:w-[320px] bg-slate-50 rounded-3xl border border-slate-200 p-5 flex flex-col shadow-inner">
                    <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-4">
                         <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md">
                            <Info className="h-4 w-4" />
                        </div>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Cierre de Mes Estimado</h4>
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-1 max-h-[500px]">
                        {days.filter(d => isSameMonth(d, monthStart)).map(day => {
                            const { transactions, incomePaid, incomePending, expense } = getDayData(day)
                            if (transactions.length === 0) return null

                            return (
                                <div key={day.toString()} className="group/item relative space-y-2 border-l-2 border-slate-200 hover:border-indigo-500 pl-4 py-1 transition-colors">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1.5">
                                            <div className="h-1 w-1 rounded-full bg-slate-300" />
                                            {format(day, 'EEEE dd', { locale: es })}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {transactions.map(t => (
                                            <div 
                                                key={t.id} 
                                                onClick={() => {
                                                    if (t.isForecast) {
                                                        window.location.href = t.tipo === 'gasto' ? `/gastos?template=${t.baseId}&date=${t.fecha}` : `/facturas?template=${t.baseId}&date=${t.fecha}`
                                                    } else {
                                                        if (t.tipo === 'gasto') window.location.href = `/gastos?edit=${t.id}`
                                                        else if (t.tipo === 'presupuesto') window.location.href = `/presupuestos?edit=${t.id}`
                                                        else window.location.href = `/facturas?edit=${t.id}`
                                                    }
                                                }}
                                                className="flex justify-between items-center text-[11px] font-bold text-slate-600 cursor-pointer hover:text-indigo-600 transition-colors p-1.5 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100"
                                            >
                                                <span className="truncate max-w-[160px] flex items-center gap-2">
                                                    <span className={cn(
                                                        "h-1.5 w-1.5 rounded-full shrink-0",
                                                        t.tipo.includes('ingreso') ? "bg-emerald-500" : 
                                                        t.tipo === 'presupuesto' ? "bg-blue-500" : "bg-rose-500"
                                                    )} />
                                                    {t.isForecast ? '📋 ' : ''}
                                                    {t.tipo === 'gasto' 
                                                        ? (t.descripcion || t.empresa) 
                                                        : t.tipo === 'presupuesto'
                                                        ? (t.descripcion || t.empresa || 'PRESUPUESTO')
                                                        : (t.empresa || t.descripcion)}
                                                </span>
                                                <span className="font-mono text-slate-900 shrink-0">{t.total.toFixed(2)}€</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                        {allTransactions.filter(t => isSameMonth(parseISO(t.fecha), monthStart)).length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full opacity-30 gap-2">
                                <CalendarIcon className="h-10 w-10" />
                                <p className="text-[10px] font-bold uppercase tracking-widest">Sin actividad</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-200 space-y-4 bg-white/50 p-4 rounded-2xl">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Ingresos</span>
                            <span className="text-sm font-black text-emerald-600">
                                {formatCurrency(allTransactions.filter(t => isSameMonth(parseISO(t.fecha), monthStart) && t.tipo.includes('ingreso')).reduce((acc, t) => acc + t.total, 0))}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Gastos</span>
                            <span className="text-sm font-black text-rose-600">
                                {formatCurrency(allTransactions.filter(t => isSameMonth(parseISO(t.fecha), monthStart) && t.tipo === 'gasto').reduce((acc, t) => acc + t.total, 0))}
                            </span>
                        </div>
                        <div className="h-px bg-slate-200 my-2" />
                        <div className="flex justify-between items-center pt-1">
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Saldo Previsto</span>
                            <span className={cn(
                                "text-sm font-bold",
                                (allTransactions.filter(t => isSameMonth(parseISO(t.fecha), monthStart) && t.tipo.includes('ingreso')).reduce((acc, t) => acc + t.total, 0) - 
                                 allTransactions.filter(t => isSameMonth(parseISO(t.fecha), monthStart) && t.tipo === 'gasto').reduce((acc, t) => acc + t.total, 0)) >= 0
                                ? "text-emerald-600" : "text-rose-600"
                            )}>
                                {formatCurrency(
                                    allTransactions.filter(t => isSameMonth(parseISO(t.fecha), monthStart) && t.tipo.includes('ingreso')).reduce((acc, t) => acc + t.total, 0) - 
                                    allTransactions.filter(t => isSameMonth(parseISO(t.fecha), monthStart) && t.tipo === 'gasto').reduce((acc, t) => acc + t.total, 0)
                                )}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Projections Panel - Styled as requested */}
            {projectedRecurring.length > 0 && (
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-4 animate-in slide-in-from-bottom duration-700">
                    <div className="lg:col-span-1 bg-slate-50 border border-slate-200 rounded-3xl p-5 shadow-inner">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Estimación Hoy/Próximos</h4>
                        </div>
                        <div className="space-y-3">
                            {projectedRecurring.map(t => (
                                <div key={t.id} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group flex flex-col">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[10px] font-black text-slate-400 font-mono">{format(parseISO(t.fecha), 'dd MMM', { locale: es })}</span>
                                        <span className={cn(
                                            "text-[10px] font-extrabold px-1.5 py-0.5 rounded",
                                            t.tipo.includes('ingreso') ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                        )}>
                                            {t.total.toFixed(2)}€
                                        </span>
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-700 truncate">{t.empresa}</span>
                                    <span className="text-[9px] text-slate-400 italic">Freq: {t.frecuencia}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="lg:col-span-3 bg-indigo-900/5 border border-indigo-100 rounded-3xl p-6 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest">Consejo de Tesorería</p>
                            <h5 className="text-lg font-black text-indigo-900">Mantén al día tus recurrencias</h5>
                            <p className="text-xs text-indigo-700 max-w-md">El ERP proyecta automáticamente tus gastos e ingresos configurados para que nunca te sorprendan los pagos mensuales.</p>
                        </div>
                        <div className="hidden md:block">
                            <Button variant="outline" className="rounded-full border-indigo-200 text-indigo-700 font-bold text-xs px-6">
                                Ver Analíticas Proyectadas
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-8 flex flex-wrap gap-5 items-center border-t border-slate-100 pt-6">
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Facturas Cobradas</span>
                </div>
                <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-2.5 py-1.5 rounded-lg border border-orange-100">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Facturas Pendientes</span>
                </div>
                <div className="flex items-center gap-2 text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-100">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Gastos / Compras</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 px-2.5 py-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500/50"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Otros (Pres./Alb.)</span>
                </div>
                <div className="ml-auto flex items-center gap-2 text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                    <Info className="h-3.5 w-3.5" />
                    <span className="text-[9px] font-bold italic tracking-tight uppercase">Sincronización Total Activa</span>
                </div>
            </div>
        </Card>
    )
}
