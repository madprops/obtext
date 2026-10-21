let STORAGE_KEY = `obtext_script`

let DEFAULT_SCRIPT = `Use the *container buttons* on the _favorites bar_ of ~Grasshopper~
---
You can use this to handle _multiple accounts_ in the *same website*`

// Inline markup -> highlight classes
let HIGHLIGHT_CLASSES = {
  "*": `highlight-cyan`,
  "_": `highlight-pink`,
  "~": `highlight-green`
}

let MARKUP_REGEX = /(?<![\w*_~])([*_~])(?!\s)(.+?)(?<!\s)\1(?![\w*_~])/g

// Smart timing knobs (ms)
let TIMING = {
  min: 2200,
  max: 15000,
  base_read: 600,
  per_word: 220,
  per_extra_line: 250,
  reveal_tail: 650
}

let text_target = document.getElementById(`text_target`)
let progress_bar = document.getElementById(`progress_bar`)
let stage = document.getElementById(`stage`)
let particles_container = document.getElementById(`particles`)

let btn_editor = document.getElementById(`btn_editor`)
let btn_start = document.getElementById(`btn_start`)
let btn_stop = document.getElementById(`btn_stop`)
let btn_restart = document.getElementById(`btn_restart`)
let dock_status = document.getElementById(`dock_status`)
let slide_counter = document.getElementById(`slide_counter`)

let editor = document.getElementById(`editor`)
let editor_backdrop = document.getElementById(`editor_backdrop`)
let editor_input = document.getElementById(`editor_input`)
let editor_count = document.getElementById(`editor_count`)
let editor_time = document.getElementById(`editor_time`)
let btn_apply = document.getElementById(`btn_apply`)
let btn_editor_close = document.getElementById(`btn_editor_close`)

let slides = []
let active_timeouts = []
let current_chars = []
let current_index = -1
let is_running = false
let is_done = false
let mouse_timer = null

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

// ---------- Parsing ----------

// A line becomes a list of words; each word is a list of parts { text, cls }
// so punctuation glued to a highlight (e.g. "*Grasshopper*.") stays in the same word.
function parse_line(line) {
  let words = []
  let break_next = true

  function push_segment(text, cls) {
    let tokens = text.split(/(\s+)/)

    for (let tok of tokens) {
      if (!tok) {
        continue
      }

      if (/^\s+$/.test(tok)) {
        break_next = true
        continue
      }

      if (!break_next && words.length) {
        words[words.length - 1].push({ text: tok, cls })
      }
      else {
        words.push([{ text: tok, cls }])
      }

      break_next = false
    }
  }

  let last = 0

  for (let m of line.matchAll(MARKUP_REGEX)) {
    push_segment(line.slice(last, m.index), null)
    push_segment(m[2], HIGHLIGHT_CLASSES[m[1]])
    last = m.index + m[0].length
  }

  push_segment(line.slice(last), null)
  return words
}

function get_in_stagger(char_count) {
  return Math.min(22, 1500 / Math.max(char_count, 1))
}

function get_out_stagger(char_count) {
  return Math.min(12, 700 / Math.max(char_count, 1))
}

function compute_duration(lines) {
  let word_count = 0
  let char_count = 0

  for (let line of lines) {
    for (let word of line) {
      word_count += 1

      for (let part of word) {
        char_count += part.text.length
      }
    }
  }

  let reveal = (char_count * get_in_stagger(char_count)) + TIMING.reveal_tail
  let read = TIMING.base_read + (word_count * TIMING.per_word) + ((lines.length - 1) * TIMING.per_extra_line)
  let total = reveal + read

  return Math.round(Math.min(TIMING.max, Math.max(TIMING.min, total)))
}

function parse_script(raw) {
  let chunks = raw.replace(/\r\n?/g, `\n`).split(/^[ \t]*-{3,}[ \t]*$/m)
  let result = []

  for (let chunk of chunks) {
    let raw_lines = chunk.split(`\n`).map(l => l.trim()).filter(Boolean)

    if (!raw_lines.length) {
      continue
    }

    let lines = raw_lines.map(parse_line).filter(l => l.length)

    if (!lines.length) {
      continue
    }

    result.push({ lines, duration: compute_duration(lines) })
  }

  return result
}

// ---------- Rendering / animation ----------

function build_slide_dom(slide_obj) {
  text_target.innerHTML = ``
  let char_elements = []

  for (let line of slide_obj.lines) {
    let line_div = document.createElement(`div`)
    line_div.className = `line`

    for (let word of line) {
      let word_span = document.createElement(`span`)
      word_span.className = `word`

      for (let part of word) {
        let part_span = document.createElement(`span`)
        part_span.className = `part`

        if (part.cls) {
          part_span.classList.add(part.cls)
        }

        for (let c = 0; c < part.text.length; c++) {
          let char_span = document.createElement(`span`)
          char_span.className = `char`
          char_span.textContent = part.text[c]
          part_span.appendChild(char_span)
          char_elements.push(char_span)
        }

        word_span.appendChild(part_span)
      }

      line_div.appendChild(word_span)
    }

    text_target.appendChild(line_div)
  }

  return char_elements
}

function animate_in(chars) {
  let step = get_in_stagger(chars.length)

  for (let i = 0; i < chars.length; i++) {
    add_timeout(() => {
      chars[i].classList.add(`visible`)
    }, i * step)
  }
}

function animate_out(chars, callback) {
  let step = get_out_stagger(chars.length)

  for (let i = 0; i < chars.length; i++) {
    add_timeout(() => {
      chars[i].classList.remove(`visible`)
      chars[i].classList.add(`exit`)
    }, i * step)
  }

  let total_exit_time = (chars.length * step) + 450
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

function reset_progress() {
  progress_bar.style.transition = `width 0.5s cubic-bezier(0.16, 1, 0.3, 1)`
  progress_bar.style.width = `0%`
}

// Exits whatever is currently on screen, then calls back
function clear_stage(callback) {
  let visible = current_chars.filter(c => c.classList.contains(`visible`))
  current_chars = []

  if (!visible.length) {
    text_target.innerHTML = ``
    callback()
    return
  }

  animate_out(visible, () => {
    text_target.innerHTML = ``
    callback()
  })
}

function show_slide(index) {
  let slide = slides[index]
  current_index = index
  stage.classList.toggle(`phase-2`, (index % 2) === 1)

  let chars = build_slide_dom(slide)
  current_chars = chars
  update_ui()

  add_timeout(() => {
    animate_in(chars)
    run_progress(slide.duration)
  }, 60)

  if (index < slides.length - 1) {
    add_timeout(() => {
      animate_out(chars, () => {
        show_slide(index + 1)
      })
    }, slide.duration)
  }
  else {
    add_timeout(() => {
      is_running = false
      is_done = true
      update_ui()
    }, slide.duration + 60)
  }
}

// ---------- Controls ----------

function start_presentation() {
  if (is_running) {
    return
  }

  if (!slides.length) {
    open_editor()
    return
  }

  clear_all_timeouts()
  is_running = true
  is_done = false
  update_ui()
  reset_progress()

  clear_stage(() => {
    show_slide(0)
  })
}

function stop_presentation() {
  clear_all_timeouts()
  is_running = false
  is_done = false
  current_index = -1
  update_ui()
  reset_progress()

  clear_stage(() => {
    stage.classList.remove(`phase-2`)
    update_ui()
  })
}

function restart_presentation() {
  is_running = false
  start_presentation()
}

function toggle_presentation() {
  if (is_running) {
    stop_presentation()
  }
  else {
    start_presentation()
  }
}

function update_ui() {
  let state = is_running ? `running` : (is_done ? `done` : `idle`)
  dock_status.dataset.state = state
  document.body.classList.toggle(`is-running`, is_running)

  let shown = (current_index >= 0) ? (current_index + 1) : `–`
  slide_counter.textContent = shown + ` / ` + slides.length

  btn_start.disabled = is_running || !slides.length
  btn_stop.disabled = !is_running && !current_chars.length
  btn_restart.disabled = !slides.length
}

// ---------- Editor ----------

function format_seconds(ms) {
  let s = ms / 1000
  return (s < 60) ? (`~` + Math.round(s) + `s`) : (`~` + Math.floor(s / 60) + `m ` + Math.round(s % 60) + `s`)
}

function update_editor_meta() {
  let parsed = parse_script(editor_input.value)
  let total = parsed.reduce((acc, s) => acc + s.duration, 0)
  editor_count.textContent = parsed.length + (parsed.length === 1 ? ` slide` : ` slides`)
  editor_time.textContent = format_seconds(total)
}

function is_editor_open() {
  return editor.classList.contains(`open`)
}

function open_editor() {
  editor.classList.add(`open`)
  editor_backdrop.classList.add(`open`)
  editor.setAttribute(`aria-hidden`, `false`)
  update_editor_meta()

  setTimeout(() => {
    editor_input.focus()
  }, 250)
}

function close_editor() {
  editor.classList.remove(`open`)
  editor_backdrop.classList.remove(`open`)
  editor.setAttribute(`aria-hidden`, `true`)
  editor_input.blur()
}

function toggle_editor() {
  if (is_editor_open()) {
    close_editor()
  }
  else {
    open_editor()
  }
}

function load_script(raw) {
  slides = parse_script(raw)
}

function apply_script() {
  let raw = editor_input.value

  try {
    localStorage.setItem(STORAGE_KEY, raw)
  }
  catch (err) {
    // storage may be unavailable (e.g. file:// in some browsers)
  }

  load_script(raw)
  stop_presentation()

  btn_apply.classList.add(`applied`)
  btn_apply.querySelector(`.btn-apply-label`).textContent = `Applied`

  setTimeout(() => {
    btn_apply.classList.remove(`applied`)
    btn_apply.querySelector(`.btn-apply-label`).textContent = `Apply`
    close_editor()
  }, 650)
}

function get_saved_script() {
  try {
    let saved = localStorage.getItem(STORAGE_KEY)

    if (saved !== null) {
      return saved
    }
  }
  catch (err) {
    // ignore
  }

  return DEFAULT_SCRIPT
}

// ---------- Mouse activity (hide cursor + dock while running) ----------

function on_mouse_activity() {
  document.body.classList.add(`mouse-active`)
  clearTimeout(mouse_timer)

  mouse_timer = setTimeout(() => {
    document.body.classList.remove(`mouse-active`)
  }, 1800)
}

// ---------- Wiring ----------

function bind_button(btn, fn) {
  btn.addEventListener(`click`, (e) => {
    e.stopPropagation()
    btn.blur()
    fn()
  })
}

bind_button(btn_editor, toggle_editor)
bind_button(btn_start, start_presentation)
bind_button(btn_stop, stop_presentation)
bind_button(btn_restart, restart_presentation)
bind_button(btn_apply, apply_script)
bind_button(btn_editor_close, close_editor)

editor_backdrop.addEventListener(`click`, close_editor)
editor_input.addEventListener(`input`, update_editor_meta)

editor_input.addEventListener(`keydown`, (e) => {
  if ((e.ctrlKey || e.metaKey) && (e.key === `Enter`)) {
    e.preventDefault()
    apply_script()
  }
  else if (e.key === `Escape`) {
    e.preventDefault()
    close_editor()
  }
})

window.addEventListener(`keydown`, (e) => {
  if (e.target === editor_input) {
    return
  }

  if (e.ctrlKey || e.metaKey || e.altKey) {
    return
  }

  if (e.code === `Space`) {
    e.preventDefault()
    toggle_presentation()
  }
  else if (e.code === `KeyR`) {
    restart_presentation()
  }
  else if (e.code === `KeyE`) {
    e.preventDefault()
    toggle_editor()
  }
  else if (e.code === `Escape`) {
    if (is_editor_open()) {
      close_editor()
    }
  }
})

window.addEventListener(`mousemove`, on_mouse_activity)

// ---------- Init ----------

create_particles()
editor_input.value = get_saved_script()
load_script(editor_input.value)
update_ui()