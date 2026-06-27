import * as states from './county-by-state.json'
import * as results from './report-results.json'

// --- Form selects - create state & county select ---

// Active elements must be first - sort them and add to the select
let statesSelectActive = states.reduce(function (myArray, elToAdd) {
  if (elToAdd.isActive && myArray.indexOf(elToAdd.state) === -1) {
    myArray.push(elToAdd.state)
  }
  return myArray
}, []),
  statesSelectInactive = states.reduce(function (myArray, elToAdd) {
    if (!elToAdd.isActive && myArray.indexOf(elToAdd.state) === -1) {
      myArray.push(elToAdd.state)
    }
    return myArray
  }, [])
for (let i = 0; i < statesSelectActive.length; ++i) {
  let child = document.createElement('option')
  child.textContent = statesSelectActive[i]
  document.querySelector('.select-state').appendChild(child)
}
for (let i = 0; i < statesSelectInactive.length; ++i) {
  let child = document.createElement('option')
  child.textContent = statesSelectInactive[i]
  child.setAttribute('disabled',true)
  document.querySelector('.select-state').appendChild(child)
}

createCountySelect()

function createCountySelect () {
  let countySelectActive = states.reduce(function (myArray, elToAdd) {
    if (elToAdd.isActive && elToAdd.state == document.querySelector('.select-state').value) {
      myArray.push({
        name: elToAdd.county,
        disabled: false
      })
    }
    return myArray
  }, []),
    countySelectInactive = states.reduce(function (myArray, elToAdd) {
      if (!elToAdd.isActive && elToAdd.state == document.querySelector('.select-state').value) {
        myArray.push({
          name: elToAdd.county,
          disabled: true
        })
      }
      return myArray
    }, []),
    countySelect = countySelectActive.concat(countySelectInactive)
  for (let i = 0; i < countySelect.length; ++i) {
    let child = document.createElement('option')
    child.textContent = countySelect[i].name
    if (countySelect[i].disabled) {
      child.setAttribute('disabled',true)
    }
    document.querySelector('.select-county').appendChild(child)
  }
}



// --- Results page ---

// Add top info
document.querySelector('.results-state').textContent =  document.querySelector('.select-state').value
document.querySelector('.results-county').textContent =  document.querySelector('.select-county').value + ' County'

// Create result blocks

let temp = document.querySelector('.block-template')

createResults()

function createResults () {
  // Remove old data
  document.querySelector('.results-blocks').innerHTML = ''

  // Add new blocks
  results.forEach(function (item) {
    if (item.county == document.querySelector('.select-county').value) {
      item.results.forEach(function (item, i) {
        // Clone template
        let clon = temp.content.cloneNode(true)
        document.querySelector('.results-blocks').appendChild(clon)
        let currBlock = document.querySelector('.results-blocks .block:nth-child('+(i+1)+')')

        // Feed data
        currBlock.querySelector('.location-latlng').textContent = item.latlng
        currBlock.querySelector('.location-risk span').textContent = item.risk
        currBlock.querySelector('.location-risk').classList.add(item.risk.toLowerCase())
        currBlock.querySelector('.location-temp b').textContent = item.temperature + ' ℃'
        currBlock.querySelector('.location-humidity b').textContent = item.humidity + ' RH2M'
        currBlock.querySelector('.location-moisture b').textContent = item.soilMoisture
        currBlock.querySelector('.location-growth b').textContent = item.growthRate
        currBlock.querySelector('.block-main-left p').textContent = item.assessmentText
        currBlock.querySelector('.block-main-right img').setAttribute('src', item.image)
      })
    }
  })

  // Date and power line are the same for all blocks
  let today = new Date(),
      days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
      months = ['January','February','March','April','May','June','July','August','September','October','November','December'],
      date = days[today.getDay()]+ ', '+today.getDate()+ ' '+months[today.getMonth()]+ ' '+today.getFullYear()
  document.querySelectorAll('.block-date').forEach(function (node) {
    node.textContent = date
  })
  document.querySelectorAll('.location-power').forEach(function (node) {
    node.textContent =  document.querySelector('.select-power').value
  })
}



// --- Select ---

// Slide animations

function slideUp (target, duration = 400) {
  target.style.transitionProperty = 'height, margin, padding'
  target.style.transitionDuration = duration + 'ms'
  target.style.boxSizing = 'border-box'
  target.style.height = target.offsetHeight + 'px'
  target.offsetHeight
  target.style.overflow = 'hidden'
  target.style.height = 0
  target.style.paddingTop = 0
  target.style.paddingBottom = 0
  target.style.marginTop = 0
  target.style.marginBottom = 0
  window.setTimeout( () => {
    target.style.display = 'none'
    target.style.removeProperty('height')
    target.style.removeProperty('padding-top')
    target.style.removeProperty('padding-bottom')
    target.style.removeProperty('margin-top')
    target.style.removeProperty('margin-bottom')
    target.style.removeProperty('overflow')
    target.style.removeProperty('transition-duration')
    target.style.removeProperty('transition-property')
  }, duration)
}

function slideDown (target, duration = 400) {
  target.style.removeProperty('display')
  let display = window.getComputedStyle(target).display
  if (display === 'none')
    display = 'block'
  target.style.display = display
  let height = target.offsetHeight
  target.style.overflow = 'hidden'
  target.style.height = 0
  target.style.paddingTop = 0
  target.style.paddingBottom = 0
  target.style.marginTop = 0
  target.style.marginBottom = 0
  target.offsetHeight
  target.style.boxSizing = 'border-box'
  target.style.transitionProperty = "height, margin, padding"
  target.style.transitionDuration = duration + 'ms'
  target.style.height = height + 'px'
  target.style.removeProperty('padding-top')
  target.style.removeProperty('padding-bottom')
  target.style.removeProperty('margin-top')
  target.style.removeProperty('margin-bottom')
  window.setTimeout( () => {
    target.style.removeProperty('height')
    target.style.removeProperty('overflow')
    target.style.removeProperty('transition-duration')
    target.style.removeProperty('transition-property')
  }, duration)
}

function slideToggle (target, duration = 400) {
  if (window.getComputedStyle(target).display === 'none') {
    return slideDown(target, duration)
  } else {
    return slideUp(target, duration)
  }
}

// Create selects

function createSelect (node) {
  node.classList.add('base-select')
  let mySelectedOptions = node.selectedOptions

  let optionsTable = [],
      optionSelected = 0,
      optionDisabled = 0

  // Add all option to the table
  node.querySelectorAll('option').forEach(function(node2) {
    for (let i = 0; i < mySelectedOptions.length; ++i) {
      if (node2 == mySelectedOptions[i]) {
        optionSelected = 1
        break
      } else {
        optionSelected = 0
      }
    }
    if (node2.disabled){
      optionDisabled = 1
    } else {
      optionDisabled = 0
    }
    optionsTable.push({ value: node2.value, text: node2.textContent, selected: optionSelected, disabled: optionDisabled })
  })

  // Create a new selectyummy

  let newSelectDiv = document.createElement('div'),
      newSelectButton = document.createElement('button'),
      newSelectUl = document.createElement('ul')
  newSelectDiv.classList.add('selectyummy')
  newSelectButton.classList.add('selectyummy-select')
  newSelectUl.classList.add('selectyummy-options')
  newSelectDiv.appendChild(newSelectButton)
  newSelectDiv.appendChild(newSelectUl)
  node.after(newSelectDiv)
  if (node.multiple){
    newSelectDiv.classList.add('selectyummy-multiple')
  }

  // Add options to selectyummy
  let selectedOption = false,
      selectString = ''
  for (let i=0; i < optionsTable.length; ++i){
    let optionClass= '',
        newOption = document.createElement('li')

    // Selected option
    if (optionsTable[i].selected){
      newOption.classList.add('active')
      selectedOption = true
      if (selectString != '') {
        selectString = selectString + ', '
      }
      selectString = selectString + optionsTable[i].text
      newSelectButton.textContent = selectString

    // No selected options and a placeholder
    } else if (node.getAttribute('placeholder') && (optionsTable[0].text == '' || node.multiple) && (! selectedOption || optionsTable[0].selected)) {
      newSelectButton.textContent = node.getAttribute('placeholder')
    }

    // Disabled option
    if (optionsTable[i].disabled){
      newOption.classList.add('disabled')
    }

    newOption.setAttribute('data-value', optionsTable[i].value)
    newOption.textContent = optionsTable[i].text
    newSelectUl.appendChild(newOption)
  }

  // If you want to block the selectyummy's width - use this line:
  // newSelectDiv.style.width = newSelectDiv.innerWidth + 'px'

  // Click a select

  newSelectButton.addEventListener('click', function(e) {
    e.preventDefault()
    slideToggle(e.target.nextElementSibling)
    e.target.parentElement.classList.toggle('active')
  })
}

function recreateSelect (node) {
  node.nextElementSibling.remove()
  createSelect(node)
}

document.querySelectorAll('select').forEach(function(node) {
  createSelect(node)
})

// Select changer

document.querySelectorAll('.base-select').forEach(function(node) {
  node.addEventListener('change', function(e) {
    let mySelectYummy = node.nextElementSibling,
        baseSelect = node

    // Single select activates clicked options
    if (! mySelectYummy.classList.contains('selectyummy-multiple')){
      let activeOption = mySelectYummy.querySelector('li[data-value="' + baseSelect.value + '"]')
      mySelectYummy.querySelectorAll('.selectyummy-options li').forEach(function(node1) {
        node1.classList.remove('active')
      })
      activeOption.classList.add('active')
      mySelectYummy.querySelector('.selectyummy-select').textContent = activeOption.textContent
      if (baseSelect.getAttribute('placeholder') && activeOption.textContent == ''){
        mySelectYummy.querySelector('.selectyummy-select').textContent = baseSelect.getAttribute('placeholder')
      }

    // Multiple select adds option name to the list
    } else {
      mySelectYummy.querySelectorAll('.selectyummy-options li').forEach(function(node1) {
        node1.classList.remove('active')
      })
      let optionsSelected = []
      for (let i = 0; i < baseSelect.options.length; ++i) {
        if (baseSelect.options[i].selected) {
          optionsSelected.push(baseSelect.options[i].value || baseSelect.options[i].text)
        }
      }
      for (let i = 0; i < optionsSelected.length; ++i) {
        let clicked = mySelectYummy.querySelector('li[data-value="' + optionsSelected[i] + '"]').classList.add('active')
      }
      let selectString = ''

      mySelectYummy.querySelectorAll('.selectyummy-options li').forEach(function(selectOption) {
        if (selectOption.classList.contains('active')){
          if (selectString != '') {
            selectString = selectString + ', '
          }
          selectString = selectString + selectOption.textContent
        }
      })

      mySelectYummy.querySelector('.selectyummy-select').textContent = selectString
      if (baseSelect.getAttribute('placeholder') && selectString == ''){
        mySelectYummy.querySelector('.selectyummy-select').textContent = baseSelect.getAttribute('placeholder')
      }
    }
  })
})

// Click a dropdown item

document.querySelectorAll('.selectyummy-options li').forEach(function(node) {
  node.addEventListener('click', function(e) {
    let mySelectYummy = node.closest('.selectyummy'),
        myBaseSelect = mySelectYummy.previousElementSibling

    if (! mySelectYummy.classList.contains('selectyummy-multiple')){
      myBaseSelect.value = this.getAttribute('data-value')
      // Single selects should close when the option is clicked
      slideUp(mySelectYummy.querySelector('.selectyummy-options'))
      mySelectYummy.classList.remove('active')
    } else {
      if (myBaseSelect.querySelector('option[value="' + node.getAttribute('data-value') + '"]').selected == false) {
        myBaseSelect.querySelector('option[value="' + node.getAttribute('data-value') + '"]').selected = true
      } else {
        myBaseSelect.querySelector('option[value="' + node.getAttribute('data-value') + '"]').selected = false
      }
    }

    if ('createEvent' in document) {
      let evt = document.createEvent('HTMLEvents')
      evt.initEvent('change', false, true)
      myBaseSelect.dispatchEvent(evt)
    }
    else {
      myBaseSelect.fireEvent('onchange')
    }
  })
})

// Hide dropdown when we clicked outside

document.addEventListener('mouseup', function(e){
  let selectContainer = document.querySelector('.selectyummy.active')
  if (selectContainer) {
    let me = e.target,
        myParents = []
    while (me) {
      myParents.unshift(me)
      me = me.parentNode
    }
    if (selectContainer != e.target && ! myParents.includes(selectContainer)){
      slideUp(selectContainer.querySelector('.selectyummy-options'))
      selectContainer.classList.remove('active')
    }
  }
})

// Keyboard

document.addEventListener('keydown', function(e){
  let selectContainer = document.querySelector('.selectyummy.active')
  if ((e.keyCode === 40 || e.keyCode === 38) && selectContainer) { // Down or Up
    e.preventDefault()
    let me = document.querySelector('.selectyummy.active'),
        currentHoveredOption = me.querySelector('.selectyummy-options li.hover'),
        newHoveredOption,
        options = me.querySelectorAll('.selectyummy-options li:not(.disabled)')

    // The last and first element
    if (! currentHoveredOption) {
      if (e.keyCode === 40) { // down
        newHoveredOption = options[0]
      } else { // up
        newHoveredOption = options[options.length - 1]
      }

    // Use keys to go to the option
    } else {
      if (e.keyCode === 40) { // down
        while (currentHoveredOption) {
          if (currentHoveredOption.nextElementSibling) {
              if (currentHoveredOption.nextElementSibling.classList.contains('disabled')) {
                currentHoveredOption = currentHoveredOption.nextElementSibling
              } else {
                newHoveredOption = currentHoveredOption.nextElementSibling
                break
              }
          } else {
            newHoveredOption = options[0]
            break
          }
        }
      } else { // up
        while (currentHoveredOption) {
          if (currentHoveredOption.previousElementSibling) {
              if (currentHoveredOption.previousElementSibling.classList.contains('disabled')) {
                currentHoveredOption = currentHoveredOption.previousElementSibling
              } else {
                newHoveredOption = currentHoveredOption.previousElementSibling
                break
              }
          } else {
            newHoveredOption = options[options.length - 1]
            break
          }
        }
      }

      me.querySelector('.selectyummy-options li.hover').classList.remove('hover')
    }

    // Hover the option
    newHoveredOption.classList.add('hover')

    // Scroll the box to the option so we can see everything
    let offset = newHoveredOption.offsetTop
    me.querySelector('.selectyummy-options').scroll({
      top: offset,
      left: 0,
      behavior: 'smooth'
    })
  }

  if (e.keyCode === 13 && selectContainer) { // Enter
    // When option is hovered, Enter will click it
    e.preventDefault()
    document.querySelector('.selectyummy.active .selectyummy-options li.hover').click()
  }

  if (e.keyCode === 9 && selectContainer) { // Tab
    // When selectyummy is opened, tab closes and deactivates it
    slideUp(document.querySelector('.selectyummy.active .selectyummy-options'))
    document.querySelector('.selectyummy.active').classList.remove('active')
  }
})

// Reset the 'hover' class (needed for keyboard) when we truly hover another element

document.querySelectorAll('.selectyummy.active .selectyummy-options li').forEach(function(node) {
  node.addEventListener('mouseenter', function(e) {
    document.querySelector('.selectyummy.active .selectyummy-options li.hover').classList.remove('hover')
  })
})



// --- Form selects change ---
// (do not put this above --- Select --- !)

// On state change: recreate county select and results
document.querySelector('.select-state').addEventListener('change', function(e) {
  document.querySelector('.results-state').textContent =  document.querySelector('.select-state').value
  document.querySelector('.select-county').innerHTML = ''
  createCountySelect()
  recreateSelect(document.querySelector('.select-county'))
  document.querySelector('.select-county').classList.remove('blocked')
  document.querySelector('.results-county').textContent =  document.querySelector('.select-county').value + ' County'
  createResults()
})

// On county change: recreate results
document.querySelector('.select-county').addEventListener('change', function(e) {
  document.querySelector('.results-county').textContent =  document.querySelector('.select-county').value + ' County'
  createResults()
})

// On power change: recreate results
document.querySelector('.select-power').addEventListener('change', function(e) {
  createResults()
})



// --- Flow ---

function goToHome () {
  document.querySelector('.page-content--video2 video').pause()
  document.querySelector('.page-content--video2 video').currentTime = 0
  document.querySelector('.page--main').classList.add('inactive')
  document.querySelector('.popup-wrapper').classList.add('inactive')
  setTimeout(function(){
    document.querySelectorAll('.page--main .page-content').forEach(function(node) {
      node.classList.add('inactive')
    })
    document.querySelector('.page-content--form').classList.remove('inactive')
  }, 500)
  document.querySelector('.page--home').classList.remove('inactive')
}

// home -> video1
document.querySelector('.button--home').addEventListener('click', function(e){
  e.preventDefault()
  document.querySelector('.page-content--start').classList.add('inactive')
  document.querySelector('.page-content--video1').classList.remove('inactive')
  setTimeout(function () {
    document.querySelector('.page-content--video1 video').play()
  }, 500)
})

// video1 -> form
document.querySelector('.page-content--video1 video').addEventListener('ended', function () {
  document.querySelector('.page--home').classList.add('inactive')
  document.querySelector('.page-content--start').classList.remove('inactive')
  document.querySelector('.page-content--video1').classList.add('inactive')
  document.querySelector('.page--main').classList.remove('inactive')
  document.querySelector('.page-content--form').classList.remove('inactive')
  document.querySelector('.select-state').focus()
  checkActivity()
})

// form -> video2
document.querySelector('.button--form').addEventListener('click', function(e){
  e.preventDefault()
  document.querySelector('.page-content--form').classList.add('inactive')
  document.querySelector('.page-content--video2').classList.remove('inactive')
  document.querySelector('.page-left').scrollTop = 0
  document.querySelector('.page-content--video2 video').play()
})

// video2 -> results
document.querySelector('.page-content--video2 video').addEventListener('ended', function () {
  document.querySelector('.page-content--video2').classList.add('inactive')
  document.querySelector('.page-left').scrollTop = 0
  document.querySelector('.page-content--results').classList.remove('inactive')
  checkActivity()
})

// any page -> home
document.querySelector('.button--right-home').addEventListener('click', function(e){
  goToHome()
})



// --- Popup ---

let timeout2

// Change popup text every second
function popupCounter (myTime) {
  timeout2 = setTimeout(function () {
    myTime--
    document.querySelector('.popup-time span').textContent = myTime
    if (myTime <= 0) {
      // Reset to home, clear popup timeout
      goToHome()
      clearTimeout(timeout2)
    } else {
      // Go to next second
      popupCounter(myTime)
    }
  }, 1000)
}

function showPopup () {
  document.querySelector('.popup-time span').textContent = 10
  document.querySelector('.popup-wrapper').classList.remove('inactive')
  document.querySelector('body').classList.add('nooverflow')

  // Start timeout
  let myTime = 10
  popupCounter(myTime)
}

// Close popup, clear its timeout
document.querySelectorAll('.popup-close, .button--popup-close, .popup-overlay').forEach(function(node){
  node.addEventListener('click', function(e){
    document.querySelector('.popup-wrapper').classList.add('inactive')
    document.querySelector('body').classList.remove('nooverflow')
    checkActivity()
    clearTimeout(timeout2)
  })
})



// --- Activity checker ---

let timeout1

function checkActivity () {
  clearTimeout(timeout1)

  // If all the white listed pages are inactive, start the timer
  if (document.querySelector('.page--home').classList.contains('inactive') && document.querySelector('.page-content--video2').classList.contains('inactive')) {
    timeout1 = setTimeout(function () {
      // After a minute show popup
      showPopup()
    }, 60000)
  }
}

// Every time we click or move the checkActivity timer restarts
document.addEventListener('mouseup', checkActivity)
document.addEventListener('mousedown', checkActivity)
document.addEventListener('touchend', checkActivity)
document.addEventListener('touchstart', checkActivity)
document.addEventListener('mousemove', checkActivity)
document.addEventListener('touchmove', checkActivity)
