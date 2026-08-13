const mockPage = {
  goto: jest.fn(),
  evaluate: jest.fn(),
  waitForSelector: jest.fn(),
  click: jest.fn(),
  on: jest.fn(),
  close: jest.fn(),
  setViewport: jest.fn(),
  setUserAgent: jest.fn(),
  $$: jest.fn().mockResolvedValue([]),
};

const mockBrowser = {
  newPage: jest.fn().mockResolvedValue(mockPage),
  close: jest.fn(),
};

module.exports = {
  launch: jest.fn().mockResolvedValue(mockBrowser),
  __mockPage: mockPage,
  __mockBrowser: mockBrowser,
};
