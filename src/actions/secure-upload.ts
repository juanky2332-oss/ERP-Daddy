'use server'

import { createClient } from '@/lib/supabase/server'
import { processDocumentWithOCR } from '@/actions/ocr'
import { storeDocumentEmbedding } from '@/lib/ai/embeddings'
import { revalidatePath } from 'next/cache'
import { getNextSequenceNumber } from '@/lib/sequences'


export async function processExpense(formData: FormData) {
    const supabase = await createClient()
    const file = formData.get('file') as File

    if (!file) {
        return { success: false, error: 'No se recibió ningún archivo' }
    }

    try {
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const filename = `expense_${Date.now()}_${sanitizedName}`

        // 1. Upload to Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('gastos')
            .upload(filename, file)

        if (uploadError) {
            return { success: false, error: `Error subiendo archivo: ${uploadError.message}` }
        }

        const { data: { publicUrl } } = supabase.storage
            .from('gastos')
            .getPublicUrl(filename)

        // 2. OCR
        const ocrResult = await processDocumentWithOCR(publicUrl)
        if (!ocrResult.success) {
            return { success: false, error: `Error OCR: ${ocrResult.error}` }
        }

        const ocrData = ocrResult.data || {}

        // 3. AI Embedding
        try {
            const documentText = ocrResult.text || ocrData.descripcion || ocrData.concepto || 'gasto sin texto';
            await storeDocumentEmbedding(documentText, {
                filename: filename,
                type: 'gasto',
                publicUrl: publicUrl,
                ...ocrData
            });
        } catch (embedError) {
            console.error('--- ERROR GENERATING EMBEDDING ---', embedError);
        }

        // 4. Create DB Entry
        const seqNumero = await getNextSequenceNumber('gasto', supabase)
        const documentNumber = ocrData.numero || 'S/N'
        const combinedNumero = `${seqNumero} / ${documentNumber}`

        const payload = {
            numero: combinedNumero,
            fecha: ocrData.fecha || new Date().toISOString(),
            proveedor: ocrData.proveedor || 'Proveedor Desconocido',
            proveedor_cif: ocrData.proveedor_cif || '',
            descripcion: ocrData.concepto || ocrData.descripcion || 'Gasto importado',
            base_imponible: Number(ocrData.base_imponible) || 0,
            iva_importe: Number(ocrData.iva_importe) || 0,
            iva_porcentaje: Number(ocrData.iva_porcentaje) || 21,
            total: (Number(ocrData.total) || 0) === 0 && (Number(ocrData.base_imponible) || 0) > 0
                ? (Number(ocrData.base_imponible) || 0) + (Number(ocrData.iva_importe) || 0)
                : (Number(ocrData.total) || 0),
            factura_url: publicUrl,
            referencia: ocrData.numero_pedido_ref || ''
        }

        const { error: dbError } = await supabase
            .from('gastos')
            .insert(payload)

        if (dbError) {
            return { success: false, error: `Error guardando gasto: ${dbError.message}` }
        }

        revalidatePath('/gastos')
        return { success: true }

    } catch (e: any) {
        console.error('Process Expense Error:', e)
        return { success: false, error: e.message }
    }
}

export async function uploadSignedAlbaranAction(formData: FormData) {
    const supabase = await createClient()
    const file = formData.get('file') as File

    if (!file) {
        return { success: false, error: 'No se recibió ningún archivo' }
    }

    try {
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const filename = `signed_albaran_${Date.now()}_${sanitizedName}`

        // 1. Upload to Storage (albaranes bucket)
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('albaranes_firmados') // Adjust bucket name if necessary
            .upload(filename, file)

        if (uploadError) {
            return { success: false, error: `Error subiendo archivo: ${uploadError.message}` }
        }

        const { data: { publicUrl } } = supabase.storage
            .from('albaranes_firmados')
            .getPublicUrl(filename)

        // 2. OCR to extract data if possible
        const ocrResult = await processDocumentWithOCR(publicUrl)
        const ocrData = ocrResult.success ? ocrResult.data : {}

        // 3. Update or Create DB Entry
        // Search for existing albaran by number if found in OCR
        const docNumber = ocrData?.numero || 'S/N'
        
        // We match it with existing albaranes if possible, or just create a new record in albaranes table
        // marked as FIRMADO.
        const payload = {
            numero: docNumber,
            fecha: ocrData?.fecha || new Date().toISOString(),
            cliente_razon_social: ocrData?.cliente || ocrData?.proveedor || 'Cliente Desconocido',
            descripcion: ocrData?.concepto || ocrData?.descripcion || 'Albarán firmado importado',
            total: Number(ocrData?.total) || 0,
            documento_firmado_url: publicUrl,
            estado: 'firmado',
            statuses: ['firmado']
        }

        const { error: dbError } = await supabase
            .from('albaranes')
            .insert(payload)

        if (dbError) {
            return { success: false, error: `Error guardando albarán: ${dbError.message}` }
        }

        revalidatePath('/albaranes-firmados')
        return { success: true }

    } catch (e: any) {
        console.error('Upload Signed Albaran Error:', e)
        return { success: false, error: e.message }
    }
}
