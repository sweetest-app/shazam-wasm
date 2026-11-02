import { beforeAll, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { initialize, recognizeBytes, ShazamError } from '../src/index'

const RUST = fileURLToPath(new URL('../rust/', import.meta.url))
const DATA = `${RUST}tests/data/`
const ORACLE = `${RUST}target/release/oracle`
const OPUS = new Set(['probe.opus', 'surround.opus', 'matroska.webm'])
const REFUSED = new Set(['ac3.mka'])
const EXACT = new Set([
  'ac3_then_flac.mka',
  'adpcm_ima.wav',
  'adpcm_ms.wav',
  'alac.m4a',
  'chained_capacity.ogg',
  'chord.flac',
  'mp2.mp2',
  'pcm_f32.wav',
  'pcm_s16.aiff',
  'pcm_s24.caf',
])
const KNOWN_DIFFERENT = new Set([
  'aac.aac',
  'probe.flac',
  'probe.m4a',
  'probe.mp3',
  'probe.ogg',
])

type Native = { uri: string; samplems: number }

const fixtures = readdirSync(DATA)
  .filter((name) => name !== 'generate.sh' && !name.endsWith('.uri'))
  .sort()

function nativeSignature(name: string): Native {
  return JSON.parse(execFileSync(ORACLE, [`${DATA}${name}`], { encoding: 'utf8' })) as Native
}

beforeAll(async () => {
  await initialize(new Uint8Array(readFileSync(`${RUST}pkg/shazam_wasm_bg.wasm`)))
})

test('every non-Opus fixture decodes with the native sample length', async () => {
  const unexpected: string[] = []
  const sampleDiffs: string[] = []
  let exact = 0
  let knownDifferent = 0
  let refused = 0
  let opus = 0

  for (const name of fixtures) {
    if (OPUS.has(name)) {
      await expect(recognizeBytes(new Uint8Array(readFileSync(`${DATA}${name}`)))).rejects.toBeInstanceOf(
        ShazamError,
      )
      opus += 1
      continue
    }

    if (REFUSED.has(name)) {
      expect(() => nativeSignature(name)).toThrow()
      await expect(recognizeBytes(new Uint8Array(readFileSync(`${DATA}${name}`)))).rejects.toMatchObject(
        { code: 'decode_failed' },
      )
      refused += 1
      continue
    }

    const native = nativeSignature(name)
    const wasm = await recognizeBytes(new Uint8Array(readFileSync(`${DATA}${name}`)))
    if (native.samplems !== wasm.samplems) sampleDiffs.push(name)

    if (EXACT.has(name)) {
      if (native.uri === wasm.uri) exact += 1
      else unexpected.push(`${name}: exact mismatch`)
    } else if (KNOWN_DIFFERENT.has(name)) {
      knownDifferent += 1
    } else {
      unexpected.push(`${name}: not in the exact or known-different set`)
    }
  }

  expect({ sampleDiffs, unexpected }).toEqual({ sampleDiffs: [], unexpected: [] })
  expect({ exact, knownDifferent, opus, refused }).toEqual({
    exact: 10,
    knownDifferent: 5,
    opus: 3,
    refused: 1,
  })
})
