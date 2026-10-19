// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import type { File } from 'formidable';
import sharp, { type Metadata } from 'sharp';
import formidable from 'formidable';
import fs from 'fs';
import type { Crop, PercentCrop } from 'react-image-crop';
import {
  BADGE_CENTRE,
  BADGE_RADIUS,
  BADGE_VIEWBOX,
  DEFAULT_BG_COLOUR,
  HEX_COLOUR,
  TAGLINE_ANGLE_LIMIT,
  TAGLINE_INNER_RADIUS,
  TAGLINE_MAX_SWEEP,
  TAGLINE_START_ANGLE,
} from '../../lib/badge';

const IMAGE_DIMENSION = 400;
const CROP: PercentCrop = { x: 0, y: 0, width: 100, height: 100, unit: '%' };

const DEFAULT_TAGLINE_SWEEP = 110; // fallback for when the client doesn't send a measured sweep
const TAGLINE_PAD_MIN = 12; // degrees of banner either side of the tagline
const TAGLINE_PAD_MAX = 42;
const TAGLINE_PAD_RATIO = 0.35;
const MAX_BAND_SWEEP = 180;
const BANNER_FEATHER = 0.75; // pixels

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


const smoothstep = (value: number) => {
  const t = Math.max(0, Math.min(1, value));

  return t * t * (3 - 2 * t);
};

const hexToRgb = (hex: string): [number, number, number] => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16),
];

// Background band only; the tagline itself is drawn client-side (librsvg has no textPath / @font-face support).
// The band is rasterised so its opacity can fade with the angle, which an SVG gradient can't follow along an
// arc; the band's sweep follows the measured tagline length, so it scales to fit the text.
const banner = async (
  size: number,
  colour: string,
  angle: number,
  textSweep: number = DEFAULT_TAGLINE_SWEEP
) => {
  const pad = Math.min(
    TAGLINE_PAD_MAX,
    Math.max(TAGLINE_PAD_MIN, textSweep * TAGLINE_PAD_RATIO),
    (MAX_BAND_SWEEP - textSweep) / 2
  );
  const bandSweep = ((textSweep + 2 * pad) * Math.PI) / 180;
  const padRadians = (pad * Math.PI) / 180;
  const startAngle = ((TAGLINE_START_ANGLE + pad - angle) * Math.PI) / 180;
  const scale = size / BADGE_VIEWBOX;
  const innerRadius = TAGLINE_INNER_RADIUS * scale;
  const outerRadius = BADGE_RADIUS * scale;
  const centre = BADGE_CENTRE * scale;
  const [red, green, blue] = hexToRgb(colour);
  const data = Buffer.alloc(size * size * 4);
  const twoPi = Math.PI * 2;
  const wrap = (value: number) => ((value % twoPi) + twoPi) % twoPi;

  for (let y = 0; y < size; y += 1) {
    const dy = y + 0.5 - centre;

    for (let x = 0; x < size; x += 1) {
      const dx = x + 0.5 - centre;
      const radius = Math.hypot(dx, dy);
      const radial =
        smoothstep((radius - (innerRadius - BANNER_FEATHER)) / (2 * BANNER_FEATHER)) *
        (1 - smoothstep((radius - (outerRadius - BANNER_FEATHER)) / (2 * BANNER_FEATHER)));

      if (radial <= 0) continue;

      const offset = wrap(startAngle - Math.atan2(dy, dx));

      if (offset > bandSweep) continue;

      // Distance from the nearest end of the band, so the fade stays outside the tagline
      const fromEnd = Math.min(offset, bandSweep - offset);
      const alpha = smoothstep(fromEnd / padRadians) * radial;

      if (alpha <= 0) continue;

      const index = (y * size + x) * 4;
      data[index] = red;
      data[index + 1] = green;
      data[index + 2] = blue;
      data[index + 3] = Math.round(alpha * 255);
    }
  }

  return sharp(data, { raw: { width: size, height: size, channels: 4 } })
    .png()
    .toBuffer();
};

type Fields = {
  tagLine?: string;
  tagLineAngle?: string;
  tagLineSweep?: string;
  size?: string;
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

    // Parsed into RGB, so anything but a strict hex value is rejected
    if (!HEX_COLOUR.test(bgColour)) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('bgColour should be a hex colour, e.g. #015FDB');
      return;
    }

    const tagLineAngle = Number(fields.tagLineAngle ?? 0);

    // Rotates the banner, so anything but a number in range is rejected
    if (!Number.isFinite(tagLineAngle) || Math.abs(tagLineAngle) > TAGLINE_ANGLE_LIMIT) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end(`tagLineAngle should be a number between -${TAGLINE_ANGLE_LIMIT} and ${TAGLINE_ANGLE_LIMIT}`);
      return;
    }

    let tagLineSweep = DEFAULT_TAGLINE_SWEEP;

    if (fields.tagLineSweep !== undefined) {
      tagLineSweep = Number(fields.tagLineSweep);

      // Used to size the banner, so anything but a number in range is rejected
      if (!Number.isFinite(tagLineSweep) || tagLineSweep <= 0 || tagLineSweep > TAGLINE_MAX_SWEEP) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end(`tagLineSweep should be greater than 0 and at most ${TAGLINE_MAX_SWEEP}`);
        return;
      }
    }

    const requestedSize = Number(fields.size);
    const resultImageSize = fields.size && Number.isFinite(requestedSize)
      ? Math.min(2048, Math.max(64, Math.round(requestedSize)))
      : IMAGE_DIMENSION;
    const crop = fields.crop ? (JSON.parse(fields.crop) as PercentCrop) : CROP;
    const bannerImage = await banner(resultImageSize, bgColour, tagLineAngle, tagLineSweep);

    sharp(files.photo.filepath)
      .extract(cropCfg(crop, resultImageSize, metaData))
      .resize({ width: resultImageSize })
      .composite([
        {
          input: bannerImage,
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
