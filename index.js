require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const cors = require('cors')
const routerNavigation = require('./src')
const socket = require('socket.io')
const http = require('http')

const app = express()
app.use(cors())

const server = http.createServer(app)
const io = socket(server)

io.on('connection', (socket) => {
  console.log('Socket.io Connect !')
})

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(morgan('dev'))
app.use(express.static('uploads'))
app.use('/', routerNavigation)
app.use((request, response, next) => {
  response.header('Access-Control-Allow-Origin', '*')
  response.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Request-With, Content-Type, Accept, Authorization'
  )
  next()
})

app.get('*', (request, response) => {
  response.status(404).send('Path Not Found !')
})

server.listen(process.env.PORT, () => {
  console.log(`Listening on Port ${process.env.PORT}`)
})
