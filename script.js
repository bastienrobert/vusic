// TODO
// - Set the acceleration
// - Background color alpha between grey and black
// - Popup to ask user to click

// BUGFIX
// - Sometimes, vector field is doing shit

class App {
  constructor() {
    this.canvas = document.getElementById('canvas')
    this.ctx = this.canvas.getContext('2d')

    this.gridSize = 40
    this.grid = vec2.create()
    this.noise = new SimplexNoise()
    this.init()
  }

  init() {
    window.addEventListener('resize', this.onResize.bind(this))
    this.onResize()

    this.now = Date.now()
    this.lastTime = this.now
    this.deltaTime = 0
    this.currentTime = 0

    this.music = new Music('Floorplan - Never Grow Old.mp3')

    this.createVectors()
    this.createDots()
    this.animate()
  }

  createVectors() {
    this.vectors = []
    const [x, y] = this.grid

    for (let i = 0; i * x < this.canvas.width; i++) {
      let col = []
      for (let j = 0; j * y < this.canvas.height; j++) {
        const position = vec2.fromValues(i * x + x / 2, j * y + y / 2)
        const angle =
          (this.noise.noise2D(
            position[0] / 15000 + this.currentTime / 3,
            position[1] / 15000 + this.currentTime / 3
          ) +
            1) *
          Math.PI
        col.push(new Vector(this.canvas, position, angle))
      }
      this.vectors.push(col)
    }
  }

  createDots() {
    this.dots = []

    for (let i = 0; i < 3000; i++) {
      this.dots.push(new Dot(this.canvas))
    }
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this))

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    this.now = Date.now()
    this.deltaTime = (this.now - this.lastTime) / 1000
    this.lastTime = this.now

    this.currentTime += this.deltaTime

    this.setBackground()
    // this.setVectors()
    if (this.music.play) {
      const data = this.music.getData()
      this.setDots(data)
    }
  }

  setBackground() {
    this.ctx.beginPath()
    this.ctx.fillStyle = 'black'
    this.ctx.rect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.fill()
    this.ctx.closePath()
  }

  setVectors() {
    for (let i = 0; i < this.vectors.length; i++) {
      for (let j = 0; j < this.vectors[i].length; j++) {
        const vector = this.vectors[i][j]
        vector.draw()
      }
    }
  }

  setDots(data) {
    this.dots.forEach(dot => {
      const x = Math.floor(dot.position[0] / this.grid[0])
      const y = Math.floor(dot.position[1] / this.grid[1])
      const angle = this.vectors[x][y].angle
      const direction = vec2.fromValues(
        Math.cos(angle) * 2,
        Math.sin(angle) * 2
      )
      const alpha = (data[700] / 255) * 2 + 0.3

      dot.draw(direction, angle, alpha)
    })
  }

  onResize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    vec2.set(
      this.grid,
      this.canvas.width / this.gridSize,
      this.canvas.height / this.gridSize
    )
  }
}

class Vector {
  constructor(canvas, position, angle) {
    this.canvas = canvas
    this.position = position
    this.angle = angle
    this.ctx = this.canvas.getContext('2d')
    this.size = 13
  }

  draw() {
    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.translate(this.position[0], this.position[1])
    this.ctx.rotate(this.angle)
    this.ctx.strokeStyle = '#ff1f5a'
    this.ctx.fillStyle = '#ff1f5a'
    this.ctx.moveTo(-this.size, 0)
    this.ctx.lineTo(this.size, 0)
    this.ctx.lineTo(this.size / 3, -this.size / 4)
    this.ctx.lineTo(this.size / 3, 0)
    this.ctx.stroke()
    this.ctx.fill()
    this.ctx.closePath()
    this.ctx.restore()
  }
}

class Dot {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = this.canvas.getContext('2d')
    this.position = vec2.fromValues(
      this.canvas.width * Math.random(),
      this.canvas.height * Math.random()
    )
    this.size = Math.random() * 4 + 2
    this.alpha = Math.random() * 0.6 + 0.4
  }

  draw(direction, angle = 0, alpha) {
    vec2.add(this.position, this.position, direction)
    if (this.position[0] < 0) {
      vec2.set(this.position, this.canvas.width, this.position[1])
    } else if (this.position[0] > this.canvas.width) {
      vec2.set(this.position, 0, this.position[1])
    }

    if (this.position[1] < 0) {
      vec2.set(this.position, this.position[0], this.canvas.height)
    } else if (this.position[1] > this.canvas.height) {
      vec2.set(this.position, this.position[0], 0)
    }

    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.globalAlpha = this.alpha * alpha
    this.ctx.translate(this.position[0], this.position[1])
    this.ctx.rotate(angle)
    this.ctx.strokeStyle = 'white'
    this.ctx.moveTo(-this.size, this.size / 2)
    this.ctx.lineTo(this.size, this.size / 2)
    this.ctx.lineTo(-this.size, this.size / 2)
    this.ctx.stroke()
    this.ctx.closePath()
    this.ctx.restore()
  }
}

class Music {
  constructor() {
    this.audio = document.getElementById('audio')
    this.audio.crossOrigin = 'anonymous'
    this.play = false
    this.ctx = new (window.AudioContext ||
      window.webkitAudioContext ||
      window.mozAudioContext)()
    this.init()
    this.events()
  }

  init() {
    const source = this.ctx.createMediaElementSource(audio)
    const gainNode = this.ctx.createGain()
    source.connect(gainNode)
    gainNode.connect(this.ctx.destination)
    this.analyser = this.ctx.createAnalyser()
    source.connect(this.analyser)
    this.analyser.fftSize = 2048
    const buffer = this.analyser.frequencyBinCount
    this.data = new Uint8Array(buffer)
  }

  events() {
    document.addEventListener('click', () => {
      if (!this.play) {
        this.audio.play()
        this.audio.muted = false
        this.play = true
      } else {
        this.audio.pause()
        this.play = false
      }
    })
  }

  getData() {
    this.analyser.getByteFrequencyData(this.data)
    return this.data
  }
}

new App()
