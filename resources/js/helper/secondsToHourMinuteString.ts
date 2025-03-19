const secondsToHourMinuteString = (seconds: number): string => {

  const h = Math.floor(seconds / 3600)
  const m = Math.floor(seconds % 3600 / 60)
  const s = Math.floor(seconds % 3600 % 60)

  const hString = h > 0 ? h + 'h ' : ''
  const mString = m > 0 ? m + 'm ' : ''
  const sString = s > 0 ? s + 's ' : ''

  const resultString = (hString + mString + sString)

  return resultString.length > 0 ? resultString.slice(0, resultString.length - 1) : '0h'
}

export { secondsToHourMinuteString }
