//

const production = {
  ws: 'wss://checkboxes.onequadrillion.com/proto',
  http: 'https://checkboxes.onequadrillion.com/pages',
}

const development = {
  ws: 'ws://localhost:3000/proto',
  http: 'http://localhost:8000/pages',
}

export const config = process.env.NODE_ENV === 'production' ? production : development
