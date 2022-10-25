import { HTMLAttributes, useEffect, useRef, useState } from 'react';
import { fileSize } from './fileSize';
import { getImage } from './getImage';

interface Props extends HTMLAttributes<HTMLCanvasElement> {
  layers: string[];
}

export function Canvas({ layers, ...restProps }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [size, setSize] = useState('');
  const [objectUrl, setObjectURL] = useState('');

  useEffect(() => {
    if (!canvasRef.current) return;

    const context2D = canvasRef.current.getContext('2d');

    if (!context2D) return;

    const libre = new FontFace(
      'Libre-Franklin',
      'url(https://fonts.gstatic.com/s/librefranklin/v13/jizOREVItHgc8qDIbSTKq4XkRg8T88bjFuXOnduh8MKkANDJ.woff2) format("woff2")',
      {
        style: 'normal',
        weight: '600',
        stretch: 'normal',
      }
    );

    const drawImageLayers = async () => {
      const font = await libre.load();

      document.fonts.add(font);

      context2D.font = '42px Libre-Franklin';

      const imagesFromLayers = await Promise.all(layers.map((src) => getImage(src)));

      imagesFromLayers.forEach((image) => {
        if (!image) return;

        context2D.drawImage(image, 0, 0, 400, 400);
      });

      canvasRef.current?.toBlob((blob) => {
        if (!blob) return;

        setSize(fileSize(blob.size));

        setObjectURL(URL.createObjectURL(blob));
      });
    };

    drawImageLayers();
  }, [layers]);

  return (
    <div>
      <canvas width="400" height="400" ref={canvasRef} {...restProps} />
      {objectUrl && (
        <div>
          <a href={objectUrl} download="linkedin_profile-badge.png">
            Download
          </a>{' '}
          (png{size && `, ${size}`})
        </div>
      )}
    </div>
  );
}
