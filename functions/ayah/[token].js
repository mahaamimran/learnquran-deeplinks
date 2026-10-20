
import { renderPreview } from "../_lib/preview.js";

export function onRequest(context) {
  return renderPreview(context, "ayah");
}
