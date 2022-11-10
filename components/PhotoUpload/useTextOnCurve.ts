import { useState } from 'react';

export async function useTextOnCurve(size: number, text: string) {
  const [fontBlob, setFontBlob] = useState<FileReader['result']>();

  const fontBase = 42; //px
  const numCharacters = text.length;
  const fontSize = fontBase + (10 - numCharacters) * 2;

  // console.log({ numCharacters, fontSize });

  const radius = (size / 2) * (0.92 + (10 - numCharacters) * 0.05);
  const startX = size / 2 - radius;
  const pathData = 'M' + startX + ',' + size / 2 + ' ' + 'a' + radius + ',' + radius + ' 0 0 0 ' + 2 * radius + ',0';

  const fetchResponse = await fetch(
    'https://fonts.gstatic.com/s/librefranklin/v13/jizOREVItHgc8qDIbSTKq4XkRg8T88bjFuXOnduh8MKkD9DJX-I.woff2'
  );
  const blob = await fetchResponse.blob();

  const fileReader = new FileReader();
  fileReader.addEventListener('load', () => {
    setFontBlob(fileReader.result);
  });
  fileReader.readAsDataURL(blob);

  const template = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <path d="${pathData}" id="curvedTextPath" />
        <style>
          @font-face {
            font-family: 'librefranklin';
            src: url(data:font/woff2;base64,${fontBlob}) format('woff2');
          }
        </style>
      </defs>

      <text fill="#ffffff" font-size="${fontSize}px" font-family="librefranklin">
        <textPath startOffset="0%" xlink:href="#curvedTextPath">${text.toUpperCase()}</textPath>
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(template)}`;
}
