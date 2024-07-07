//

const production = {
  ws: 'wss://checkboxes.onequadrillion.com:3000/proto',
  http: 'https://checkboxes.onequadrillion.com:8000',
}

const development = {
  ws: 'ws://localhost:3000/proto',
  http: 'http://localhost:8000',
}

export const config = process.env.NODE_ENV === 'production' ? production : development
