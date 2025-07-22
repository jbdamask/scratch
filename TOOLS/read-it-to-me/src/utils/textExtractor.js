export const extractTextFromFile = async (file) => {
  const fileType = file.type || file.name.split('.').pop().toLowerCase()
  
  switch (true) {
    case fileType === 'application/pdf' || file.name.endsWith('.pdf'):
      return await extractFromPDF(file)
    case fileType === 'text/plain' || file.name.endsWith('.txt'):
      return await extractFromText(file)
    case fileType === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm'):
      return await extractFromHTML(file)
    default:
      throw new Error('Unsupported file type')
  }
}

const extractFromText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = (e) => reject(new Error('Failed to read text file'))
    reader.readAsText(file)
  })
}

const extractFromHTML = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const parser = new DOMParser()
      const doc = parser.parseFromString(e.target.result, 'text/html')
      
      // Remove script and style elements
      const scripts = doc.querySelectorAll('script, style')
      scripts.forEach(el => el.remove())
      
      const text = doc.body ? doc.body.innerText : doc.innerText || ''
      resolve(text.trim())
    }
    reader.onerror = (e) => reject(new Error('Failed to read HTML file'))
    reader.readAsText(file)
  })
}

const extractFromPDF = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer()
    
    // Use a more reliable method to load PDF.js
    if (typeof window.pdfjsLib === 'undefined') {
      // Load PDF.js from CDN
      await loadPDFJS()
    }
    
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let fullText = ''
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map(item => item.str).join(' ')
      fullText += pageText + '\n'
    }
    
    return fullText.trim()
  } catch (error) {
    throw new Error('Failed to extract text from PDF: ' + error.message)
  }
}

const loadPDFJS = () => {
  return new Promise((resolve, reject) => {
    if (typeof window.pdfjsLib !== 'undefined') {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.onload = () => {
      // Set worker path
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      resolve()
    }
    script.onerror = () => reject(new Error('Failed to load PDF.js'))
    document.head.appendChild(script)
  })
}