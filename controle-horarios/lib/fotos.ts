// Fotos e assinaturas ficam no Storage privado "servicos", em <id do eletricista>/<id do registro>/...

export const BUCKET_SERVICOS = "servicos";
export const MAX_FOTOS = 6;

/** URL (só para o admin) que mostra um arquivo do Storage. */
export function urlArquivo(caminho: string): string {
  return `/admin/arquivo?p=${encodeURIComponent(caminho)}`;
}

/** O caminho pertence a este registro deste eletricista? */
export function caminhoValido(caminho: string, usuarioId: string, registroId: string): boolean {
  return caminho.startsWith(`${usuarioId}/${registroId}/`) && !caminho.includes("..") && caminho.length < 300;
}

/**
 * Reduz a foto no próprio celular antes de enviar (lado maior até 1600 px, JPEG),
 * para enviar rápido mesmo com internet fraca.
 */
export async function comprimirImagem(arquivo: File, ladoMax = 1600, qualidade = 0.8): Promise<Blob> {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = erro;
      i.src = url;
    });
    const escala = Math.min(1, ladoMax / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * escala);
    canvas.height = Math.round(img.height * escala);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((ok, erro) => canvas.toBlob((b) => (b ? ok(b) : erro(new Error("falha"))), "image/jpeg", qualidade));
  } finally {
    URL.revokeObjectURL(url);
  }
}
