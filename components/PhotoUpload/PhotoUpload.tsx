import { useEffect, useState } from 'react';
import NextImage from 'next/image';
import classNames from 'clsx';
import ReactCrop from 'react-image-crop';

import 'react-image-crop/dist/ReactCrop.css';
import type { ChangeEvent, FormEvent } from 'react';
import type { Crop, PercentCrop, PixelCrop } from 'react-image-crop';

import styles from './PhotoUpload.module.css';
import { Canvas } from '../Canvas/Canvas';
// import { textOnCurve } from './textOnCurve';
import { Spinner } from '../Spinner/Spinner';
import { fileSize } from '../Canvas/fileSize';

const defaultTagLine = 'FREELANCE';
const initialCrop: PercentCrop = {
  unit: '%',
  width: 75,
  height: 75,
  x: 12.5,
  y: 12.5,
};

export function PhotoUpload() {
  const [crop, setCrop] = useState<Crop>(initialCrop);
  const [percentCrop, setPercentCrop] = useState<PercentCrop>(initialCrop);
  const [file, setFile] = useState<Blob>();
  const [fileError, setFileError] = useState('');
  const [imgLayers, setImgLayers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [objectURL, setObjectURL] = useState<string>();
  const [originaURL, setOriginalURL] = useState<string>();
  const [tagLine, setTagLine] = useState<string>(defaultTagLine);
  const [tagLineError, setTagLineError] = useState('');

  const [size, setSize] = useState<{ width: number; height: number }>();

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

    const newImg = document.createElement('img');
    newImg.src = URL.createObjectURL(file);
    newImg.onload = function onLoad() {
      const { width, height } = newImg;

      setOriginalURL(URL.createObjectURL(file));
      setSize({ width, height });
    };
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
    formData.append('crop', JSON.stringify(percentCrop));

    setIsLoading(true);
    setObjectURL(undefined);

    fetch('/api/photo', { method: 'POST', body: formData })
      .then((response) => response.blob())
      .then(async (blob) => {
        const resultSrc = URL.createObjectURL(blob);

        setObjectURL(resultSrc);
        setIsLoading(false);
        setImgLayers([resultSrc]);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }

  function onCropChange(crop: PixelCrop, percentCrop: PercentCrop) {
    setCrop(crop);
    setPercentCrop(percentCrop);
  }

  // console.log({ crop });

  return (
    <div className={styles['photo-upload']}>
      <h1>Linkedin profile badge generator</h1>

      <p>Render an image with rounded corners below a #FREELANCE badge on a transparent background.</p>
      <p>
        The Linkedin profile badge needs to be square. The image that you want to convert can be cropped once selected.
      </p>
      <p>
        <em>
          Note: this is the first version in which you cannot set your own tagline nor the colour of the tagline
          background.
        </em>
      </p>

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
            [styles['photo-upload-form__fieldset--disabled']]: true,
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
            <input
              disabled
              id="tagline"
              onChange={onChangeTagLine}
              pattern="[A-Za-z0-9]+"
              type="text"
              value={tagLine}
            />
          </div>
        </fieldset>

        <div className={styles['photo-upload-form-result']}>
          <fieldset>
            <legend>Original</legend>

            {originaURL && size ? (
              <>
                <ReactCrop crop={crop} onChange={onCropChange} aspect={1} ruleOfThirds>
                  {/*eslint-disable-next-line @next/next/no-img-element*/}
                  <img src={originaURL} alt="Original image" />
                </ReactCrop>

                {/* <small>
                  <small>{`width: ${size.width} pixels, height: ${size.height} pixels`}</small>
                </small> */}
              </>
            ) : (
              <div className={styles['photo-upload-form-result__empty']}>Upload photo</div>
            )}
          </fieldset>

          <div className={styles['photo-upload-form-input']}>
            <button type="submit">Apply badge</button>
          </div>

          <fieldset>
            <legend>Result</legend>

            {isLoading && <Spinner ariaValueText="Loading result" />}

            {objectURL && <Canvas layers={imgLayers} />}
          </fieldset>
        </div>
      </form>
    </div>
  );
}
