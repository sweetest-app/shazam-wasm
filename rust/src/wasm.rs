use crate::{recognize, ShazamError};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Signature {
    uri: String,
    samplems: u32,
}

#[wasm_bindgen]
impl Signature {
    #[wasm_bindgen(getter)]
    pub fn uri(&self) -> String {
        self.uri.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn samplems(&self) -> u32 {
        self.samplems
    }
}

#[wasm_bindgen]
pub fn recognize_bytes(bytes: &[u8], seconds: Option<u32>) -> Result<Signature, JsValue> {
    recognize(bytes, seconds)
        .map(|signature| Signature {
            uri: signature.uri,
            samplems: signature.samplems,
        })
        .map_err(|error| error_to_js(&error))
}

fn error_to_js(error: &ShazamError) -> JsValue {
    let object = js_sys::Object::new();
    let _ = js_sys::Reflect::set(
        &object,
        &JsValue::from_str("code"),
        &JsValue::from_str(error.code()),
    );
    let _ = js_sys::Reflect::set(
        &object,
        &JsValue::from_str("message"),
        &JsValue::from_str(&error.to_string()),
    );
    object.into()
}
