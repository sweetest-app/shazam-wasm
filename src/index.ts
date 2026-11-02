import init, {
  recognize_bytes,
  type InitInput,
  type Signature as WasmSignature,
} from '../rust/pkg/shazam_wasm.js'

export type ShazamErrorCode =
  | 'unsupported_opus'
  | 'invalid_segment'
  | 'decode_failed'
  | 'signature_failed'
  | 'init_failed'

export class ShazamError extends Error {
  readonly code: ShazamErrorCode

  constructor(code: ShazamErrorCode, message: string) {
    super(message)
    this.name = 'ShazamError'
    this.code = code
  }
}

export type Signature = {
  uri: string
  samplems: number
}

export type RecognizeOptions = {
  /** Seconds of audio to fingerprint. Defaults to the upstream 12 seconds. */
  seconds?: number
}

let ready: Promise<unknown> | null = null

/**
 * Load the WASM module. Call this once at startup, or let `recognizeBytes` do it
 * lazily. In a browser, no argument is needed. In Node or a test, pass the
 * `shazam_wasm_bg.wasm` bytes.
 */
export async function initialize(input?: InitInput): Promise<void> {
  if (!ready) {
    const options = input === undefined ? undefined : { module_or_path: input }
    ready = init(options).catch((error: unknown) => {
      ready = null
      throw new ShazamError('init_failed', messageOf(error))
    })
  }
  await ready
}

/**
 * Build a Shazam signature from an audio file's bytes.
 *
 * The returned URI is what the recognition Worker sends to Shazam. Opus is not
 * supported in this build because upstream decodes it through a C library.
 */
export async function recognizeBytes(
  bytes: Uint8Array,
  options: RecognizeOptions = {},
): Promise<Signature> {
  await initialize()

  let signature: WasmSignature | undefined
  try {
    signature = recognize_bytes(bytes, options.seconds)
    return { uri: signature.uri, samplems: signature.samplems }
  } catch (error) {
    throw toShazamError(error)
  } finally {
    signature?.free()
  }
}

function toShazamError(error: unknown): ShazamError {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof error.code === 'string' &&
    typeof error.message === 'string'
  ) {
    return new ShazamError(error.code as ShazamErrorCode, error.message)
  }
  return new ShazamError('decode_failed', messageOf(error))
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}
