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
    es_recurrente?: boolean
    frecuencia?: 'unico' | 'semanal' | 'mensual' | 'anual'
    tipo: 'ingreso' | 'gasto'
    documento?: string
}

interface CalendarFinancialViewProps {
    invoices: any[]
    expenses: any[]
}

export function CalendarFinancialView({ invoices, expenses }: CalendarFinancialViewProps) {
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
    const getOccurrences = (item: any, type: 'ingreso' | 'gasto', rangeStart: Date, rangeEnd: Date) => {
        const occurrences: Transaction[] = []
        const startDate = parseISO(item.fecha)

        // If not recurring, just check if it's in the current month-ish view
        if (!item.es_recurrente || item.frecuencia === 'unico') {
            if (isAfter(startDate, subMonths(rangeStart, 1)) && isBefore(startDate, addMonths(rangeEnd, 1))) {
                occurrences.push({
                    id: item.id,
                    fecha: item.fecha,
                    total: item.total,
                    descripcion: item.descripcion || item.cliente_razon_social || 'Documento',
                    tipo: type,
                    documento: item.numero
                })
            }
            return occurrences
        }

        // For recurring items, project them up to a reasonable future (e.g. 2 years)
        const limitDate = addYears(startDate, 2)
        let checkDate = startDate

        while (isBefore(checkDate, limitDate)) {
            if (isAfter(checkDate, subMonths(rangeStart, 1)) && isBefore(checkDate, addMonths(rangeEnd, 1))) {
                occurrences.push({
                    id: `${item.id}-${checkDate.getTime()}`,
                    fecha: checkDate.toISOString(),
                    total: item.total,
                    descripcion: item.descripcion || item.cliente_razon_social || 'Recurrente',
                    es_recurrente: true,
                    frecuencia: item.frecuencia,
                    tipo: type,
                    documento: item.numero
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

        // Invoices (only if paid for current, or all if projected? User said show income ONLY when paid)
        // For forecast, maybe we should show paid ones on payment date.
        invoices.forEach(inv => {
            // "Muestra los ingresos en el calendario única y exclusivamente cuando la factura cambie su estado a Pagada"
            if (inv.statuses?.includes('pagada') && inv.fecha_pago) {
                trans.push({
                    id: inv.id,
                    fecha: inv.fecha_pago,
                    total: inv.total,
                    descripcion: inv.cliente_razon_social,
                    tipo: 'ingreso',
                    documento: inv.numero
                })
            }
        })

        // Expenses
        expenses.forEach(exp => {
            const occs = getOccurrences(exp, 'gasto', calendarStart, calendarEnd)
            trans.push(...occs)
        })

        return trans
    }, [invoices, expenses, calendarStart, calendarEnd])

    const getDayData = (day: Date) => {
        const dayTrans = allTransactions.filter(t => isSameDay(parseISO(t.fecha), day))
        const income = dayTrans.filter(t => t.tipo === 'ingreso').reduce((acc, t) => acc + t.total, 0)
        const expense = dayTrans.filter(t => t.tipo === 'gasto').reduce((acc, t) => acc + t.total, 0)
        return { income, expense, transactions: dayTrans }
    }

    return (
        <Card className="p-6 border-slate-200 shadow-xl shadow-slate-200/20 bg-white overflow-hidden">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
                        <CalendarIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Previsión de Tesorería</h3>
                        <p className="text-xs font-bold text-slate-400 mt-0.5 uppercase tracking-wider">Calendario Interactivo</p>
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
                    const { income, expense, transactions } = getDayData(day)
                    const isToday = isSameDay(day, new Date())
                    const isCurrentMonth = isSameMonth(day, monthStart)

                    return (
                        <div
                            key={day.toString()}
                            className={cn(
                                "min-h-[120px] p-2 bg-white flex flex-col gap-1 transition-all group hover:z-10 relative",
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

                            <div className="flex-1 space-y-1.5 overflow-hidden">
                                {income > 0 && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg py-1.5 px-2 flex items-center justify-between animate-in fade-in zoom-in duration-300">
                                                    <TrendingUp className="h-3 w-3 shrink-0" />
                                                    <span className="text-[10px] font-black font-mono">+{formatCurrency(income)}</span>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-slate-900 text-white border-0 rounded-xl p-3 shadow-2xl">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-2">Ingresos del día</p>
                                                <div className="space-y-2">
                                                    {transactions.filter(t => t.tipo === 'ingreso').map(t => (
                                                        <div key={t.id} className="flex justify-between items-center gap-4 border-t border-white/10 pt-1">
                                                            <span className="text-[10px] font-medium opacity-80">{t.descripcion}</span>
                                                            <span className="text-[10px] font-bold font-mono">+{formatCurrency(t.total)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}

                                {expense > 0 && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="bg-rose-50 text-rose-700 border border-rose-100 rounded-lg py-1.5 px-2 flex items-center justify-between animate-in fade-in zoom-in duration-300">
                                                    <TrendingDown className="h-3 w-3 shrink-0" />
                                                    <span className="text-[10px] font-black font-mono">-{formatCurrency(expense)}</span>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-slate-900 text-white border-0 rounded-xl p-3 shadow-2xl">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400 mb-2">Gastos del día</p>
                                                <div className="space-y-2">
                                                    {transactions.filter(t => t.tipo === 'gasto').map(t => (
                                                        <div key={t.id} className="flex justify-between items-center gap-4 border-t border-white/10 pt-1">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-medium opacity-80">{t.descripcion}</span>
                                                                {t.es_recurrente && (
                                                                    <span className="text-[8px] font-bold uppercase text-rose-400 tracking-tighter">● Recurrente ({t.frecuencia})</span>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] font-bold font-mono">-{formatCurrency(t.total)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="mt-8 flex flex-wrap gap-6 items-center border-t border-slate-100 pt-6">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ingresos Pagados</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]"></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gastos Directos / Recurrentes</span>
                </div>
                <div className="ml-auto flex items-center gap-2 text-slate-400">
                    <Info className="h-4 w-4" />
                    <span className="text-[10px] font-bold italic tracking-tight">Pasa el cursor sobre los indicadores para ver detalles</span>
                </div>
            </div>
        </Card>
    )
}
