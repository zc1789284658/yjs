/* global MutationObserver */

// import diff from 'fast-diff'
import { defaultDomFilter } from './utils.js'

import YMap from '../YMap.js'
import YXmlFragment from './YXmlFragment.js'

export default class YXmlElement extends YXmlFragment {
  constructor (arg1, arg2) {
    super()
    this.nodeName = null
    this._scrollElement = null
    if (typeof arg1 === 'string') {
      this.nodeName = arg1.toUpperCase()
    } else if (arg1 != null && arg1.nodeType != null && arg1.nodeType === document.ELEMENT_NODE) {
      this.nodeName = arg1.nodeName
      this._setDom(arg1)
    } else {
      this.nodeName = 'UNDEFINED'
    }
    if (typeof arg2 === 'function') {
      this._domFilter = arg2
    }
  }
  _setDom (dom) {
    if (this._dom != null) {
      throw new Error('Only call this method if you know what you are doing ;)')
    } else if (dom.__yxml != null) { // TODO do i need to check this? - no.. but for dev purps..
      throw new Error('Already bound to an YXml type')
    } else {
      dom.__yxml = this
      // tag is already set in constructor
      // set attributes
      let attrNames = []
      for (let i = 0; i < dom.attributes.length; i++) {
        attrNames.push(dom.attributes[i].name)
      }
      attrNames = this._domFilter(dom, attrNames)
      for (let i = 0; i < attrNames.length; i++) {
        let attrName = attrNames[i]
        let attrValue = dom.getAttribute(attrName)
        this.setAttribute(attrName, attrValue)
      }
      this.insertDomElements(0, Array.prototype.slice.call(dom.childNodes))
      if (MutationObserver != null) {
        this._dom = this._bindToDom(dom)
      }
      return dom
    }
  }
  _fromBinary (y, decoder) {
    const missing = super._fromBinary(y, decoder)
    this.nodeName = decoder.readVarString()
    return missing
  }
  _toBinary (encoder) {
    super._toBinary(encoder)
    encoder.writeVarString(this.nodeName)
  }
  _integrate (y) {
    if (this.nodeName === null) {
      throw new Error('nodeName must be defined!')
    }
    if (this._domFilter === defaultDomFilter && this._parent instanceof YXmlFragment) {
      this._domFilter = this._parent._domFilter
    }
    super._integrate(y)
  }
  /**
   * Returns the string representation of the XML document.
   * The attributes are ordered by attribute-name, so you can easily use this
   * method to compare YXmlElements
   */
  toString () {
    const attrs = this.getAttributes()
    const stringBuilder = []
    const keys = []
    for (let key in attrs) {
      keys.push(key)
    }
    keys.sort()
    const keysLen = keys.length
    for (let i = 0; i < keysLen; i++) {
      const key = keys[i]
      stringBuilder.push(key + '="' + attrs[key] + '"')
    }
    const nodeName = this.nodeName.toLocaleLowerCase()
    const attrsString = stringBuilder.length > 0 ? ' ' + stringBuilder.join(' ') : ''
    return `<${nodeName}${attrsString}>${super.toString()}</${nodeName}>`
  }
  removeAttribute () {
    return YMap.prototype.delete.apply(this, arguments)
  }

  setAttribute () {
    return YMap.prototype.set.apply(this, arguments)
  }

  getAttribute () {
    return YMap.prototype.get.apply(this, arguments)
  }

  getAttributes () {
    const obj = {}
    for (let [key, value] of this._map) {
      obj[key] = value._content[0]
    }
    return obj
  }
  getDom () {
    let dom = this._dom
    if (dom == null) {
      dom = document.createElement(this.nodeName)
      dom.__yxml = this
      let attrs = this.getAttributes()
      for (let key in attrs) {
        dom.setAttribute(key, attrs[key])
      }
      this.forEach(yxml => {
        dom.appendChild(yxml.getDom())
      })
      if (MutationObserver !== null) {
        this._dom = this._bindToDom(dom)
      }
    }
    return dom
  }
}
