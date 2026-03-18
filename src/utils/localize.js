export function pickLocale(enValue, filValue, cebValue, lang = 'fil') {
  if (lang === 'en') {
    return enValue ?? filValue ?? cebValue ?? '';
  }

  if (lang === 'ceb') {
    return cebValue ?? filValue ?? enValue ?? '';
  }

  return filValue ?? enValue ?? cebValue ?? '';
}

export function getLocalizedField(record, baseKey, lang = 'fil') {
  if (!record) {
    return '';
  }

  return pickLocale(
    record[`${baseKey}_en`],
    record[`${baseKey}_fil`],
    record[`${baseKey}_ceb`],
    lang
  );
}
