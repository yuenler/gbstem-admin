import nProgress from 'nprogress'

let progressScheduled: number
let configured = false

function configure() {
  if (!configured) {
    nProgress.configure({ showSpinner: false })
    configured = true
  }
}

export default {
  start() {
    configure()
    progressScheduled = window.setTimeout(nProgress.start, 120)
  },
  done() {
    configure()
    window.clearTimeout(progressScheduled)
    nProgress.done()
  },
}
