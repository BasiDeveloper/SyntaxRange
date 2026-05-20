const editor = document.querySelector('.editor')
const linenumbers = document.querySelector('.linenumbers')
const selection = document.getSelection();
let prevOffset = 0, indent = '';
let topF = 0, leftF = 0, height = 0
function newLine(parent) {
  const div = document.createElement('section')
  div.setAttribute('class', 'line')
  div.innerHTML = "<br>"
  parent.appendChild(div)
}

function newLinenumbers() {
    const linesections = document.querySelectorAll(".line")
    if(linesections.length > 0) {
       
        linenumbers.innerHTML = ""
        linesections.forEach((item, index) => {
            const linenumber = document.createElement("div");
            linenumber.setAttribute('class', 'linenumber');
            linenumber.setAttribute('style', `height: ${item.offsetHeight}px`)
            linenumber.innerText = index+1;
            linenumbers.appendChild(linenumber)
        })
    }
}

function Editor(parent, syntaxes) { 
  if(!parent) return
  let interval
  newLine(parent)
  newLinenumbers()
  getCaretPosition(parent, 4) 
  parent.addEventListener('click', (e) => {
      indent = getIndent()
      getCaretPosition(parent)
  })
  parent.addEventListener('input', (e) => {
    
    const child = parent.children;
    
    if(indent) console.log(indent.length)
    if(e.inputType === "deleteContentBackward") {
      if(child.length === 0) {
        newLine(parent)
        parent.focus()
      }
    }
    
      newLinenumbers()
      
      sectionlineHighlight(syntaxes, parent)
      iterateHighlightedText(syntaxes, parent)
      
      if(e.inputType !== "insertParagraph") indent = getIndent()
      if(e.inputType === "insertParagraph") {
        autoIndent(indent)
      }
      getCaretPosition(parent)
  })
  parent.addEventListener("paste", (e) => {
    e.preventDefault()
    let paste = (event.clipboardData || window.clipboardData).getData("text").replace(/\r/g, ``);
     
     
    document.execCommand('inserttext', false, paste);
    
  }) 
  parent.addEventListener("keydown", (e) => {
    if(e.key.search(/Arrow/g) <= -1) return
    interval = setInterval(() => {
       getCaretPosition(parent) 
    }, 10)
  })
   parent.addEventListener("keyup", (e) => {
    clearInterval(interval)
   })
}
 
function getCaretPosition(parent, staticVal = 2.8) {

  const caret = document.getElementById("caret")
  const caretRect = caret.getBoundingClientRect()
  const linenumbersRect = linenumbers.getBoundingClientRect()
  const parentRect = parent.getBoundingClientRect()
  const range = new Range()
  
  
  if(!selection.focusNode) {
    range.selectNode(parent.firstChild.firstChild)
  }
  else if(selection.focusNode.nodeType === Node.ELEMENT_NODE && !selection.focusNode.classList.contains('line')) {
      range.selectNode(parent.firstChild)
  } 
  else {
    if(selection.focusNode.nodeType === Node.TEXT_NODE) {
    range.setStart(selection.focusNode, selection.focusOffset)
    range.setEnd(selection.focusNode, selection.focusOffset)
    range.collapse() 
    }
    if(selection.focusNode.nodeType === Node.ELEMENT_NODE) {
      range.selectNode(selection.focusNode)
    }

  }
  const rect = range.getBoundingClientRect()
  
    topF = rect.top
    leftF = rect.left
    height = rect.height
    const customheight = (height+10)
  caret.style.top = (topF - parentRect.top - (caretRect.height / 2 - customheight / staticVal))+"px";
  caret.style.left = (leftF - parentRect.left + linenumbersRect.width)+'px';
  caret.style.height = customheight+"px"
   
} 

function getSectionLineParent(node) {
  if(node.nodeType === Node.TEXT_NODE) return
  if(!node.classList.contains('line')) {
    return getSectionLineParent(node.parentNode)
  }
  return node
}

function getIndent() { 
  if(selection.focusNode.nodeType !== Node.TEXT_NODE) return ''
  const focusNode = selection.focusNode 
  const parentNode = getSectionLineParent(selection.focusNode.parentNode)
  if(parentNode.classList.contains('line')) {
    if(!parentNode.hasChildNodes()) return ''
    const firstSpaces = parentNode.childNodes[0];
     
    if(firstSpaces.nodeType === Node.TEXT_NODE) {
      const spaces = firstSpaces.textContent.match(/^\s*/g); 

      if(spaces) return spaces[0]
      else ''
    }
  }
  return ''
}
function autoIndent(str) { 
  if(!str || str === "") return
  if(selection.focusNode.nodeType === Node.TEXT_NODE) {
    const focusNode = selection.focusNode
    const parentNode = getSectionLineParent(selection.focusNode.parentNode)
    
    if(parentNode.classList.contains('line')) {
      if(!parentNode.hasChildNodes()) return
      const firstSpaces = parentNode.childNodes[0];
      if(firstSpaces.nodeType === Node.TEXT_NODE) {
        firstSpaces.textContent = str+firstSpaces.textContent;
        if(str) resetCaretPos(str.length -1)
      }
      return
    }
  }
  if(selection.focusNode.nodeType === Node.ELEMENT_NODE) {
    const focusNode = getSectionLineParent(selection.focusNode);
    if(focusNode.classList.contains("line")) {
      const firstChild = focusNode.firstChild;
      const newText = document.createTextNode(str)
      firstChild.replaceWith(newText)  
      focusNode.innerHTML = newText.textContent.replace(/\s/g, '&nbsp;')
      const diff = selection.focusNode.textContent.length - str.length
      resetCaretPos(str.length - diff)
    }
  }
}
const dataHighlight = [ 
  {
    trigger: /"[^"]*"?|'[^']*'?/g, 
    className: 'quote',
    disableHighlightedNextElements: true,
    extractExceesiveContent: true, //extract the content that is not part of trigger
  },
  {
    trigger: /=>|return|if|while|else|do|for|switch|case|default|try|catch|var|const|let|class|new|import|function/g, //trigger on section.line
    disableHighlight: {
      front: /[^\s\(\)\{\}\[\]]/g, //disable the highlight when it found something in front
      back: /[^\s\(\)\{\}\[\]]/g //disable the highlight when it found something in back
    },
    className: 'variable',
    //triggerBefore: {className?: string, }
  },
  {
    trigger: /[\(\)\{\}\[\]]/g,
    className: 'bracket',
    extractExceesiveContent: true
  },
  { 
    trigger: /[+=\-\;]|(?<!\/)\/(?!\/)/g, 
    className: 'operation',   
    extractExceesiveContent: true, 
    disableHighlightOnNextClassName: ""
  },   
   
  {
    trigger: /\/\/.*/g,
    className: 'comment',
    disableHighlightedNextElements: true,
    extractExceesiveContent: true,
    
  },
  {
    trigger: /[\d.]+f?/g,
    disableHighlight: {
      front: /[^\s,;\[\]\{\}\(\)]/g,
      back: /[^\s,\[\]\{\}\(\)]/g
    },
    multiple: true, 
    className: 'number'
  },
  
]
Editor(editor, dataHighlight)



//highlight only if its on section.line
function sectionlineHighlight(syntaxes, parent) {

  const parentNode = findLine(parent.firstChild)
  
  if(parentNode.tagName.search(/section/i)<= -1) return 
   
  syntaxes.forEach(async (item) => {
  loopSections(parentNode.firstChild, {alsoOuterLoop: true, previous: false}, (data, command) => {
  if(data.focusNode.nodeType === Node.TEXT_NODE) {
    const focusNode = data.focusNode
     
     
    prevOffset = selection.focusOffset
      if(item.trigger && item.beforeTrigger) {
        console.error("cant use trigger with other triggers")
        return
      }
      if(item.trigger && item.afterTrigger) {
        console.error("cant use trigger with other triggers")
        return
      }
      let trigger = item.trigger;

      if(item.disableHighlight) {
        const {front, back} = item.disableHighlight;
        if(front && !back) {
          trigger = new RegExp(`(${item.trigger.source})(?!${front.source})`, 'g')
          
        }
        if(front && back) {
          trigger = new RegExp(`(?<!${back.source})(${item.trigger.source})(?!${front.source})`, 'g')
        }
      }

      const pos = focusNode.textContent.search(trigger);
      if(pos <= -1) return
       if(item.disableHighlightedNextElements) {

        loopSections(focusNode, {alsoOuterLoop: false, previous: false}, (element) => {
          
          if(element.focusNode.nodeType === Node.TEXT_NODE) return 
          
          const parentTag = element.parent;
          const newEl = document.createTextNode(element.focusNode.textContent)
          element.focusNode.replaceWith(newEl)
          parentTag.normalize() 
        })  
        focusNode.parentNode.normalize()
       } 
       if(focusNode.textContent.length === 0) return

      const match = focusNode.textContent.match(trigger);
    
      const end = pos+match[0].length  
      const range = new Range()
      range.setStart(focusNode, pos)
      range.setEnd(focusNode, end)
      const span = document.createElement("span");
      span.setAttribute("class", item.className) 
      span.setAttribute("textorigin", match[0])
      range.surroundContents(span)
      
      // console.log(match, pos, prevOffset)
      if(prevOffset > pos && prevOffset < pos+match[0].length) resetCaretPos(prevOffset - selection.focusOffset)
      if(prevOffset == pos + match[0].length) resetCaretPos(match[0].length)
      //console.log(selection.focusNode.parentNode)
      if(match.length > 1) sectionlineHighlight(syntaxes, parent)
    
  }  
  })
})
}

function findLine(parentNode) {
  if(!parentNode.classList.contains("line")) {
    return findLine(parentNode.parentNode)
  }
  return parentNode
}


function iterateHighlightedText(syntaxes, parent) {
  
  
  const font = document.querySelector('.line font')
  const span = document.querySelector('.line span:not([textorigin])')
  
  //change/remove font tag that sudden changes
  if(font) {
    prevOffset = selection.focusOffset
    const parentTag = font.parentNode;
    
    const newEl = document.createTextNode(font.textContent)
    
    font.replaceWith(newEl)
    parentTag.normalize()
    
    resetCaretPos(prevOffset)
    sectionlineHighlight(syntaxes, parent)

  }
  if(span) {
    // console.log(span)
    const parentTag = span.parentNode;
    const newEl = document.createTextNode(span.textContent)
    span.replaceWith(newEl)
    parentTag.normalize()
    sectionlineHighlight(syntaxes, parent) 
    return  
  }
  
  loopSections(parent.firstChild.firstChild, {alsoOuterLoop: true, previous: false}, (section) => {
    if(section.focusNode.nodeType !== Node.ELEMENT_NODE) return
    if(section.focusNode.tagName === "BR") return
    const item = syntaxes.find(value => value.className === section.focusNode.className)
    if(!item) return
    const tag = section.focusNode
    const parentNode = selection.focusNode.parentNode
    
        if(tag.classList.contains(item.className) && tag !== parentNode) {
          
          const origin = tag.getAttribute("textorigin");
    
          const regexp = new RegExp(origin.replace(/(\W)/g, `\\$1`), "g")
          const find = tag.textContent.search(regexp);
            
          if(find <= -1) {
            const parentTag = tag.parentNode 
            const range = new Range();
            range.selectNode(tag.firstChild)
            const extract = range.extractContents();
            tag.replaceWith(extract)
            if(parentTag) parentTag.normalize()
          }

        }

        if(parentNode.nodeType === Node.ELEMENT_NODE && parentNode.classList.contains(item.className) && tag === parentNode) {
        
        if(item.disableHighlight) {
          const {front, back} = item.disableHighlight
          
          //delete only inside the span if front and back is present
          if(front && back) {
              let newTrigger = new RegExp(`(?<!${back.source})(${item.trigger.source})(?!${front.source})`, "g")
              if(item.multiple && tag.textContent.search(newTrigger) > -1) {
                const ugh = tag.textContent.match(newTrigger)
                parentNode.setAttribute("textorigin", ugh[0])
              }
              const nodeRegOrigin = tag.getAttribute("textorigin")
              newTrigger = new RegExp(`(?<!${back.source})(${nodeRegOrigin})(?!${front.source})`, "g")
              
              const pos = tag.textContent.search(newTrigger);
              
              const text = tag.textContent
              //if the position of the current trigger is far from the 0
              //then move the content
              
              if(pos == 0 && text.length > nodeRegOrigin.length) {
                if(!tag.nextSibling) {
                  parentNode.parentNode.appendChild(document.createTextNode(""))
                }
                if(tag.nextSibling.nodeType === Node.ELEMENT_NODE) {
                  const parentTag = tag.parentNode;
                  const range = new Range()
                  range.setStart(selection.focusNode, nodeRegOrigin.length)
                  range.setEnd(selection.focusNode, text.length)
                  const extract = range.extractContents()
                  parentNode.parentNode.insertBefore(extract, parentNode.nextSibling)
                  parentTag.normalize()
                  resetCaretPos(1) 
                } 
                
                else if(parentNode.nextSibling.nodeType === Node.TEXT_NODE) {
                  const parentTag = parentNode.parentNode;
                  const range = new Range()
                  range.setStart(selection.focusNode, nodeRegOrigin.length)
                  range.setEnd(selection.focusNode, text.length)
                  const extract = range.extractContents()
                  range.selectNode(parentNode.nextSibling)
                  range.insertNode(extract)
                  parentTag.normalize()
                  resetCaretPos(1)  
                }
              } 
              //extract the exceesive content before the text origin
              if(pos > 0 && text.length > nodeRegOrigin.length) {

                if(!parentNode.previousSibling) {
                  parentNode.parentNode.insertBefore(document.createTextNode(""), parentNode)
                }
                const parentTag = parentNode.parentNode;
                  const range = new Range()
                  range.setStart(selection.focusNode, 0)
                  range.setEnd(selection.focusNode, pos)
                  const extract = range.extractContents()
                  range.selectNode(parentNode.previousSibling)
                  range.insertNode(extract)
                  parentTag.normalize() 
              }
              //otherwise replace the current selection with text node
              //then normalize to join seperated text nodes
              if(pos <= -1) {
                prevOffset = selection.focusOffset;
                const parentTag = parentNode.parentNode
                
                const newEl = document.createTextNode(selection.focusNode.textContent)
                parentNode.replaceWith(newEl)
                parentTag.normalize()
                
                
                resetCaretPos(prevOffset)
              }
              
            
          }
          
           
        }
        
        if(item.extractExceesiveContent) {
          const text = selection.focusNode.textContent;
          const find = text.search(item.trigger);


          if(find == -1) {
            prevOffset = selection.focusOffset;
            const parentTag = getSectionLineParent(parentNode)
                
            const newEl = document.createTextNode(selection.focusNode.textContent)
            parentNode.replaceWith(newEl)
            parentTag.normalize() 
              console.log(prevOffset)
            resetCaretPos(prevOffset)
            return
          }
          
          if(find > -1) {
            const newOrigin = text.match(item.trigger) 
            
            parentNode.setAttribute("textorigin", newOrigin[0])
          }
          let origin = tag.getAttribute("textorigin")
          let reg = new RegExp(origin.replace(/(\W)/g, '\\$1'), 'g')
          let findOrigin = text.search(reg) 
          
          if(findOrigin == -1) {
            prevOffset = selection.focusOffset;
            const parentTag = parentNode
                
            const newEl = document.createTextNode(selection.focusNode.textContent)
            parentNode.replaceWith(newEl)
            parentTag.parentNode.normalize() 
                
            if(parentTag !== selection.focusNode.parentNode) resetCaretPos(prevOffset)
            
          }
            const match = text.match(reg) 
          if(findOrigin > 0) {
            const range = new Range()
            range.setStart(selection.focusNode, 0)
            range.setEnd(selection.focusNode, find)
            const extract = range.extractContents()
            const prevSibling = parentNode.previousSibling;
            
            if(!prevSibling) {
              parentNode.parentNode.insertBefore(document.createTextNode(extract.textContent), parentNode )
              return
            }

            if(prevSibling.nodeType === Node.TEXT_NODE) {
              prevSibling.textContent = prevSibling.textContent+extract.textContent;
            }
          }
          if(findOrigin == 0) {
            
            if(match[0].length === text.length) return
            prevOffset = selection.focusOffset
            const range = new Range()
            range.setStart(selection.focusNode, findOrigin+match[0].length)
            range.setEnd(selection.focusNode, text.length)
            const extract = range.extractContents()
            const nextSibling = parentNode.nextSibling;
            // console.log(parentNode)
            if(!nextSibling) {
              parentNode.parentNode.appendChild(extract)
              resetCaretPos(1)
            }
            else if(nextSibling.nodeType === Node.ELEMENT_NODE) {
              parentNode.parentNode.insertBefore(extract, nextSibling)
              if(findOrigin+match[0].length < prevOffset) resetCaretPos(1)
            }  
            else if(nextSibling.nodeType === Node.TEXT_NODE) {
              nextSibling.textContent = extract.textContent+nextSibling.textContent;
              if(findOrigin+match[0].length < prevOffset) resetCaretPos(1)
            }
          }
           
        }
      }

  })
    sectionlineHighlight(syntaxes, parent)
}

function loopSections(currentNode, option = {alsoOuterLoop: false, previous: false}, callBack, data = [], lineIndex = 0, index = 0) {
  if(!currentNode) return
  let parentNode = currentNode.parentNode
  let node = currentNode
  let command = null;
  let commands = {
    break: () => {
      command = "break"
    }
  } 
  while(node) {
     if(node.nodeType === Node.TEXT_NODE && node.textContent !== node.wholeText ) {
      node = option.previous ? node.previousSibling : node.nextSibling
      continue;
     }
     data.push({
      parent: parentNode,
      lineIndex,
      focusNode: node,
      index
     }) 
    index++
    node = option.previous ? node.previousSibling : node.nextSibling
  }
  if(!node && option.alsoOuterLoop) {
    const next = option.previous ? currentNode.parentNode.previousSibling : currentNode.parentNode.nextSibling;
    
    if(next) {
      lineIndex++;
      loopSections(next.firstChild, option, callBack, data, lineIndex, index)
      return
    } 
  }
  for(const focus of data) {
    if(command === "break") break;
    callBack(focus, command)
  }
}



function resetCaretPos(span = 0, direction = "forward", spanIteration = "character") {
  for(let i = 0; i < span; i++) {
  selection.modify("move", direction, spanIteration)
  }
}












