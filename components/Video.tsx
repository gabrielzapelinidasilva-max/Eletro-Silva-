export default function Video({ src, titulo }: { src: string; titulo: string }) {
  if (!src) {
    return (
      <div className="video video-vazio" role="img" aria-label={`${titulo} (em breve)`}>
        <p>{titulo}: vídeo em breve</p>
      </div>
    );
  }
  if (/\.(mp4|webm)(\?|$)/i.test(src)) {
    return <video className="video" src={src} controls preload="metadata" playsInline title={titulo} />;
  }
  return (
    <div className="video">
      <iframe
        src={src}
        title={titulo}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
