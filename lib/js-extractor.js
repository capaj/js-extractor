'use strict'
/*global atom*/
'use babel'

const detect = require('js-module-formats').detect
const fs = require('fs')
const path = require('path')
const undeclaredIdentifiers = require('esprima-undeclared-identifiers')
const beautify = require('js-beautify').js_beautify

atom.commands.add('atom-text-editor', 'js-extractor:extract', function (ev) {
  const editor = atom.workspace.getActiveTextEditor()
  const currentSource = editor.buffer.getText()
  const format = detect(currentSource)
  const selectedText = editor.getSelectedText()

  const modalParent = document.createElement('div')
  let filePath = editor.buffer.file.path
  modalParent.innerHTML = (`<div>
    <span>Extract into: </span>
    <atom-text-editor mini="true"/>
  </div>
  <button>extract</button>`)
  const modal = atom.workspace.addModalPanel({item: modalParent})
  const escListener = ev => {
    if (ev.keyCode === 27) {
      modal.destroy()
      ev.preventDefault()
      document.removeEventListener('keyup', escListener)
    }
  }
  document.addEventListener('keyup', escListener)
  const miniEditor = modalParent.firstChild.children[1]
  miniEditor.focus()
  const pathInputEditor = miniEditor.model
  const directory = filePath.substring(0, filePath.lastIndexOf('/') + 1)
  filePath = directory + '.js'
  pathInputEditor.insertText(filePath)
  pathInputEditor.moveLeft(3)
  const undeclared = undeclaredIdentifiers(selectedText).join(', ')
  const onClick = ev => {
    const extractedToPath = pathInputEditor.buffer.getText().trim()
    const relPath = path.relative(directory, extractedToPath)
    let wrappedCode
    let reqStatement
    if (format === 'es') {
      wrappedCode = `export default function (${undeclared}) {\n` + selectedText + '\n}\n'
      reqStatement = ``
    } else {
      wrappedCode = `module.exports = function (${undeclared}) {\n` + selectedText + '\n}\n'
      reqStatement = `require('./${relPath}')(${undeclared})`
    }
    const beautified = beautify(wrappedCode, {
      indent_size: 2,
      space_after_anon_function: true,
      end_with_newline: true
    })
    fs.writeFile(extractedToPath, beautified, function (err) {
      if (err) {
        return console.error(err)
      }
      modal.destroy()
      document.removeEventListener('keyup', escListener)
      if (format === 'es') {

      } else {
        editor.insertText(reqStatement)
      }
    })
  }
  modalParent.lastChild.addEventListener('click', onClick)
})
