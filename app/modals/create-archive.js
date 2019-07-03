/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { classMap } from '../vendor/lit-element/lit-html/directives/class-map'
import { ucfirst } from '../lib/strings'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons2.css'

class CreateArchiveModal extends LitElement {
  static get properties () {
    return {
      title: {type: String},
      description: {type: String},
      currentTemplateUrl: {type: String},
      errors: {type: Object}
    }
  }

  constructor () {
    super()
    this.cbs = null
    this.title = ''
    this.description = ''
    this.type = null
    this.links = null
    this.networked = true
    this.templates = []
    this.currentTemplateUrl = 'blank'
    this.errors = {}

    // export interface
    window.createArchiveClickSubmit = () => this.shadowRoot.querySelector('button[type="submit"]').click()
    window.createArchiveClickCancel = () => this.shadowRoot.querySelector('.cancel').click()
  }

  async init (params, cbs) {
    this.cbs = cbs
    this.title = params.title || ''
    this.description = params.description || ''
    this.type = params.type ? Array.isArray(params.type) ? params.type[0] : params.type : ''
    this.links = params.links
    this.networked = ('networked' in params) ? params.networked : true
    this.templates = [{url: 'blank', title: 'Empty Website'}].concat(
      await bg.archives.list({type: 'unwalled.garden/template', isSaved: true})
    )
    await this.requestUpdate()
  }

  // rendering
  // =

  render () {
    const template = (url, title) => {
      const cls = classMap({template: true, selected: url === this.currentTemplateUrl})
      return html`
        <div class="${cls}" @click=${e => this.onClickTemplate(e, url)}>
          <img src="asset:thumb:${url}">
          <div class="title">${title}</div>
        </div>
      `
    }

    const typeOption = (value, label) => {
      return html`<option value="${value}" ?selected=${this.type === value}>${label}</option>`
    }

    return html`
      <div class="wrapper">
        <h1 class="title">New Website</h1>

        <form @submit=${this.onSubmit}>
          <div class="layout">
            <div class="templates">
              <div class="templates-selector">
                ${this.templates.map(t => template(t.url, t.title))}
              </div>
            </div>

            <div class="inputs">
              <label for="title">${ucfirst(this.simpleType)} Title</label>
              <input autofocus name="title" tabindex="2" value=${this.title || ''} placeholder="Title" @change=${this.onChangeTitle} class="${this.errors.title ? 'has-error' : ''}" />
              ${this.errors.title ? html`<div class="error">${this.errors.title}</div>` : ''}

              <label for="desc">Description</label>
              <textarea name="desc" tabindex="3" placeholder="Description (optional)" @change=${this.onChangeDescription}>${this.description || ''}</textarea>
              
              <div style="margin-bottom: 20px">
                <label for="desc">Type</label>
                <select name="type" tabindex="4" @change=${this.onChangeType}>
                  ${typeOption('', 'Website')}
                  ${typeOption('unwalled.garden/application', 'Application')}
                  ${typeOption('unwalled.garden/module', 'Module')}
                  ${typeOption('unwalled.garden/template', 'Template')}
                  ${typeOption('unwalled.garden/theme', 'Theme')}
                </select>
              </div>

              <hr>

              <div class="form-actions">
                <button type="button" @click=${this.onClickCancel} class="cancel" tabindex="5">Cancel</button>
                <button type="submit" class="primary" tabindex="6">Create Website</button>
              </div>
            </div>
          </div>
        </form>
      </div>
    `
  }

  // event handlers
  // =

  async onClickTemplate (e, url) {
    this.currentTemplateUrl = url
    await this.updateComplete
    this.shadowRoot.querySelector('input').focus() // focus the title input
  }

  onChangeTitle (e) {
    this.title = e.target.value.trim()
  }

  onChangeDescription (e) {
    this.description = e.target.value.trim()
  }

  onChangeType (e) {
    this.type = e.target.value.trim()
  }

  onClickCancel (e) {
    e.preventDefault()
    this.cbs.reject(new Error('Canceled'))
  }

  async onSubmit (e) {
    e.preventDefault()

    if (!this.title) {
      this.errors = {title: 'Required'}
      return
    }

    try {
      var url
      if (this.currentTemplateUrl === 'blank') {
        url = await bg.datArchive.createArchive({
          title: this.title,
          description: this.description,
          type: this.type,
          networked: this.networked,
          links: this.links,
          prompt: false
        })
      } else {
        await bg.datArchive.download(this.currentTemplateUrl)
        url = await bg.datArchive.forkArchive(this.currentTemplateUrl, {
          title: this.title,
          description: this.description,
          type: this.type,
          networked: this.networked,
          links: this.links,
          prompt: false
        })
      }
      this.cbs.resolve({url})
    } catch (e) {
      this.cbs.reject(e.message || e.toString())
    }
  }
}
CreateArchiveModal.styles = [commonCSS, inputsCSS, buttonsCSS, css`
.wrapper {
  padding: 0;
}

h1.title {
  padding: 14px 20px;
  margin: 0;
  border-color: #ddd;
}

form {
  padding: 0;
  margin: 0;
}

hr {
  border: 0;
  border-top: 1px solid #eee;
  margin: 20px 0;
}

.layout {
  display: flex;
  user-select: none;
}

.layout .templates {
  width: 624px;
}

.layout .inputs {
  min-width: 200px;
  flex: 1;
  padding: 20px;
}

.templates-selector {
  display: grid;
  grid-gap: 20px;
  padding: 20px;
  grid-template-columns: repeat(4, 1fr);
  align-items: baseline;
  height: 468px;
  overflow-y: auto;
  background: #fafafa;
  border-right: 1px solid #eee;
}

.template {
  width: 110px;
  padding: 10px;
  border-radius: 4px;
}

.template img {
  display: block;
  margin: 0 auto;
  width: 100px;
  height: 80px;
  margin-bottom: 10px;
  object-fit: cover;
  background: #fff;
  border: 1px solid #ddd;
}

.template .title {
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.template.selected {
  background: #eee;
  font-weight: 500;
}

.template.selected img {
  border: 1px solid #bbb;
}

`]

customElements.define('create-archive-modal', CreateArchiveModal)