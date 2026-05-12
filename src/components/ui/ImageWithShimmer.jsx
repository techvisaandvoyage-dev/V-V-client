import { useEffect, useState } from 'react';

const loadedImageCache = new Set();

const ImageWithShimmer = ({ src, alt, className, children }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoaded(Boolean(src) && loadedImageCache.has(src));
    setError(false);
  }, [src]);

  return (
    <div className={`relative overflow-hidden bg-slate-200 ${className}`}>
      {(!loaded || !src || error) && (
        <div className="absolute inset-0 z-10 glass-shimmer" />
      )}

      {src && !error && (
        <img
          src={src}
          alt={alt || "Image"}
          onLoad={(event) => {
            loadedImageCache.add(src);
            if (event.currentTarget.complete) {
              setLoaded(true);
            }
          }}
          onError={() => setError(true)}
          ref={(node) => {
            if (!node || !src) return;
            if (node.complete && node.naturalWidth > 0) {
              loadedImageCache.add(src);
              setLoaded(true);
            }
          }}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}

      <div className={`absolute inset-0 z-20 pointer-events-none flex flex-col transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}>
        {children}
      </div>
    </div>
  );
};

export default ImageWithShimmer;
