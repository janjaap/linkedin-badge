import NextImage from 'next/image';
import { useEffect, useState } from 'react';

import loading from './loading.svg';

const DEFAULT_DELAY = 250; // ms

interface Props {
  ariaValueText: string;
  visibleAfter?: number;
}

export const Spinner = ({ ariaValueText, visibleAfter = DEFAULT_DELAY }: Props) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setVisible(true);
    }, visibleAfter);

    return () => {
      window.clearTimeout(timeoutId);
    };
  });

  return visible ? (
    <NextImage role="progressbar" aria-valuetext={ariaValueText} src={loading.src} width={200} height={200} alt="" />
  ) : null;
};
