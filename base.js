let slides = [
  {
    text: `Use the container buttons on the favorites bar of Grasshopper`,
    highlights: {
      container: `highlight-cyan`,
      buttons: `highlight-cyan`,
      favorites: `highlight-pink`,
      bar: `highlight-pink`,
      Grasshopper: `highlight-green`
    },
    duration: 4200
  },
  {
    text: `You can use this to handle multiple accounts in the same website`,
    highlights: {
      multiple: `highlight-pink`,
      accounts: `highlight-pink`,
      same: `highlight-cyan`,
      website: `highlight-cyan`
    },
    duration: 5000
  }
]

let text_target = document.getElementById(`text_target`)
let progress_bar = document.getElementById(`progress_bar`)
let stage = document.getElementById(`stage`)
let particles_container = document.getElementById(`particles`)
let active_timeouts = []

function clear_all_timeouts() {
  for (let i = 0; i < active_timeouts.length; i++) {
    clearTimeout(active_timeouts[i])
  }

  active_timeouts = []
}

function add_timeout(fn, delay) {
  let id = setTimeout(fn, delay)
  active_timeouts.push(id)
  return id
}

function create_particles() {
  let count = 25

  for (let i = 0; i < count; i++) {
    let p = document.createElement(`div`)
    p.className = `particle`
    let size = Math.random() * 4 + 2
    let left = Math.random() * 100
    let delay = Math.random() * 6
    let duration = Math.random() * 4 + 4

    p.style.width = size + `px`
    p.style.height = size + `px`
    p.style.left = left + `vw`
    p.style.animationDelay = delay + `s`
    p.style.animationDuration = duration + `s`

    if ((i % 2) === 0) {
      p.style.boxShadow = `0 0 10px #00ff88, 0 0 20px #00ff88`
    }
    else {
      p.style.boxShadow = `0 0 10px #00e5ff, 0 0 20px #00e5ff`
    }

    particles_container.appendChild(p)
  }
}

function build_slide_dom(slide_obj) {
  text_target.innerHTML = ``
  let words = slide_obj.text.split(` `)
  let char_elements = []

  for (let w = 0; w < words.length; w++) {
    let word_str = words[w]
    let clean_word = word_str.replace(/[^a-zA-Z0-9]/g, ``)
    let word_span = document.createElement(`span`)
    word_span.className = `word`

    if (slide_obj.highlights[clean_word]) {
      word_span.classList.add(slide_obj.highlights[clean_word])
    }

    for (let c = 0; c < word_str.length; c++) {
      let char_span = document.createElement(`span`)
      char_span.className = `char`
      char_span.textContent = word_str[c]
      word_span.appendChild(char_span)
      char_elements.push(char_span)
    }

    text_target.appendChild(word_span)
  }

  return char_elements
}

function animate_in(chars) {
  for (let i = 0; i < chars.length; i++) {
    add_timeout(() => {
      chars[i].classList.add(`visible`)
    }, i * 22)
  }
}

function animate_out(chars, callback) {
  for (let i = 0; i < chars.length; i++) {
    add_timeout(() => {
      chars[i].classList.remove(`visible`)
      chars[i].classList.add(`exit`)
    }, i * 12)
  }

  let total_exit_time = (chars.length * 12) + 450
  add_timeout(callback, total_exit_time)
}

function run_progress(duration) {
  progress_bar.style.transition = `none`
  progress_bar.style.width = `0%`

  add_timeout(() => {
    progress_bar.style.transition = `width ` + duration + `ms linear`
    progress_bar.style.width = `100%`
  }, 50)
}

function start_presentation() {
  clear_all_timeouts()
  stage.classList.remove(`phase-2`)

  let slide_1 = slides[0]
  let chars_1 = build_slide_dom(slide_1)

  add_timeout(() => {
    animate_in(chars_1)
    run_progress(slide_1.duration)
  }, 100)

  add_timeout(() => {
    animate_out(chars_1, () => {
      stage.classList.add(`phase-2`)
      let slide_2 = slides[1]
      let chars_2 = build_slide_dom(slide_2)

      animate_in(chars_2)
      run_progress(slide_2.duration)
    })
  }, slide_1.duration)
}

create_particles()
start_presentation()

window.addEventListener(`click`, () => {
  start_presentation()
})

window.addEventListener(`keydown`, (e) => {
  if (e.code === `Space`) {
    e.preventDefault()
    start_presentation()
  }
})