export const addKey = (object, key, value = null) => {
  object[key] = value;
  return object;
};

export const remPixels = () =>
  parseFloat(getComputedStyle(document.documentElement).fontSize);
