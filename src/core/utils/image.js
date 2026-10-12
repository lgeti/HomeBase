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
