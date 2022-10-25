// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import type { File } from 'formidable';
import sharp from 'sharp';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

const IMAGE_DIMENSION = 400;

const roundedCorners = (size = IMAGE_DIMENSION) =>
  Buffer.from(`<svg><rect x="0" y="0" width="${size}" height="${size}" rx="${size / 2}" ry="${size} / 2" /></svg>`);

const arc = (size = IMAGE_DIMENSION) =>
  Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 1080 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clip-path="url(#clip0_1_4)">
        <g clip-path="url(#clip1_1_4)">
          <path d="M98.86 229C54.66 291.61 24.29 362.91 9.76998 438.16C-4.75002 513.41 -3.08002 590.89 14.67 665.45C32.41 740.01 65.82 809.93 112.68 870.58C159.53 931.23 218.76 981.21 286.42 1017.2C354.08 1053.19 428.63 1074.36 505.11 1079.31C581.59 1084.26 658.24 1072.88 729.98 1045.92C801.72 1018.95 866.9 977.03 921.18 922.93C975.46 868.83 1017.61 803.8 1044.82 732.15L883.38 670.84C864.87 719.57 836.21 763.81 799.28 800.61C762.36 837.41 718.02 865.92 669.22 884.26C620.42 902.6 568.28 910.34 516.26 906.97C464.24 903.6 413.53 889.2 367.51 864.72C321.49 840.24 281.2 806.24 249.33 764.99C217.46 723.74 194.74 676.17 182.67 625.46C170.6 574.75 169.47 522.05 179.34 470.86C189.21 419.67 209.87 371.18 239.93 328.59L98.86 229Z" fill="url(#paint0_linear_1_4)"/>      <path d="M98.86 229C54.66 291.61 24.29 362.91 9.76998 438.16C-4.75002 513.41 -3.08002 590.89 14.67 665.45C32.41 740.01 65.82 809.93 112.68 870.58C159.53 931.23 218.76 981.21 286.42 1017.2C354.08 1053.19 428.63 1074.36 505.11 1079.31C581.59 1084.26 658.24 1072.88 729.98 1045.92C801.72 1018.95 866.9 977.03 921.18 922.93C975.46 868.83 1017.61 803.8 1044.82 732.15L883.38 670.84C864.87 719.57 836.21 763.81 799.28 800.61C762.36 837.41 718.02 865.92 669.22 884.26C620.42 902.6 568.28 910.34 516.26 906.97C464.24 903.6 413.53 889.2 367.51 864.72C321.49 840.24 281.2 806.24 249.33 764.99C217.46 723.74 194.74 676.17 182.67 625.46C170.6 574.75 169.47 522.05 179.34 470.86C189.21 419.67 209.87 371.18 239.93 328.59L98.86 229Z" fill="url(#paint0_linear_1_4)" />
          <path d="M116.7 597.6L101.13 595.65L102.03 605.13L93.33 605.97L92.24 594.53L72.17 592.02L73.24 603.26L64.54 604.1L63.29 590.9L47.52 588.97L46.72 580.56L62.49 582.49L60.75 564.21L44.98 562.28L44.18 553.87L59.95 555.8L59.04 546.22L67.74 545.38L68.84 556.91L88.9 559.32L87.84 548.18L96.54 547.34L97.79 560.44L113.36 562.39L114.16 570.8L98.59 568.85L100.34 587.23L115.91 589.18L116.71 597.59L116.7 597.6ZM69.64 565.34L71.38 583.62L91.45 586.13L89.7 567.75L69.64 565.34V565.34Z" fill="white" />
          <path d="M95.2 670.55L87.69 641.56L67.16 646.89L58.25 649.31L54.95 636.57L63.91 634.34L113.99 621.33L122.9 618.91L135.04 665.78L125.06 668.37L116.19 634.15L97.66 638.96L105.17 667.95L95.19 670.54L95.2 670.55Z" fill="white" />
          <path d="M92.79 747.34L112.66 723.44L106.32 708.96L89.31 716.39L80.89 720.18L75.58 708.04L84.08 704.43L131.5 683.71L139.92 679.92L152.2 707.98C156.65 718.15 160.22 733.41 143.66 740.64C132.95 745.32 124.73 740.98 119.17 734.41L99.14 761.38L98.96 761.46L92.78 747.34H92.79ZM115.5 704.95L121.33 718.26C124.32 725.1 128.92 732.41 138 728.44C147.63 724.23 144.83 716.13 141.76 709.12L136.01 695.99L115.49 704.96L115.5 704.95Z" fill="white" />
          <path d="M162.02 805.64L144.97 779.36L128.07 790.3L149.12 822.76L140.46 828.36L112.3 784.94L120.1 780.01L163.54 751.89L171.23 746.79L199.23 789.96L190.58 795.56L169.69 763.35L153.62 773.76L170.67 800.04L162.01 805.64H162.02Z" fill="white" />
          <path d="M209.18 862.08L188.29 838.74L173.28 852.16L199.08 880.99L191.39 887.86L156.88 849.29L163.83 843.21L202.4 808.71L209.21 802.48L243.52 840.83L235.83 847.7L210.23 819.09L195.96 831.85L216.85 855.2L209.16 862.07L209.18 862.08Z" fill="white" />
          <path d="M210.68 905.72L216.64 898.67L249.65 858.82L255.46 851.65L265.59 860.05L259.63 867.1L227.31 906.12L254.45 928.62L247.87 936.56L210.68 905.72V905.72Z" fill="white" />
          <path d="M272.32 953.26L261.79 946.95L319.71 899.8L332.43 907.42L318.07 980.65L306.11 973.49L310.36 954.52L287.19 940.65L272.33 953.27L272.32 953.26ZM295.13 933.84L312.57 944.28L319.57 913.22L319.4 913.12L295.13 933.83V933.84Z" fill="white" />
          <path d="M409.33 942.51L420.6 946.84L417.2 955.42L398.64 1003.72L395.42 1012.37L385.43 1008.53L369.27 949.3L369.09 949.23L367.05 955.07L354.83 986.88L351.61 995.53L340.34 991.2L343.74 982.62L362.3 934.32L365.52 925.67L376.52 929.9L392.27 987.19L392.45 987.26L394.49 981.42L406.11 951.17L409.33 942.52V942.51Z" fill="white" />
          <path d="M490.69 1013.62C487.03 1020.72 475.31 1032.28 455.93 1028.58C437.8 1025.12 424.83 1010.36 429.4 986.54C433.52 965.03 449.79 952.14 470.43 956.08C487.5 959.33 494.22 971.21 496.08 982.36L483.76 983.01C482.9 976.55 478.75 967.96 468.33 965.97C456.95 963.8 446.55 971.61 443.28 988.68C439.43 1008.74 448.96 1016.95 458.31 1018.74C469.11 1020.8 477.22 1013.95 479.93 1008.17L490.68 1013.62H490.69Z" fill="white" />
          <path d="M557.54 1005.16L526.23 1004.39L525.72 1024.51L564.39 1025.47L564.13 1035.78L512.4 1034.5L512.73 1025.28L514.03 973.55L514.16 964.32L565.6 965.59L565.34 975.9L526.96 974.95L526.48 994.09L557.79 994.86L557.53 1005.17L557.54 1005.16Z" fill="white" />
        </g>
      </g>
      <defs>
        <linearGradient id="paint0_linear_1_4" x1="568.3" y1="494.14" x2="241.8" y2="1028.18" gradientUnits="userSpaceOnUse">
          <stop offset="0.09" stop-color="#015FDB" stop-opacity="0" />
          <stop offset="0.13" stop-color="#015FDB" stop-opacity="0.04" />
          <stop offset="0.2" stop-color="#015FDB" stop-opacity="0.14" />
          <stop offset="0.27" stop-color="#015FDB" stop-opacity="0.3" />
          <stop offset="0.29" stop-color="#015FDB" stop-opacity="0.35" />
          <stop offset="0.42" stop-color="#015FDB" stop-opacity="0.67" />
          <stop offset="0.53" stop-color="#015FDB" stop-opacity="0.91" />
          <stop offset="0.58" stop-color="#015FDB" />
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

type Fields = {
  tagLine?: string;
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

    if (!files.photo?.filepath) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('File needs to be uploaded');
      return;
    }

    const { width = 0, height = 0, ...rest } = await sharp(files.photo.filepath).metadata();

    if (width < IMAGE_DIMENSION || height < IMAGE_DIMENSION) {
      res.writeHead(400).end(`Image dimensions should be at least ${IMAGE_DIMENSION} pixels wide and high`);
      return;
    }

    const resultImageSize = fields.size || IMAGE_DIMENSION;

    return sharp(files.photo.filepath)
      .resize({ width: resultImageSize })
      .composite([
        {
          input: arc(resultImageSize),
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
