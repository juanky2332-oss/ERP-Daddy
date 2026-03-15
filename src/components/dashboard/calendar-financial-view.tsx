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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface Transaction {
    id: string
    fecha: string
    total: number
    descripcion: string
    empresa: string
    referencia: string
    tipo: 'ingreso_pagado' | 'ingreso_pendiente' | 'gasto' | 'presupuesto' | 'albaran'
    es_recurrente?: boolean
    frecuencia?: 'unico' | 'semanal' | 'mensual' | 'anual'
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
        
        // Normalize the base date
        const baseDate = parseISO(dateStr)
        const datePart = format(baseDate, 'yyyy-MM-dd')

        // For Invoices, determine if paid
        let finalType = type
        if (type === 'ingreso_pendiente') {
            const isPaid = item.estado?.toUpperCase() === 'PAGADA' || 
                           item.estado?.toLowerCase() === 'pagada' || 
                           item.pagada === true || 
                           item.statuses?.some((s: string) => s.toLowerCase() === 'pagada')
            if (isPaid) finalType = 'ingreso_pagado'
        }

        // If not recurring, just check if it's in the current month-ish view
        if (!item.es_recurrente || item.frecuencia === 'unico') {
            occurrences.push({
                id: item.id,
                fecha: datePart, // Use only date part
                total: item.total || 0,
                descripcion: item.descripcion || item.observaciones || '',
                empresa: item.cliente_razon_social || item.proveedor || item.cliente || 'S/N',
                referencia: item.numero || 'S/R',
                tipo: finalType
            })
            return occurrences
        }

        // For recurring items
        const limitDate = addYears(baseDate, 1)
        let checkDate = baseDate

        while (isBefore(checkDate, limitDate)) {
            // Check if checkDate falls within the range roughly
            if (isAfter(checkDate, subMonths(rangeStart, 1)) && isBefore(checkDate, addMonths(rangeEnd, 1))) {
                occurrences.push({
                    id: `${item.id}-${checkDate.getTime()}`,
                    fecha: format(checkDate, 'yyyy-MM-dd'),
                    total: item.total || 0,
                    descripcion: item.descripcion || 'Recurrente',
                    empresa: item.cliente_razon_social || item.proveedor || item.cliente || 'S/N',
                    referencia: item.numero || 'S/R',
                    es_recurrente: true,
                    frecuencia: item.frecuencia,
                    tipo: finalType
                })
            }

            if (item.frecuencia === 'semanal') checkDate = addWeeks(checkDate, 1)
            else if (item.frecuencia === 'mensual') checkDate = addMonths(checkDate, 1)
            else if (item.frecuencia === 'anual') checkDate = addYears(checkDate, 1)
            else break
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

            <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-2xl overflow-hidden">
                {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map(day => (
                    <div key={day} className="bg-slate-50 py-3 text-center">
                        <span className="text-[10px] font-black text-slate-400 tracking-[0.2em]">{day}</span>
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
                                "min-h-[140px] p-2 bg-white flex flex-col gap-1 transition-all group hover:z-10 relative",
                                !isCurrentMonth && "bg-slate-50/50 grayscale-[0.5] opacity-50",
                                isToday && "ring-2 ring-inset ring-slate-900 shadow-lg"
                            )}
                        >
                            <span className={cn(
                                "text-xs font-black mb-1 p-1 w-7 h-7 flex items-center justify-center rounded-lg",
                                isToday ? "bg-slate-900 text-white" : "text-slate-400"
                            )}>
                                {format(day, 'd')}
                            </span>

                            <div className="flex-1 space-y-1 overflow-y-auto max-h-[85px] custom-scrollbar">
                                {transactions.map((t) => (
                                    <TooltipProvider key={t.id}>
                                        <Tooltip delayDuration={0}>
                                            <TooltipTrigger asChild>
                                                <div className={cn(
                                                    "text-[9px] font-bold px-1.5 py-0.5 rounded cursor-help flex items-center justify-between border shadow-[0_1px_2px_rgba(0,0,0,0.02)]",
                                                    t.tipo === 'ingreso_pagado' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                                    t.tipo === 'ingreso_pendiente' ? "bg-orange-50 text-orange-700 border-orange-100" :
                                                    t.tipo === 'gasto' ? "bg-rose-50 text-rose-700 border-rose-100" :
                                                    t.tipo === 'presupuesto' ? "bg-blue-50 text-blue-700 border-blue-100" :
                                                    "bg-amber-50 text-amber-700 border-amber-100"
                                                )}>
                                                    <span className="truncate max-w-[45px]">
                                                        {t.tipo === 'ingreso_pagado' ? 'Pagada' : 
                                                         t.tipo === 'ingreso_pendiente' ? 'Pendiente' : 
                                                         t.tipo === 'gasto' ? 'Gasto' : 
                                                         t.tipo === 'presupuesto' ? 'Presup.' : 'Alb.'}
                                                    </span>
                                                    <span className="font-mono">
                                                        {formatCurrency(t.total).split(',')[0]}€
                                                    </span>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="bg-slate-900 text-white border-0 rounded-xl p-3 shadow-2xl z-50 min-w-[200px]">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <span className={cn(
                                                            "text-[9px] font-black uppercase tracking-widest",
                                                            t.tipo === 'ingreso_pagado' ? "text-emerald-400" : 
                                                            t.tipo === 'ingreso_pendiente' ? "text-orange-400" : 
                                                            t.tipo === 'gasto' ? "text-rose-400" : 
                                                            t.tipo === 'presupuesto' ? "text-blue-400" : "text-amber-400"
                                                        )}>
                                                            {t.tipo.replace('_', ' ').toUpperCase()}
                                                        </span>
                                                        <span className="text-[11px] font-bold font-mono">
                                                            {formatCurrency(t.total)}
                                                        </span>
                                                    </div>
                                                    <div className="h-px bg-white/10 my-1.5" />
                                                    <div className="space-y-0.5">
                                                        <p className="text-[11px] font-black">{t.empresa}</p>
                                                        <p className="text-[10px] font-medium text-slate-400">Ref: {t.referencia}</p>
                                                    </div>
                                                    {t.descripcion && (
                                                        <p className="text-[10px] italic text-slate-500 mt-1 leading-normal border-l-2 border-white/10 pl-2">{t.descripcion}</p>
                                                    )}
                                                    {t.es_recurrente && (
                                                        <div className="flex items-center gap-2 mt-2 pt-1 border-t border-white/5">
                                                            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                                            <p className="text-[8px] font-bold text-primary uppercase tracking-tighter">Recurrente ({t.frecuencia})</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>

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
