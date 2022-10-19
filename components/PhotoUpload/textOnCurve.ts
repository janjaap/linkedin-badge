export function textOnCurve(size: number, text: string) {
  const fontBase = 42; //px
  const numCharacters = text.length;
  const fontSize = fontBase + (10 - numCharacters) * 2;

  // console.log({ numCharacters, fontSize });

  const radius = (size / 2) * (0.92 + (10 - numCharacters) * 0.05);
  const startX = size / 2 - radius;
  const pathData = 'M' + startX + ',' + size / 2 + ' ' + 'a' + radius + ',' + radius + ' 0 0 0 ' + 2 * radius + ',0';

  const template = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <path d="${pathData}" id="curvedTextPath" />
        <style type="text/css">
          @font-face {
            font-family: 'Libre-Franklin';
            font-style: normal;
            font-weight: 600;
            font-display: swap;
            src: url(https://fonts.gstatic.com/s/librefranklin/v13/jizOREVItHgc8qDIbSTKq4XkRg8T88bjFuXOnduh8MKkANDJ.woff2) format('woff2');
          }
        </style>
      </defs>

      <text fill="#ffffff" font-size="${fontSize}px" font-family="Libre-Franklin">
        <textPath startOffset="0%" xlink:href="#curvedTextPath">${text.toUpperCase()}</textPath>
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(template)}`;
}
