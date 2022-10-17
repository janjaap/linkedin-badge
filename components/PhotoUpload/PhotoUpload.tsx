import { FormEvent, MouseEvent, useEffect, useState } from 'react';

import type { ChangeEvent } from 'react';
import NextImage from 'next/image';

import styles from './PhotoUpload.module.css';
import textSvg from './text.svg';

const defaultColour = '#015FDB';
const defaultTagLine = '#FREELANCE';

export function PhotoUpload() {
  const [file, setFile] = useState<Blob>();
  const [size, setSize] = useState<number>();
  const [originaURL, setOriginalURL] = useState<string>();
  const [objectURL, setObjectURL] = useState<string>();
  const [arcColour, setArcColour] = useState<string>(defaultColour);
  const [tagLine, setTagLine] = useState<string>(defaultTagLine);

  useEffect(
    () => () => {
      if (!objectURL) return;

      URL.revokeObjectURL(objectURL);
    },
    [objectURL]
  );

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    if (!event.target.files) return;

    const photo = event.target.files.item(0);

    if (!photo) return;

    setFile(photo);
    setOriginalURL(URL.createObjectURL(photo));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();

    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);
    formData.append('arcColour', arcColour);
    formData.append('tagLine', tagLine);

    fetch('/api/photo', { method: 'POST', body: formData })
      .then((response) => response.blob())
      .then((blob) => {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(blob);

        img.onload = function onLoad() {
          const { width, src } = img;

          setSize(width);
          setObjectURL(src);
        };
      })
      .catch((err) => {
        console.error(err);
      });
  }

  return (
    <div className={styles['photo-upload']}>
      <h1>Linkedin profile badge generator</h1>

      <form action="" className={styles['photo-upload-form']} onSubmit={onSubmit}>
        <fieldset className={styles['photo-upload-form__fieldset']}>
          <label htmlFor="photo">Select a photo</label>
          <input id="photo" type="file" onChange={onChange} />
        </fieldset>

        <fieldset className={styles['photo-upload-form__fieldset']}>
          <label htmlFor="tagline">Fill in a tagline</label>
          <input
            type="text"
            id="tagline"
            value={tagLine}
            onChange={(event) => {
              setTagLine(event.target.value);
            }}
          />
        </fieldset>

        <fieldset className={styles['photo-upload-form__fieldset']}>
          <label htmlFor="rounded">Select the background colour</label>
          <input
            id="arcColor"
            type="color"
            name="rounded"
            onChange={(event) => {
              setArcColour(event.target.value);
            }}
            value={arcColour}
          />
        </fieldset>

        <button type="submit">Upload and convert photo</button>
      </form>

      <div className={styles['photo-upload-form-result']}>
        {originaURL && (
          <div>
            <h2>Original</h2>
            <small>
              <small>(Downsized to 200 by 200 pixels)</small>
            </small>
            <br />
            <NextImage src={originaURL} alt="" width={200} height={200} />
          </div>
        )}
        {objectURL && (
          <div>
            <h2>Result</h2>
            <small>
              <small>(Fixed to 400 by 400 pixels)</small>
            </small>
            <br />
            <NextImage src={objectURL} alt="" width={size} height={size} />
            <div>
              <a href={objectURL} download="image.png">
                Download
              </a>
            </div>
          </div>
        )}
      </div>

      <div>
        <svg width="400" height="400" viewBox="0 0 400 400" xmlnsXlink="http://www.w3.org/1999/xlink">
          <path
            d="M10,200 a190,190 0 0 0 380,0"
            id="curvedTextPath"
            fill="transparent"
            stroke="#000"
            stroke-width="2.5"
          />

          <text width="400" fill="#00ff00">
            <textPath startOffset="35%" xlinkHref="#curvedTextPath">
              #FREELANCE
            </textPath>
          </text>
        </svg>
      </div>
    </div>
  );
}
