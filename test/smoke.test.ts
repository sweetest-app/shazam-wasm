import { beforeAll, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { initialize, recognizeBytes, ShazamError } from '../src/index'

const RUST = fileURLToPath(new URL('../rust/', import.meta.url))
const fixture = (name: string) => new Uint8Array(readFileSync(`${RUST}tests/data/${name}`))

beforeAll(async () => {
  await initialize(new Uint8Array(readFileSync(`${RUST}pkg/shazam_wasm_bg.wasm`)))
})

describe('shazam wasm', () => {
  test('returns a signature for FLAC', async () => {
    const signature = await recognizeBytes(fixture('chord.flac'))
    expect(signature.uri.startsWith('data:audio/vnd.shazam.sig;base64,')).toBe(true)
    expect(signature.samplems).toBe(8_000)
  })

  test('refuses Opus with a typed error', async () => {
    await expect(recognizeBytes(fixture('probe.opus'))).rejects.toMatchObject({
      name: 'ShazamError',
      code: 'unsupported_opus',
    })
  })

  test('refuses a zero segment with a typed error', async () => {
    await expect(recognizeBytes(fixture('probe.flac'), { seconds: 0 })).rejects.toMatchObject({
      code: 'invalid_segment',
    })
  })

  test('refuses bytes that are not audio', async () => {
    await expect(recognizeBytes(new Uint8Array([1, 2, 3, 4]))).rejects.toMatchObject({
      code: 'decode_failed',
    })
  })

  test('exposes ShazamError as the thrown class', async () => {
    try {
      await recognizeBytes(fixture('probe.opus'))
      throw new Error('expected a refusal')
    } catch (error) {
      expect(error).toBeInstanceOf(ShazamError)
    }
  })
})
