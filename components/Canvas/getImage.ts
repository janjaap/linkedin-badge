export function getImage(url: string): Promise<HTMLImageElement | null> {
  const image = new window.Image();

  image.src = url;

  return new Promise((resolve) => {
    image.onload = function () {
      return resolve(image);
    };
    image.onerror = function (error) {
      return resolve(null);
    };
  });
}
