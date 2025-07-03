// TASK: zip
// Run this task with:
// forge task:run bundle:zip --dir .builds/ --input dailyUpdate.js --output dailyUpdate.zip

import { createTask } from '@forgehive/task'
import { Schema } from '@forgehive/schema'
import archiver from 'archiver'
import fs from 'fs'
import path from 'path'

const description = 'Zip a bundle file for distribution'

const schema = new Schema({
  dir: Schema.string(),
  input: Schema.string(),
  output: Schema.string()
})

const boundaries = {
  createWriteStream: async (outputPath: string): Promise<fs.WriteStream> => {
    return fs.createWriteStream(outputPath)
  },
  createArchiver: async (format: 'zip', options: { zlib: { level: number } }): Promise<archiver.Archiver> => {
    return archiver(format, options)
  },
  resolvePathDir: async (dir: string, filename: string): Promise<string> => {
    return path.resolve(dir, filename)
  },
  fileExists: async (filePath: string): Promise<boolean> => {
    try {
      await fs.promises.access(filePath)
      return true
    } catch {
      return false
    }
  }
}

export const bytesToMB = (bytes: number): string => {
  const MB = bytes / (1024 * 1024)
  return `${MB.toFixed(2)} MB`
}

export const zip = createTask({
  schema,
  boundaries,
  fn: async function ({ dir, input, output }, { createWriteStream, createArchiver, resolvePathDir, fileExists }) {
    const outputPath = await resolvePathDir(dir, output)
    const inputPath = await resolvePathDir(dir, input)
    const inputMapPath = inputPath + '.map'

    // Check if input file exists
    const inputExists = await fileExists(inputPath)
    if (!inputExists) {
      throw new Error(`Input file does not exist: ${inputPath}`)
    }

    // Check if source map exists before creating Promise
    const mapExists = await fileExists(inputMapPath)

    // Handle async operations outside of Promise constructor
    const outStream = await createWriteStream(outputPath)
    const archive = await createArchiver('zip', {
      zlib: { level: 9 } // Sets the compression level
    })

    return new Promise((resolve, reject) => {
      archive.on('error', function (err: Error) {
        reject(err)
      })

      outStream.on('end', function () {
        console.log('Data has been drained')
      })

      outStream.on('close', function () {
        setTimeout(() => {
          resolve({
            output,
            outputPath,
            size: archive.pointer()
          })
        }, 100)
      })

      archive.on('warning', function (err: archiver.ArchiverError) {
        if (err.code === 'ENOENT') {
          console.warn('ENOENT', err)
        } else {
          reject(err)
        }
      })

      archive.pipe(outStream)

      // Add the main bundle file
      archive.file(inputPath, { name: 'index.js' })

      // Add source map if it exists
      if (mapExists) {
        archive.file(inputMapPath, { name: 'index.js.map' })
      }

      archive.finalize()
    })
  }
})

zip.setDescription(description)
