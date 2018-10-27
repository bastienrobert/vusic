class App {
  constructor() {
    this.canvas = document.getElementById('canvas')
    this.ctx = this.canvas.getContext('2d')
    this.ui = {
      global: document.getElementById('ui'),
      audio: document.getElementById('audio'),
      center: document.getElementById('center'),
      text: document.getElementById('text'),
      loader: document.getElementById('loader'),
      file: document.getElementById('file'),
      sample: document.getElementById('sample'),
      name: document.getElementById('name')
    }
    this.texts = {
      choose: 'Choose a song 💿',
      click: 'Click to play 🙉',
      resume: 'Click to resume 🌝',
      sample: 'Floorplan - Never grow old'
    }

    this.controls = 3
    this.gridSize = 30
    this.bpm = 132
    this.grid = vec2.create()
    this.noise = new SimplexNoise()
    this.init()
  }

  init() {
    this.now = Date.now()
    this.lastTime = this.now
    this.deltaTime = 0
    this.currentTime = 0

    this.ui.text.innerHTML = this.texts.choose
    this.ui.sample.innerHTML = this.texts.sample

    window.addEventListener('resize', this.onResize.bind(this))
    document.addEventListener('click', this.onClick.bind(this))
    document.addEventListener('touchstart', this.onClick.bind(this))
    document.addEventListener('mousemove', this.onMouseMove.bind(this))
    this.ui.file.addEventListener('change', this.setSong.bind(this))
    this.ui.sample.addEventListener('click', this.setSample.bind(this))

    this.onResize()

    this.ui.audio.addEventListener('ended', () => {
      this.ui.audio.currentTime = 0
      this.pause()
    })
  }

  setSong() {
    const file = this.ui.file.files[0]
    if (!file || file.type !== 'audio/mp3') return

    this.music = new Music(this.ui.audio, file)
    this.ui.name.innerHTML = file.name
    this.ui.sample.classList.remove('active')
    this.ui.sample.classList.add('hidden')
    this.ui.text.innerHTML = this.texts.click
    this.animate()
  }

  setSample() {
    this.ui.sample.classList.add('active')

    fetch(
      'https://res.cloudinary.com/bastienrobert/video/upload/v1540562732/Floorplan_-_Never_Grow_Old_wt3mkg.mp3'
    )
      .then(res => res.blob())
      .then(file => {
        this.music = new Music(this.ui.audio, file)
        this.ui.text.innerHTML = this.texts.click
        this.animate()
      })
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
            position[0] / 3000 + this.currentTime / 2,
            position[1] / 3000 + this.currentTime / 2
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

    for (let i = 0; i < 4000; i++) {
      this.dots.push(new Dot(this.canvas))
    }
  }

  play() {
    this.music.audio.play()
    this.music.audio.muted = false
    this.music.play = true

    this.ui.global.classList.add('hidden')
  }

  pause() {
    this.music.audio.pause()
    this.music.play = false
    this.ui.text.innerHTML = this.texts.resume

    this.ui.audio.classList.remove('visible')
    this.ui.global.classList.remove('hidden')
  }

  animate() {
    this.raf = requestAnimationFrame(this.animate.bind(this))

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    this.now = Date.now()
    this.deltaTime = (this.now - this.lastTime) / 1000
    this.lastTime = this.now

    this.currentTime += this.deltaTime

    const data = this.music.getData()
    this.setBackground(data)

    if (data[4] > 140) {
      this.setVectors()
    }

    if (this.music.play) {
      this.controls = this.controls - this.deltaTime
      const kick = data[140] > 140
      this.setDots(data, kick)
    }

    if (this.controls <= 0) {
      this.ui.audio.classList.remove('visible')
    }
  }

  setBackground(data) {
    const color = Math.min(20, data[4] / 5)
    this.ctx.beginPath()
    this.ctx.fillStyle = `rgb(${color}, ${color}, ${color})`
    // this.ctx.fillStyle = 'black'
    this.ctx.rect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.fill()
    this.ctx.closePath()
  }

  setVectors() {
    for (let i = 0; i < this.vectors.length; i++) {
      for (let j = 0; j < this.vectors[i].length; j++) {
        const vector = this.vectors[i][j]
        const angle =
          (this.noise.noise2D(
            vector.position[0] / 3000 + this.currentTime / 2,
            vector.position[1] / 3000 + this.currentTime / 2
          ) +
            1) *
          Math.PI
        vector.setAngle(angle)
      }
    }
  }

  debugVectors() {
    for (let i = 0; i < this.vectors.length; i++) {
      for (let j = 0; j < this.vectors[i].length; j++) {
        const vector = this.vectors[i][j]
        vector.draw()
      }
    }
  }

  setDots(data, kick = false) {
    this.dots.forEach(dot => {
      const x = Math.floor(dot.position[0] / this.grid[0]) % this.vectors.length
      const y =
        Math.floor(dot.position[1] / this.grid[1]) % this.vectors[x].length
      const angle = this.vectors[x][y].angle
      const direction = vec2.fromValues(
        Math.cos(angle) * 2 * Math.pow(Math.abs(data[4] - 70) / 128, 4),
        Math.sin(angle) * 2 * Math.pow(Math.abs(data[4] - 70) / 128, 4)
      )
      const alpha = (data[88] / 255) * 2 + 0.3

      dot.draw(direction, angle, alpha, kick)
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
    this.createVectors()
    this.createDots()
  }

  onMouseMove() {
    if (this.controls < 0 && this.music.play) {
      this.controls = 3
      this.ui.audio.classList.add('visible')
    }
  }

  onClick() {
    if (!this.music) return
    this.music.play ? this.pause() : this.play()
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

  setAngle(angle) {
    this.angle = angle
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
    const velocity = Math.random() * 2
    this.velocity = vec2.fromValues(velocity, velocity)
    this.color = `rgba(${Math.random() * 255}, ${Math.random() *
      255}, ${Math.random() * 255})`
  }

  draw(direction, angle = 0, alpha, kick) {
    vec2.multiply(direction, direction, this.velocity)
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

    const size = kick ? Math.random() * this.size + 8 : this.size

    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.globalAlpha = this.alpha * alpha
    this.ctx.translate(this.position[0], this.position[1])
    this.ctx.rotate(angle)
    this.ctx.strokeStyle = kick ? this.color : 'white'
    this.ctx.moveTo(-size, size / 2)
    this.ctx.lineTo(size, size / 2)
    this.ctx.lineTo(-size, size / 2)
    this.ctx.stroke()
    this.ctx.closePath()
    this.ctx.restore()
  }
}

class Music {
  constructor(el, file) {
    this.audio = el
    this.audio.src = URL.createObjectURL(file)
    this.audio.crossOrigin = 'anonymous'
    this.play = false
    this.ctx = new (window.AudioContext ||
      window.webkitAudioContext ||
      window.mozAudioContext)()
    this.init()
  }

  init() {
    const source = this.ctx.createMediaElementSource(audio)

    const gainNode = this.ctx.createGain()
    source.connect(gainNode)
    gainNode.connect(this.ctx.destination)
    this.analyser = this.ctx.createAnalyser()
    source.connect(this.analyser)
    this.analyser.fftSize = 1024
    const buffer = this.analyser.frequencyBinCount
    this.data = new Uint8Array(buffer)
  }

  getData() {
    this.analyser.getByteFrequencyData(this.data)
    return this.data
  }
}

new App()
