const path = require('path')
const cwd = process.cwd()

const patterns = [
  /Could not resolve .* from (.*)/i
]

function getTriggerrer (error) {
  if (error.loc && error.loc.file) {
    return error.loc.file
  } else {
    if (!error.message) return false
    for (let i = 0; i < patterns.length; i++) {
      const regexp = patterns[i]
      const res = error.message.match(regexp)
      if (res && res[1]) return path.resolve(cwd, res[1])
    }
  }
  return false
}

module.exports = getTriggerrer
