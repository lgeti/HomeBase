// Shrinks a photo before upload: phone photos are several MB, and a receipt reads fine at 1600 px.
// Returns { mimeType, data } with base64 JPEG data.
export const shrinkPhoto = async (file, maxSide = 1600, quality = 0.82) => {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('That file is not a photo this browser can open')
  })
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()

  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  return { mimeType: 'image/jpeg', data: dataUrl.slice(dataUrl.indexOf(',') + 1) }
}

const MAX_PDF_BYTES = 5 * 1024 * 1024

const readAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).slice(String(reader.result).indexOf(',') + 1))
    reader.onerror = () => reject(new Error('That file could not be opened'))
    reader.readAsDataURL(file)
  })

export const isPdf = (file) => file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '')

// A receipt ready to upload: a PDF as it is (digital receipts), a photo shrunk first
export const receiptUpload = async (file) => {
  if (!isPdf(file)) return shrinkPhoto(file)
  if (file.size > MAX_PDF_BYTES) throw new Error('That PDF is too large (at most 5 MB)')
  return { mimeType: 'application/pdf', data: await readAsBase64(file) }
}
