const isSamefile = require('./checksum');

test('Should return true if =', () => {
  expect(isSamefile('blue', 'blue')).toBe(true);
});


test('test should return false if not =', () => {
    expect(isSamefile('blue', 'yellow')).toBe(false);
  });

  test('=', () => {
    expect(isSamefile('GR 2.1 The Silk Road Worksheet.docx', 'yellow')).toBe(false);
  });