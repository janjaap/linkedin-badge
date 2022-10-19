import { FormEvent, useEffect, useState } from 'react';
import NextImage from 'next/image';
import classNames from 'clsx';

import type { ChangeEvent } from 'react';

import styles from './PhotoUpload.module.css';
import { Canvas } from '../Canvas/Canvas';
import { textOnCurve } from './textOnCurve';
import { Spinner } from '../Spinner/Spinner';
import { fileSize } from '../Canvas/fileSize';

const defaultTagLine = 'FREELANCE';

export function PhotoUpload() {
  const [file, setFile] = useState<Blob>();
  const [fileError, setFileError] = useState('');
  const [imgLayers, setImgLayers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [objectURL, setObjectURL] = useState<string>();
  const [originaURL, setOriginalURL] = useState<string>();
  const [tagLine, setTagLine] = useState<string>(defaultTagLine);
  const [tagLineError, setTagLineError] = useState('');

  useEffect(
    () => () => {
      if (!objectURL) return;

      URL.revokeObjectURL(objectURL);
    },
    [objectURL]
  );

  function onChangeFile(event: ChangeEvent<HTMLInputElement>) {
    if (!event.target.files) return;

    const file = event.target.files.item(0);

    setFileError('');

    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setFileError(`This file is too big: ${fileSize(file.size)}`);
      return;
    }

    setFile(file);
    setObjectURL(undefined);
    setOriginalURL(URL.createObjectURL(file));
  }

  function onChangeTagLine(event: ChangeEvent<HTMLInputElement>) {
    const { value, validity } = event.target;

    setTagLineError('');

    if (!validity.valid) {
      setTagLineError('Only use alphanumeric characters (A-Z, 0-9) for your hashtag.');
    }

    setTagLine(value);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();

    if (!file || fileError || tagLineError) return;

    const formData = new FormData();
    formData.append('photo', file);

    setIsLoading(true);
    setObjectURL(undefined);

    fetch('/api/photo', { method: 'POST', body: formData })
      .then((response) => response.blob())
      .then(async (blob) => {
        const resultSrc = URL.createObjectURL(blob);

        setObjectURL(resultSrc);
        setIsLoading(false);
        setImgLayers([resultSrc, textOnCurve(400, tagLine)]);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }

  return (
    <div className={styles['photo-upload']}>
      <h1>Linkedin profile badge generator</h1>

      <form action="" className={styles['photo-upload-form']} onSubmit={onSubmit} noValidate>
        <fieldset
          className={classNames(styles['photo-upload-form__fieldset'], {
            [styles['photo-upload-form__fieldset--error']]: fileError,
          })}
        >
          <div className={styles['photo-upload-form-label']}>
            <label htmlFor="photo">Select a photo</label>

            <p className={styles['photo-upload-form__input-info']}>Maximum allowed size is 8 MB</p>

            {fileError && (
              <span id="ID_FILE_ERROR" className={styles['photo-upload-form__input-error']}>
                {fileError}
              </span>
            )}
          </div>

          <input
            id="photo"
            type="file"
            onChange={onChangeFile}
            aria-describedby={fileError ? 'ID_FILE_ERROR' : undefined}
          />
        </fieldset>

        <fieldset
          className={classNames(styles['photo-upload-form__fieldset'], {
            [styles['photo-upload-form__fieldset--error']]: tagLineError,
          })}
        >
          <div className={styles['photo-upload-form-label']}>
            <label htmlFor="tagline">Fill in a tagline</label>

            <p className={styles['photo-upload-form__input-info']}>
              Should be a hashtag; no spaces or lowercase characters allowed
            </p>

            {tagLineError && (
              <span id="ID_TAGLINE_ERROR" className={styles['photo-upload-form__input-error']}>
                {tagLineError}
              </span>
            )}
          </div>

          <div className={styles['photo-upload-form-input']}>
            <span className={styles['photo-upload-form__input-prefix']}>#</span>
            <input id="tagline" onChange={onChangeTagLine} pattern="[A-Za-z0-9]+" type="text" value={tagLine} />
          </div>
        </fieldset>

        <fieldset className={styles['photo-upload-form__fieldset']}>
          <div className={styles['photo-upload-form-label']} />
          <div className={styles['photo-upload-form-input']}>
            <button type="submit">Upload and convert photo</button>
          </div>
        </fieldset>
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

              <NextImage src={originaURL} alt="Original image" width={200} height={200} />
            </>
          ) : (
            <>Select a photo for uploading</>
          )}
        </div>

        <div>
          <h2>Result</h2>

          {isLoading && <Spinner ariaValueText="Loading result" />}

          {objectURL && (
            <>
              <small>
                <small>(Fixed to 400 by 400 pixels)</small>
              </small>

              <Canvas layers={imgLayers} />
              <span />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
