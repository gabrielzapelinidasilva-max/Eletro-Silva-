import { wa } from "@/lib/site";

export default function WhatsAppButton({
  texto,
  children,
  variante = "whats",
}: {
  texto: string;
  children: React.ReactNode;
  variante?: "whats" | "primario" | "secundario";
}) {
  return (
    <a className={`btn btn-${variante}`} href={wa(texto)} target="_blank" rel="noopener">
      {children}
    </a>
  );
}
