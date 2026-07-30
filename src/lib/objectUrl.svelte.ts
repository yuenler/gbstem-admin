// Wraps a `Blob`-returning getter in an object URL that revokes the
// previous URL whenever the blob changes (and on unmount) - otherwise
// every recompute of a downloadable blob leaks one.
export function objectUrl(getBlob: () => Blob) {
  let url = $state('')

  $effect(() => {
    const created = URL.createObjectURL(getBlob())
    url = created
    return () => URL.revokeObjectURL(created)
  })

  return {
    get current() {
      return url
    },
  }
}
