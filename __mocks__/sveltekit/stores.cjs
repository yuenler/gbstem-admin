const { readable } = require('svelte/store')

const page = readable({
  url: new URL('http://localhost/'),
  params: {},
  route: { id: null },
  status: 200,
  error: null,
  data: {},
  form: undefined,
})

module.exports = {
  page,
  navigating: readable(null),
  updated: Object.assign(readable(false), { check: async () => false }),
  getStores: () => ({ page, navigating: readable(null) }),
}
