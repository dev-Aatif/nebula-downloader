/* eslint-disable */
const http = require('http')

function check() {
  const req = http.request(
    {
      host: '127.0.0.1',
      port: 5000,
      path: '/api/status',
      method: 'GET'
    },
    (res) => {
      console.log(`API Status: ${res.statusCode}`)
      if (res.statusCode === 200) process.exit(0)
    }
  )

  req.on('error', (e) => {
    console.log('API Down...')
    setTimeout(check, 1000)
  })

  req.end()
}

console.log('Probing API...')
check()
