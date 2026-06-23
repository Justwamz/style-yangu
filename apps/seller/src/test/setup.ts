import '@testing-library/jest-dom'

// jsdom does not implement URL.createObjectURL
if (typeof URL.createObjectURL === 'undefined') {
  Object.defineProperty(URL, 'createObjectURL', {
    writable: true,
    value: (_blob: Blob) => 'blob:mock-url',
  })
}
