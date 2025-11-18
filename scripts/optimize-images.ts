import sharp from 'sharp'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * Script para optimizar imágenes hero
 * Convierte PNG grandes a WebP y AVIF con múltiples tamaños responsive
 */

interface ImageToOptimize {
  input: string
  outputBaseName: string
}

const images: ImageToOptimize[] = [
  { input: 'login-hero.png', outputBaseName: 'login-hero' },
  { input: 'login-hero2.png', outputBaseName: 'login-hero2' },
]

// Tamaños responsive para generar
const responsiveSizes = [640, 750, 828, 1080, 1200, 1920]

async function optimizeImage(inputPath: string, outputBaseName: string) {
  const publicDir = path.join(process.cwd(), 'public')
  const input = path.join(publicDir, inputPath)

  console.log(`\n📸 Optimizando: ${inputPath}`)

  // Verificar que el archivo existe
  try {
    await fs.access(input)
  } catch {
    console.log(`⚠️  Archivo no encontrado: ${inputPath} - Saltando...`)
    return
  }

  // Obtener información del archivo original
  const stats = await fs.stat(input)
  const originalSizeMB = (stats.size / 1024 / 1024).toFixed(2)
  console.log(`   Original: ${originalSizeMB}MB`)

  // Generar WebP principal (1920x1080)
  const webpPath = path.join(publicDir, `${outputBaseName}.webp`)
  await sharp(input)
    .resize(1920, 1080, { fit: 'cover', position: 'center' })
    .webp({ quality: 85, effort: 6 })
    .toFile(webpPath)

  const webpStats = await fs.stat(webpPath)
  const webpSizeKB = (webpStats.size / 1024).toFixed(0)
  console.log(`   ✅ WebP: ${webpSizeKB}KB (${((webpStats.size / stats.size) * 100).toFixed(0)}% del original)`)

  // Generar AVIF principal (mejor compresión)
  const avifPath = path.join(publicDir, `${outputBaseName}.avif`)
  await sharp(input)
    .resize(1920, 1080, { fit: 'cover', position: 'center' })
    .avif({ quality: 75, effort: 6 })
    .toFile(avifPath)

  const avifStats = await fs.stat(avifPath)
  const avifSizeKB = (avifStats.size / 1024).toFixed(0)
  console.log(`   ✅ AVIF: ${avifSizeKB}KB (${((avifStats.size / stats.size) * 100).toFixed(0)}% del original)`)

  // Generar versiones responsive en WebP
  console.log(`   📐 Generando versiones responsive...`)
  for (const size of responsiveSizes) {
    const responsivePath = path.join(publicDir, `${outputBaseName}-${size}w.webp`)
    await sharp(input)
      .resize(size, null, { fit: 'inside' })
      .webp({ quality: 85 })
      .toFile(responsivePath)
  }
  console.log(`   ✅ ${responsiveSizes.length} versiones responsive generadas`)

  // Generar placeholder blur (muy pequeño)
  const placeholderPath = path.join(publicDir, `${outputBaseName}-placeholder.webp`)
  await sharp(input)
    .resize(20, null, { fit: 'inside' })
    .webp({ quality: 20 })
    .toFile(placeholderPath)

  const placeholderStats = await fs.stat(placeholderPath)
  const placeholderSizeBytes = placeholderStats.size
  console.log(`   ✅ Placeholder: ${placeholderSizeBytes} bytes`)

  // Generar data URL para placeholder
  const placeholderBuffer = await fs.readFile(placeholderPath)
  const base64 = placeholderBuffer.toString('base64')
  const dataUrl = `data:image/webp;base64,${base64}`

  // Guardar data URL en archivo
  const dataUrlPath = path.join(publicDir, `${outputBaseName}-placeholder.txt`)
  await fs.writeFile(dataUrlPath, dataUrl)
  console.log(`   ✅ Data URL guardado en: ${outputBaseName}-placeholder.txt`)
}

async function main() {
  console.log('🎨 OPTIMIZACIÓN DE IMÁGENES HERO\n')
  console.log('Formatos: WebP (principal), AVIF (mejor compresión)')
  console.log(`Tamaños responsive: ${responsiveSizes.join(', ')}px\n`)

  for (const { input, outputBaseName } of images) {
    try {
      await optimizeImage(input, outputBaseName)
    } catch (error) {
      console.error(`❌ Error optimizando ${input}:`, error)
    }
  }

  console.log('\n✨ Optimización completada!\n')
  console.log('📝 Próximos pasos:')
  console.log('   1. Actualizar componentes para usar .webp en lugar de .png')
  console.log('   2. Añadir placeholder blur usando los archivos .txt generados')
  console.log('   3. Configurar Next.js Image con formats: ["image/avif", "image/webp"]')
}

main().catch(console.error)
