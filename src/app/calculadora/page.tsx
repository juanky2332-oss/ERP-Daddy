import { MaterialCalculator } from '@/components/calculator/material-calculator'

export const metadata = {
    title: 'Calculadora de Materiales - Flownexion',
    description: 'Calculadora técnica de pesos y costes para diferentes materiales y formatos.',
}

export default function CalculadoraPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-1 bg-blue-600 rounded-full" />
                    <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-[0.3em]">HERRAMIENTAS TÉCNICAS</span>
                </div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900">Calculadora de Materiales</h1>
                <p className="text-slate-500 font-medium">Calcula pesos, medidas y presupuestos dinámicos según el material (Inox, Hierro, Aluminio, etc).</p>
            </div>

            <div className="bg-white/50 backdrop-blur-sm rounded-3xl p-1 shadow-2xl shadow-blue-900/5 ring-1 ring-blue-50">
                <MaterialCalculator />
            </div>
        </div>
    )
}
