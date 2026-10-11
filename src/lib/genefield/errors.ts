import { GeneFieldError } from "./client";
const messages: Record<string, string> = {
  PARENT_UNKNOWN: "Parent tidak ditemukan dalam data GeneField.",
  UNKNOWN_PARENT: "Parent tidak ditemukan dalam data GeneField.",
  PARENT_INELIGIBLE:
    "Parent belum memenuhi syarat untuk analisis trait yang dipilih.",
  INELIGIBLE_PARENT:
    "Parent belum memenuhi syarat untuk analisis trait yang dipilih.",
  GENOTYPE_UNAVAILABLE:
    "Data genetik parent belum tersedia untuk analisis model.",
  SELF_CROSS: "Pilih dua parent yang berbeda.",
  DTF_OBJECTIVE_REQUIRED:
    "Pilih prioritas Umur Berbunga: lebih cepat atau lebih lambat.",
  PARENT_MALFORMED: "Gunakan ID parent GeneField yang valid.",
  TRAIT_INVALID: "Pilih trait GY, DTF, NO, atau LB.",
  OBJECTIVE_INVALID: "Pilih arah prioritas yang didukung untuk trait tersebut.",
  WEIGHTS_INVALID:
    "Bobot setiap trait yang dipilih harus berupa angka positif.",
  IPC_TIMEOUT:
    "Analisis lokal melewati batas waktu. Periksa layanan atau mulai ulang secara terkontrol.",
};
export function analysisError(error: unknown): string {
  console.error("GeneField diagnostic", error);
  return error instanceof GeneFieldError && messages[error.code]
    ? messages[error.code]
    : "Layanan analisis lokal GeneField tidak dapat dimuat.";
}
