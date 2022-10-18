import { FormEvent, useEffect, useState } from 'react';

import type { ChangeEvent } from 'react';
import NextImage from 'next/image';

import styles from './PhotoUpload.module.css';
import loading from './loading.svg';
import { Canvas } from '../Canvas/Canvas';
import { arc } from './arc';

const defaultColour = '#015FDB';
const defaultTagLine = '#FREELANCE';

export function PhotoUpload() {
  const [arcColour, setArcColour] = useState<string>(defaultColour);
  const [file, setFile] = useState<Blob>();
  const [isLoading, setIsLoading] = useState(false);
  const [objectURL, setObjectURL] = useState<string>();
  const [originaURL, setOriginalURL] = useState<string>();
  const [size, setSize] = useState<number>();
  const [tagLine, setTagLine] = useState<string>(defaultTagLine);
  const [imgLayers, setImgLayers] = useState<string[]>([]);

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
    setObjectURL(undefined);
    setOriginalURL(URL.createObjectURL(photo));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();

    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);
    formData.append('arcColour', arcColour);

    setIsLoading(true);
    setObjectURL(undefined);

    fetch('/api/photo', { method: 'POST', body: formData })
      .then((response) => response.blob())
      .then(async (blob) => {
        const resultSrc = URL.createObjectURL(blob);

        setObjectURL(resultSrc);
        setIsLoading(false);
        setImgLayers([resultSrc, arc(400, tagLine)]);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
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
        <div>
          <h2>Original</h2>
          {originaURL ? (
            <>
              <small>
                <small>(Downsized to 200 by 200 pixels)</small>
              </small>
              <br />
              <NextImage src={originaURL} alt="" width={200} height={200} />
            </>
          ) : (
            <>Select a photo for uploading</>
          )}
        </div>

        <div>
          <h2>Result</h2>
          {isLoading && <NextImage src={loading.src} width="200" height="200" />}
          {objectURL ? (
            <>
              <small>
                <small>(Fixed to 400 by 400 pixels)</small>
              </small>

              <Canvas layers={imgLayers} />
            </>
          ) : (
            <>...</>
          )}
        </div>
      </div>
    </div>
  );
}
