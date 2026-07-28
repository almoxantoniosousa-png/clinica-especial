// Converte um buffer de imagem (baixado via fetch) pra data URL, formato
// que o jsPDF exige pra inserir imagem.
export function bufferParaDataUrl(buffer: ArrayBuffer, mime: string): string {
  let binario = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binario += String.fromCharCode(bytes[i]);
  return `data:${mime};base64,${btoa(binario)}`;
}

export async function logoComoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch("/logo.png");
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    return bufferParaDataUrl(buffer, "image/png");
  } catch {
    return null;
  }
}
