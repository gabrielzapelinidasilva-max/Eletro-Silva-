import type { Metadata } from "next";
import { TelaModelos } from "./TelaModelos";

export const metadata: Metadata = { title: "Modelos" };

export default function Modelos() {
  return <TelaModelos />;
}
