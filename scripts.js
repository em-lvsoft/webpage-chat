document.addEventListener('DOMContentLoaded', () => {
  // Generate a unique ID for the user
  const uniqueId = generateUniqueId()

  // Set the runtime, version and API key for the Voiceflow Dialog API
  const voiceflowRuntime = 'general-runtime.voiceflow.com'
  const voiceflowVersionID =
    document.getElementById('vfassistant').getAttribute('data-version') ||
    'production'
  const voiceflowAPIKey = 'VOICEFLOW_API_KEY'

  let audio = new Audio()
  const wave = document.getElementById('wave')
  const input = document.getElementById('user-input')
  const responseContainer = document.getElementById('response-container')
  const inputPlaceholder = document.getElementById('input-placeholder')
  const inputFieldContainer = document.getElementById('input-container')

  var instance = new SiriWave({
    container: document.getElementById('wave'),
    width: 300,
    height: 120,
    autostart: false,
    curveDefinition: [
      {
        attenuation: -2,
        lineWidth: 0.25,
        opacity: 0.1,
      },
      {
        attenuation: -6,
        lineWidth: 0.15,
        opacity: 0.2,
      },
      {
        attenuation: 4,
        lineWidth: 0.05,
        opacity: 0.4,
      },
      {
        attenuation: 2,
        lineWidth: 0.15,
        opacity: 0.6,
      },
      {
        attenuation: 1,
        lineWidth: 0.2,
        opacity: 0.9,
      },
    ],
  })

  inputFieldContainer.addEventListener('click', () => {
    input.focus()
  })

  // Show the 'start here' text with fadeIn animation after 3 seconds
  setTimeout(() => {
    inputPlaceholder.style.animation = 'fadeIn 0.5s forwards'
  }, 3000)

  // Hide 'start here' text with fadeOut animation on input field click
  input.addEventListener('click', () => {
    if (!inputPlaceholder.classList.contains('hidden')) {
      inputPlaceholder.style.animation = 'fadeOut 0.5s forwards'
      setTimeout(() => {
        inputPlaceholder.classList.add('hidden')
      }, 500)
    }
  })

  // Fetch random background image from Unsplash API
  fetch(`https://source.unsplash.com/random?beautiful+landscape+nature`)
    .then((response) => {
      // Check if the request was successful
      if (response.ok) {
        // Set the image source to the URL of the random landscape image
        document.getElementById(
          'background'
        ).style.backgroundImage = `url(${response.url})`
      } else {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }
    })
    .catch((error) => {
      console.error('Error fetching Unsplash image:', error)
    })

  // Hide placeholder on input focus
  input.addEventListener('focus', () => {
    input.style.caretColor = 'transparent'
  })

  // Restore placeholder on input blur
  input.addEventListener('blur', () => {
    input.style.caretColor = 'white'
  })

  // Send user input to Voiceflow Dialog API
  input.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      const userInput = input.value.trim()

      if (userInput) {
        // Disable input field and apply fade-out animation
        input.disabled = true
        input.classList.add('fade-out')

        // Fade out previous content
        responseContainer.style.opacity = '0'
        // Check if any audio is currently playing
        if (audio && !audio.paused) {
          // If audio is playing, pause it
          audio.pause()
        }
        interact(userInput)
      }
    }
  })
  async function interact(input) {
    let body = {
      config: { tts: true, stripSSML: true },
      action: { type: 'text', payload: input },
    }

    if (input == '#launch#') {
      body = {
        config: { tts: true, stripSSML: true },
        action: { type: 'launch' },
      }
    }

    fetch(`https://${voiceflowRuntime}/state/user/${uniqueId}/interact/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: voiceflowAPIKey,
        versionID: voiceflowVersionID,
      },
      body: JSON.stringify(body),
    })
      .then((response) => response.json())
      .then((data) => {
        displayResponse(data)
      })
      .catch((err) => console.error(err))
  }

  function displayResponse(response) {
    console.log(response)

    // Fade out previous content
    responseContainer.style.opacity = '0'
    wave.style.opacity = '0'
    instance.start()

    setTimeout(() => {
      let content = ''
      let audioQueue = []

      // Clear responseContainer from previous content
      while (responseContainer.firstChild) {
        responseContainer.removeChild(responseContainer.firstChild)
      }

      // Fetch VF DM API response
      response.forEach((item) => {
        if (item.type === 'speak') {
          if (item.payload.type === 'message') {
            const textElement = document.createElement('p')
            textElement.textContent = item.payload.message
            textElement.setAttribute('data-src', item.payload.src)
            textElement.style.opacity = '0'
            responseContainer.appendChild(textElement)
          }
          // Add audio to the queue
          audioQueue.push(item.payload.src)
        } else if (item.type === 'text') {
          console.info('Text')
          const textElement = document.createElement('p')
          textElement.textContent = item.payload.message
          textElement.style.opacity = '0'
          responseContainer.appendChild(textElement)
          textElement.style.transition = 'opacity 0.5s'
          textElement.style.opacity = '1'
        } else if (item.type === 'visual') {
          console.info('Image')
          const imageElement = document.createElement('img')
          imageElement.src = item.payload.image
          imageElement.alt = 'Response image'
          //imageElement.style.borderRadius = '3%'
          imageElement.style.border = '2px solid white'
          imageElement.style.width = 'auto'
          imageElement.style.height = 'auto'
          imageElement.style.maxWidth = '80%'
          imageElement.style.opacity = '0'
          imageElement.style.boxShadow =
            '0px 0px 16px 1px rgba(0, 0, 0, 0.1), 0px 0px 16px 1px rgba(0, 0, 0, 0.08)'
          imageElement.style.cursor = 'pointer'
          responseContainer.appendChild(imageElement)
          imageElement.style.transition = 'opacity 2.5s'
          imageElement.style.opacity = '1'
          imageElement.addEventListener('click', () => {
            showModal(item.payload.image)
          })
        }
      })

      // Fade in new content
      responseContainer.style.opacity = '1'
      wave.style.opacity = '1'

      // Function to play audio sequentially
      function playNextAudio() {
        if (audioQueue.length === 0) {
          // Set focus back to the input field after all audios are played
          wave.style.opacity = '0'
          instance.stop()
          input.blur()
          setTimeout(() => {
            input.focus()
          }, 100)
          return
        }

        const audioSrc = audioQueue.shift()
        audio = new Audio(audioSrc)

        // Find and show the corresponding text
        const textElement = responseContainer.querySelector(
          `[data-src="${audioSrc}"]`
        )
        if (textElement) {
          // Change the opacity of previous text
          const previousTextElement = textElement.previousElementSibling
          if (previousTextElement && previousTextElement.tagName === 'P') {
            previousTextElement.style.opacity = '0.5'
          }
          // Show the current text
          textElement.style.transition = 'opacity 0.5s'
          textElement.style.opacity = '1'
        }

        audio.addEventListener('canplaythrough', () => {
          audio.play()
        })

        audio.addEventListener('ended', () => {
          playNextAudio()
        })

        // Handle errors
        audio.addEventListener('error', () => {
          console.error('Error playing audio:', audio.error)
          playNextAudio() // Skip the current audio and continue with the next one
        })
      }

      // Start playing audios sequentially
      playNextAudio()
    }, 250)
    setTimeout(() => {
      // Re-enable input field and remove focus
      input.disabled = false
      input.value = ''
      input.classList.remove('fade-out')
      input.blur()
      input.focus()
    }, 200)
  }

  setTimeout(() => {
    inputFieldContainer.style.animation = 'fadeIn 4s forwards'
  }, 2500)

  function showModal(imageSrc) {
    const modal = document.createElement('div')
    modal.id = 'modal'
    modal.style.display = 'flex'
    modal.style.justifyContent = 'center'
    modal.style.alignItems = 'center'
    modal.style.position = 'fixed'
    modal.style.top = '0'
    modal.style.left = '0'
    modal.style.width = '100%'
    modal.style.height = '100%'
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
    modal.style.opacity = '0'
    modal.style.transition = 'opacity 0.3s ease'

    const modalImage = document.createElement('img')
    modalImage.src = imageSrc
    modalImage.style.maxWidth = '90%'
    modalImage.style.maxHeight = '90%'
    modalImage.style.border = '2px solid white'
    modalImage.style.boxShadow =
      '0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)'

    modal.appendChild(modalImage)
    document.body.appendChild(modal)

    setTimeout(() => {
      modal.style.opacity = '1'
    }, 100)

    modal.addEventListener('click', () => {
      modal.style.opacity = '0'
      setTimeout(() => {
        document.body.removeChild(modal)
      }, 300)
    })
  }
})

function generateUniqueId() {
  // generate a random string of 6 characters
  const randomStr = Math.random().toString(36).substring(2, 8)
  // get the current date and time as a string
  const dateTimeStr = new Date().toISOString()
  // remove the separators and milliseconds from the date and time string
  const dateTimeStrWithoutSeparators = dateTimeStr
    .replace(/[-:]/g, '')
    .replace(/\.\d+/g, '')
  // concatenate the random string and date and time string
  const uniqueId = randomStr + dateTimeStrWithoutSeparators
  return uniqueId
}
