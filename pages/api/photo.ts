// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import type { File } from 'formidable';
import sharp, { type Metadata } from 'sharp';
import formidable from 'formidable';
import fs from 'fs';
import type { Crop, PercentCrop } from 'react-image-crop';
import { DEFAULT_BG_COLOUR, HEX_COLOUR } from '../../lib/badge';

const IMAGE_DIMENSION = 400;
const CROP: PercentCrop = { x: 0, y: 0, width: 100, height: 100, unit: '%' };

const cropCfg = (crop: Crop, size: number, metaData: Metadata) => {
  const left = Number.parseInt((((crop.x || CROP.x) / 100) * (metaData.width || size)).toFixed(), 10);
  const top = Number.parseInt((((crop.y || CROP.y) / 100) * (metaData.height || size)).toFixed(), 10);
  const width = Number.parseInt(((crop.width / 100) * (metaData.width || size)).toFixed(), 10);
  const height = Number.parseInt(((crop.height / 100) * (metaData.height || size)).toFixed(), 10);

  return {
    left,
    top,
    width,
    height,
  };
};

const roundedCorners = (size = IMAGE_DIMENSION) =>
  Buffer.from(`<svg><rect x="0" y="0" width="${size}" height="${size}" rx="${size / 2}" ry="${size / 2}" /></svg>`);


const gradientStops: Array<[offset: number, opacity: number]> = [
  [0.09, 0],
  [0.13, 0.04],
  [0.2, 0.14],
  [0.27, 0.3],
  [0.29, 0.35],
  [0.42, 0.67],
  [0.53, 0.91],
  [0.58, 1],
];

// Background band only; the tagline itself is drawn client-side (librsvg has no textPath / @font-face support)
const arc = (size = IMAGE_DIMENSION, colour = DEFAULT_BG_COLOUR) =>
  Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 1080 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M98.86 229C54.66 291.61 24.29 362.91 9.76998 438.16C-4.75002 513.41 -3.08002 590.89 14.67 665.45C32.41 740.01 65.82 809.93 112.68 870.58C159.53 931.23 218.76 981.21 286.42 1017.2C354.08 1053.19 428.63 1074.36 505.11 1079.31C581.59 1084.26 658.24 1072.88 729.98 1045.92C801.72 1018.95 866.9 977.03 921.18 922.93C975.46 868.83 1017.61 803.8 1044.82 732.15L883.38 670.84C864.87 719.57 836.21 763.81 799.28 800.61C762.36 837.41 718.02 865.92 669.22 884.26C620.42 902.6 568.28 910.34 516.26 906.97C464.24 903.6 413.53 889.2 367.51 864.72C321.49 840.24 281.2 806.24 249.33 764.99C217.46 723.74 194.74 676.17 182.67 625.46C170.6 574.75 169.47 522.05 179.34 470.86C189.21 419.67 209.87 371.18 239.93 328.59L98.86 229Z" fill="url(#bg)" />
      <defs>
        <linearGradient id="bg" x1="568.3" y1="494.14" x2="241.8" y2="1028.18" gradientUnits="userSpaceOnUse">
          ${gradientStops
            .map(([offset, opacity]) => `<stop offset="${offset}" stop-color="${colour}" stop-opacity="${opacity}" />`)
            .join('')}
        </linearGradient>
      </defs>
    </svg>
`);

type Fields = {
  tagLine?: string;
  size?: number;
  crop?: string;
  bgColour?: string;
};

type Files = {
  photo?: File;
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({
      data: null,
      error: 'Method Not Allowed',
    });

    return;
  }

  const form = formidable({
    maxFiles: 1,
    keepExtensions: true,
    maxFileSize: 8 * 1024 * 1024,
  });

  form.parse(req, async (parseError, fields: Fields, files: Files) => {
    if (parseError) {
      res.writeHead(parseError.httpCode || 400, { 'Content-Type': 'text/plain' });
      res.end(String(parseError));
      return;
    }

    if (!files.photo?.filepath) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('File needs to be uploaded');
      return;
    }

    const metaData = await sharp(files.photo.filepath).metadata();
    const { width = 0, height = 0 } = metaData;

    if (width < IMAGE_DIMENSION || height < IMAGE_DIMENSION) {
      res.writeHead(422, { 'Content-Type': 'text/plain' });
      res.write(`Image dimensions should be at least ${IMAGE_DIMENSION} pixels wide and high`);
      res.end();
      return;
    }

    const bgColour = fields.bgColour ?? DEFAULT_BG_COLOUR;

    // Interpolated into SVG markup, so anything but a strict hex value is rejected
    if (!HEX_COLOUR.test(bgColour)) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('bgColour should be a hex colour, e.g. #015FDB');
      return;
    }

    const resultImageSize = fields.size || IMAGE_DIMENSION;
    const crop = fields.crop ? (JSON.parse(fields.crop) as PercentCrop) : CROP;

    sharp(files.photo.filepath)
      .extract(cropCfg(crop, resultImageSize, metaData))
      .resize({ width: resultImageSize })
      .composite([
        {
          input: arc(resultImageSize, bgColour),
          top: 0,
          left: 0,
        },
        {
          input: roundedCorners(resultImageSize),
          blend: 'dest-in',
        },
      ])
      .png()
      .toBuffer((toBufferError, data, _info) => {
        if (toBufferError) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end(String(toBufferError));

          return;
        }

        try {
          if (files.photo?.filepath) {
            const stat = fs.lstatSync(files.photo?.filepath);

            if (stat.isFile()) {
              fs.unlinkSync(files.photo.filepath);
            }
          }
        } catch (statError) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end(String(statError));
          return;
        }

        res.status(200).send(data);
        return;
      });
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
