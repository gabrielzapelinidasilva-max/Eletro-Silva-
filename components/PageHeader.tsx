export default function PageHeader({ titulo, subtitulo }: { titulo: string; subtitulo?: string }) {
  return (
    <section className="page-header">
      <div className="container">
        <h1>{titulo}</h1>
        {subtitulo && <p>{subtitulo}</p>}
      </div>
    </section>
  );
}
