/** 参考图加载：解码、EXIF 方向修正、尺寸限制与降采样 */

export interface LoadedImage {
  source: TexImageSource
  width: number
  height: number
  /** 原始文件名 */
  name: string
}

/** 最大边长：超出则降采样，控制显存占用 */
export const MAX_EDGE = 2400

/**
 * 加载图片文件
 * 优先用 createImageBitmap（更快且能处理 EXIF 方向），失败时回退到 img 元素
 */
export async function loadImageFile(file: File): Promise<LoadedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('请选择图片文件')
  }

  const bitmap = await decode(file)
  const { source, width, height } = await downscale(bitmap)
  return { source, width, height, name: file.name }
}

/** 解码为位图 */
async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      // imageOrientation: 'from-image' 让浏览器按 EXIF 旋转
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // 某些浏览器不支持 options，退回无参调用
      try {
        return await createImageBitmap(file)
      } catch {
        // 继续走 img 方案
      }
    }
  }
  return decodeViaImg(file)
}

/** 用 img 元素解码 */
function decodeViaImg(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片解码失败'))
    }
    img.src = url
  })
}

/** 降采样到最大边长以内 */
async function downscale(
  bitmap: ImageBitmap | HTMLImageElement,
): Promise<{ source: TexImageSource; width: number; height: number }> {
  const width = 'width' in bitmap ? bitmap.width : (bitmap as HTMLImageElement).naturalWidth
  const height = 'height' in bitmap ? bitmap.height : (bitmap as HTMLImageElement).naturalHeight
  const maxEdge = Math.max(width, height)

  if (maxEdge <= MAX_EDGE) {
    return { source: bitmap, width, height }
  }

  const scale = MAX_EDGE / maxEdge
  const w = Math.round(width * scale)
  const h = Math.round(height * scale)

  if (typeof createImageBitmap === 'function') {
    try {
      const resized = await createImageBitmap(bitmap, {
        resizeWidth: w,
        resizeHeight: h,
        resizeQuality: 'high',
      })
      return { source: resized, width: w, height: h }
    } catch {
      // 退回 canvas 方案
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return { source: bitmap, width, height }
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, w, h)
  return { source: canvas, width: w, height: h }
}

/** 从拖拽事件中提取图片文件 */
export function extractImageFile(dataTransfer: DataTransfer | null): File | null {
  if (!dataTransfer) return null
  if (dataTransfer.files.length > 0) {
    const file = dataTransfer.files[0]
    return file.type.startsWith('image/') ? file : null
  }
  // 拖拽的是系统文件时 items 才有值
  for (const item of dataTransfer.items) {
    if (item.kind === 'file') {
      const file = item.getAsFile()
      if (file && file.type.startsWith('image/')) return file
    }
  }
  return null
}

/** 从粘贴事件中提取图片文件 */
export function extractPastedImage(event: ClipboardEvent): File | null {
  const items = event.clipboardData?.items
  if (!items) return null
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) return file
    }
  }
  return null
}
