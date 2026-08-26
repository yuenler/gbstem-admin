module.exports = {
  page: {
    url: new URL('http://localhost/'),
    params: {},
    route: { id: null },
    status: 200,
    error: null,
    data: {},
    form: undefined,
  },
  navigating: { from: null, to: null, type: null },
  updated: { current: false, check: async () => false },
}
