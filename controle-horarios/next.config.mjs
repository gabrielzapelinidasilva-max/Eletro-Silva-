import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Este app fica numa subpasta do repositório do site; a raiz dele é esta pasta.
  outputFileTracingRoot: raiz,
};
export default nextConfig;
