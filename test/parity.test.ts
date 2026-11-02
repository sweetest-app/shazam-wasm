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

test('every non-Opus fixture matches the native oracle', async () => {
  const mismatches: string[] = []
  let compared = 0
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
    compared += 1
    if (native.uri !== wasm.uri || native.samplems !== wasm.samplems) {
      mismatches.push(`${name}: native ${native.uri.length} chars, wasm ${wasm.uri.length} chars`)
    }
  }

  expect({ compared, opus, refused, mismatches }).toEqual({
    compared: 15,
    opus: 3,
    refused: 1,
    mismatches: [],
  })
})
