module.exports = {
  enhance: () => ({ destroy: () => {} }),
  applyAction: async () => {},
  deserialize: (value) => JSON.parse(value),
}
