import { HTMLAttributes, useEffect, useRef, useState } from 'react';
import { fileSize } from './fileSize';
import { getImage } from './getImage';
import { drawTagline, TAGLINE_FONT, TAGLINE_FONT_WEIGHT } from './drawTagline';

import styles from './Canvas.module.css';

const CANVAS_SIZE = 400;

interface Props extends HTMLAttributes<HTMLCanvasElement> {
  layers: string[];
  tagLine: string;
  fgColour: string;
}

export function Canvas({ layers, tagLine, fgColour, ...restProps }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [size, setSize] = useState('');
  const [objectUrl, setObjectURL] = useState('');

  useEffect(() => {
    if (!objectUrl) return;

    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const context2D = canvasRef.current.getContext('2d');

    if (!context2D) return;

    let cancelled = false;

    const drawImageLayers = async () => {
      // Libre Franklin is registered via the Google Fonts @import in globals.css; this makes sure it's loaded
      // before measuring/drawing, otherwise the canvas silently falls back to the default font.
      await document.fonts.load(`${TAGLINE_FONT_WEIGHT} 32px "${TAGLINE_FONT}"`);

      const imagesFromLayers = await Promise.all(layers.map((src) => getImage(src)));

      if (cancelled) return;

      context2D.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      imagesFromLayers.forEach((image) => {
        if (!image) return;

        context2D.drawImage(image, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      });

      drawTagline(context2D, `#${tagLine.toUpperCase()}`, fgColour, CANVAS_SIZE);

      canvasRef.current?.toBlob((blob) => {
        if (!blob || cancelled) return;

        setSize(fileSize(blob.size));
        setObjectURL(URL.createObjectURL(blob));
      });
    };

    drawImageLayers();

    return () => {
      cancelled = true;
    };
  }, [layers, tagLine, fgColour]);

  return (
    <div>
      <canvas
        className={styles.canvas}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        ref={canvasRef}
        {...restProps}
      />
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
