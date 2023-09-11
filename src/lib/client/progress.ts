import nProgress from 'nprogress'

let progressScheduled: number

export default {
  start() {
    progressScheduled = window.setTimeout(nProgress.start, 120)
  },
  done() {
    window.clearTimeout(progressScheduled)
    nProgress.done()
  },
}
