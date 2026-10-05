import { useEffect, useState } from 'react';
import classNames from 'clsx';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';

import 'react-image-crop/dist/ReactCrop.css';
import type { ChangeEvent, FormEvent } from 'react';
import type { Crop, PercentCrop, PixelCrop } from 'react-image-crop';

import styles from './PhotoUpload.module.css';
import { Canvas } from '../Canvas/Canvas';
import { Spinner } from '../Spinner/Spinner';
import { fileSize } from '../Canvas/fileSize';
import {
  DEFAULT_BG_COLOUR,
  DEFAULT_FG_COLOUR,
  DEFAULT_TAGLINE,
  TAGLINE_MAX_LENGTH,
} from '../../lib/badge';
import { contrastRatio, MIN_TAGLINE_CONTRAST } from '../../lib/contrast';

const MIN_IMG_WIDTH = 400;
const initialCrop: PercentCrop = {
  unit: '%',
  width: 75,
  height: 75,
  x: 12.5,
  y: 12.5,
};

export function PhotoUpload() {
  const [applied, setApplied] = useState(false);
  const [crop, setCrop] = useState<Crop>(initialCrop);
  const [file, setFile] = useState<Blob>();
  const [fileError, setFileError] = useState('');
  const [imgLayers, setImgLayers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [objectURL, setObjectURL] = useState<string>();
  const [originaURL, setOriginalURL] = useState<string>();
  const [parseError, setParseError] = useState('');
  const [tagLine, setTagLine] = useState<string>(DEFAULT_TAGLINE);
  const [tagLineError, setTagLineError] = useState('');
  const [fgColour, setFgColour] = useState(DEFAULT_FG_COLOUR);
  const [bgColour, setBgColour] = useState(DEFAULT_BG_COLOUR);
  const contrast = contrastRatio(fgColour, bgColour);
  // Settings the current result was rendered with; only updated on (re-)apply so the result matches what was submitted
  const [appliedText, setAppliedText] = useState({ tagLine: DEFAULT_TAGLINE, fgColour: DEFAULT_FG_COLOUR });

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
    setParseError('');

    const newImg = document.createElement('img');
    newImg.src = URL.createObjectURL(file);
    newImg.onload = function onLoad() {
      const { width, height } = newImg;
      const ratio = width / height;

      if (width < MIN_IMG_WIDTH || height < MIN_IMG_WIDTH) {
        setFileError('The image dimensions should be at least 400 pixels by 400 pixels');
        setOriginalURL(undefined);
        return;
      }

      let cropWidth = 50;
      let cropHeight = 50;

      if (ratio <= 1) {
        cropHeight = cropHeight * ratio;
      } else {
        cropWidth = cropWidth / ratio;
      }

      setOriginalURL(URL.createObjectURL(file));
      setSize({ width, height });

      const relCrop = centerCrop(
        makeAspectCrop(
          {
            unit: '%',
            width: Math.round(cropWidth),
            height: Math.round(cropHeight),
          },
          1,
          width,
          height
        ),
        width,
        height
      );
      setCrop(relCrop);
    };
  }

  function onChangeTagLine(event: ChangeEvent<HTMLInputElement>) {
    const { value, validity } = event.target;

    setTagLineError('');

    if (validity.valueMissing) {
      setTagLineError('Fill in a tagline.');
    } else if (!validity.valid) {
      setTagLineError('Only use alphanumeric characters (A-Z, 0-9) for your hashtag.');
    }

    setTagLine(value.toUpperCase());
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();

    if (!file || fileError || tagLineError) return;

    if (!crop.width || !crop.height) {
      setParseError('Select the crop area in the photo');
      return;
    }

    const formData = new FormData();
    formData.append('photo', file);
    formData.append('crop', JSON.stringify(crop));
    formData.append('bgColour', bgColour);

    const submittedText = { tagLine, fgColour };

    setIsLoading(true);
    setObjectURL(undefined);
    setParseError('');

    fetch('/api/photo', { method: 'POST', body: formData })
      .then(async (response) => {
        if (!response.ok) {
          if (response.status === 422) {
            throw new Error('File dimensions should at least be 400 pixels by 400 pixels');
          }

          throw new Error('Something went horribly wrong on the server. Reload the page and try again');
        }

        return response.blob();
      })
      .then(async (blob) => {
        const resultSrc = URL.createObjectURL(blob);

        setObjectURL(resultSrc);
        setIsLoading(false);
        setImgLayers([resultSrc]);
        setAppliedText(submittedText);
        setApplied(true);
      })
      .catch((error: Error) => {
        setParseError(error.message);
        setIsLoading(false);
      });
  }

  function onCropChange(_crop: PixelCrop, percentCrop: PercentCrop) {
    setCrop(percentCrop);
  }

  return (
    <div className={styles['photo-upload']}>
      <p>Render an image with rounded corners below a hashtag badge on a transparent background.</p>
      <p>
        The Linkedin profile badge needs to be square. The image that you want to convert can be cropped once selected.
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
            accept="image/*"
            aria-describedby={fileError ? 'ID_FILE_ERROR' : undefined}
            id="photo"
            onChange={onChangeFile}
            type="file"
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
            <input
              aria-describedby={tagLineError ? 'ID_TAGLINE_ERROR' : undefined}
              aria-invalid={Boolean(tagLineError)}
              id="tagline"
              maxLength={TAGLINE_MAX_LENGTH}
              onChange={onChangeTagLine}
              pattern="[A-Za-z0-9]+"
              required
              type="text"
              value={tagLine}
            />
          </div>
        </fieldset>

        <fieldset className={styles['photo-upload-form__fieldset']}>
          <legend className={styles['photo-upload-form-label']}>Badge colours</legend>

          <div className={styles['photo-upload-form-colours']}>
            <label>
              <input type="color" value={fgColour} onChange={(event) => setFgColour(event.target.value)} /> Text
            </label>

            <label>
              <input type="color" value={bgColour} onChange={(event) => setBgColour(event.target.value)} />{' '}
              Background
            </label>
          </div>

          {contrast < MIN_TAGLINE_CONTRAST && (
            <p id="ID_CONTRAST_WARNING" className={styles['photo-upload-form__input-warning']} role="status">
              Low contrast ({contrast.toFixed(1)}:1). The tagline may be hard to read, especially at the small size
              LinkedIn shows profile photos; aim for at least {MIN_TAGLINE_CONTRAST}:1.
            </p>
          )}
        </fieldset>

        {parseError && <div className={styles['photo-upload-parse-error']}>{parseError}</div>}

        <div className={styles['photo-upload-form-result']}>
          <div className={styles['photo-upload-form-result-img-container']}>
            <p>Original</p>

            {originaURL && size ? (
              <>
                <ReactCrop crop={crop} onChange={onCropChange} aspect={1} ruleOfThirds>
                  {/*eslint-disable-next-line @next/next/no-img-element*/}
                  <img src={originaURL} alt="Original image" />
                </ReactCrop>

                <div>
                  <small>
                    <small>The image can be cropped by dragging the grid handles</small>
                  </small>
                </div>
              </>
            ) : (
              <div className={styles['photo-upload-form-result__empty']}>Upload photo</div>
            )}
          </div>

          <div className={styles['photo-upload-form-input']}>
            <button type="submit" disabled={!originaURL || isLoading}>
              {applied ? 'Re-apply' : 'Apply'} badge
            </button>
          </div>

          <div className={styles['photo-upload-form-result-img-container']}>
            <p>Result</p>

            {isLoading && (
              <div className={styles['photo-upload-form-result_loader']}>
                <Spinner ariaValueText="Loading result" />
              </div>
            )}

            {objectURL ? (
              <Canvas layers={imgLayers} tagLine={appliedText.tagLine} fgColour={appliedText.fgColour} />
            ) : (
              <div className={styles['photo-upload-form-result__empty']}>Upload photo</div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
