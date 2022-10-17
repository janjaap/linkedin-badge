// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import type { File } from 'formidable';
import sharp from 'sharp';
import formidable from 'formidable';

const IMAGE_DIMENSION = 400;

const roundedCorners = (size = IMAGE_DIMENSION) =>
  Buffer.from(`<svg><rect x="0" y="0" width="${size}" height="${size}" rx="${size / 2}" ry="${size} / 2" /></svg>`);

const arc = (bgColor = '#015FDB', size = IMAGE_DIMENSION) =>
  Buffer.from(`
<svg width="${size}" height="${size}" viewBox="0 0 1080 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g clip-path="url(#clip0_1_4)">
    <g clip-path="url(#clip1_1_4)">
      <path d="M98.86 229C54.66 291.61 24.29 362.91 9.76998 438.16C-4.75002 513.41 -3.08002 590.89 14.67 665.45C32.41 740.01 65.82 809.93 112.68 870.58C159.53 931.23 218.76 981.21 286.42 1017.2C354.08 1053.19 428.63 1074.36 505.11 1079.31C581.59 1084.26 658.24 1072.88 729.98 1045.92C801.72 1018.95 866.9 977.03 921.18 922.93C975.46 868.83 1017.61 803.8 1044.82 732.15L883.38 670.84C864.87 719.57 836.21 763.81 799.28 800.61C762.36 837.41 718.02 865.92 669.22 884.26C620.42 902.6 568.28 910.34 516.26 906.97C464.24 903.6 413.53 889.2 367.51 864.72C321.49 840.24 281.2 806.24 249.33 764.99C217.46 723.74 194.74 676.17 182.67 625.46C170.6 574.75 169.47 522.05 179.34 470.86C189.21 419.67 209.87 371.18 239.93 328.59L98.86 229Z" fill="url(#paint0_linear_1_4)"/>
     </g>
  </g>
  <defs>
    <linearGradient id="paint0_linear_1_4" x1="568.3" y1="494.14" x2="241.8" y2="1028.18" gradientUnits="userSpaceOnUse">
      <stop offset="0.09" stop-color="${bgColor}" stop-opacity="0" />
      <stop offset="0.13" stop-color="${bgColor}" stop-opacity="0.04" />
      <stop offset="0.2" stop-color="${bgColor}" stop-opacity="0.14" />
      <stop offset="0.27" stop-color="${bgColor}" stop-opacity="0.3" />
      <stop offset="0.29" stop-color="${bgColor}" stop-opacity="0.35" />
      <stop offset="0.42" stop-color="${bgColor}" stop-opacity="0.67" />
      <stop offset="0.53" stop-color="${bgColor}" stop-opacity="0.91" />
      <stop offset="0.58" stop-color="${bgColor}" />
    </linearGradient>
    <clipPath id="clip0_1_4">
     <rect width="1080" height="1080" fill="white" />
    </clipPath>
    <clipPath id="clip1_1_4">
      <rect width="1044.82" height="851.43" fill="white" transform="translate(0 229)" />
    </clipPath>
  </defs>
</svg>
`);

const tagLine = (text = '#FREELANCE', size = IMAGE_DIMENSION) => {
  const radius = (size / 2) * 0.95;
  const startX = size / 2 - radius;
  const pathData = 'M' + startX + ',' + size / 2 + ' ' + 'a' + radius + ',' + radius + ' 0 0 0 ' + 2 * radius + ',0';

  return Buffer.from(`
    <svg width="${size}px" height="${size}px" viewBox="0 0 ${size} ${size}" xmlns:xlink="http://www.w3.org/1999/xlink">
      <style>
        text {
          /* font-family: Arial Black, Arial Bold, Gadget, sans-serif; */
          alignment-baseline: baseline;
          font-family: Tahoma, Verdana, Segoe, sans-serif;
          font-size: 12px;
          font-weight: bold;
          text-anchor: middle;
          width: 100%;
        }
      </style>

      <path d="${pathData}" id="curvedTextPath" fill="transparent" stroke="#ffffff" stroke-width="2.5" />

      <text width="${size}px" fill="#ffffff">
      ${text}
        <textPath startOffset="35%" xlink:href="#curvedTextPath">${text}</textPath>
      </text>
    </svg>
  `);
};

type Fields = {
  tagLine?: string;
  arcColour?: string;
  size?: number;
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

    if (!files.photo) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('File needs to be uploaded');
      return;
    }

    const { width = 0, height = 0 } = await sharp(files.photo.filepath).metadata();

    if (width < IMAGE_DIMENSION || height < IMAGE_DIMENSION) {
      res.writeHead(400).end(`Image dimensions should be at least ${IMAGE_DIMENSION} pixels wide and high`);
      return;
    }

    const resultImageSize = fields.size || IMAGE_DIMENSION;
    // console.log({ format, width, height });

    return (
      sharp(files.photo.filepath)
        .resize({ width: resultImageSize })
        // .extract({ width: 500, height: 330, left: 120, top: 70 })
        .composite([
          {
            input: roundedCorners(resultImageSize),
            blend: 'dest-in',
          },
          {
            input: arc(fields.arcColour, resultImageSize),
            top: 0,
            left: 0,
          },
          // {
          //   input: tagLine(fields.tagLine, resultImageSize),
          //   top: 0,
          //   left: 0,
          // },
        ])
        .png()
        .toBuffer((toBufferError, data, _info) => {
          if (toBufferError) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(String(toBufferError));

            return;
          }

          res.status(200).send(data);
        })
    );
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
