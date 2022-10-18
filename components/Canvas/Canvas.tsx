import { HTMLAttributes, MouseEvent, useEffect, useRef, useState } from 'react';
import { getImage } from './getImage';

interface Props extends HTMLAttributes<HTMLCanvasElement> {
  layers: string[];
}

export function Canvas({ layers, ...restProps }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [objectUrl, setObjectURL] = useState('');

  useEffect(() => {
    if (!canvasRef.current) return;

    const context2D = canvasRef.current.getContext('2d');

    if (!context2D) return;

    const drawImageLayers = async () => {
      const imagesFromLayers = await Promise.all(layers.map((src) => getImage(src)));

      imagesFromLayers.forEach((image, index) => {
        if (!image) return;

        context2D.drawImage(image, 0, 0, 400, 400);
      });

      canvasRef.current?.toBlob((blob) => {
        if (!blob) return;

        setObjectURL(URL.createObjectURL(blob));
      });
    };

    drawImageLayers();
  }, [layers]);

  return (
    <div>
      <canvas width="400" height="400" ref={canvasRef} {...restProps} />
      {objectUrl && (
        <a href={objectUrl} download="image.png">
          Download
        </a>
      )}
    </div>
  );
}
