import shaka from 'shaka-player'

import i18n from '../../../i18n/index'
import { PlayerIcons } from '../../../../constants'

export class ChannelPreferencesToggle extends shaka.ui.Element {
  /**
   * @param {boolean} enabled
   * @param {EventTarget} events
   * @param {HTMLElement} parent
   * @param {shaka.ui.Controls} controls
   */
  constructor(enabled, events, parent, controls) {
    super(parent, controls)

    /** @private */
    this.button_ = document.createElement('button')
    this.button_.classList.add('channel-preferences-toggle', 'shaka-tooltip')

    /** @private */
    this.icon_ = new shaka.ui.Icon(this.button_, PlayerIcons.BOOKMARK_DEFAULT)

    const label = document.createElement('label')
    label.classList.add(
      'shaka-overflow-button-label',
      'shaka-overflow-menu-only',
      'shaka-simple-overflow-button-label-inline'
    )

    /** @private */
    this.nameSpan_ = document.createElement('span')
    label.appendChild(this.nameSpan_)

    /** @private */
    this.currentState_ = document.createElement('span')
    this.currentState_.classList.add('shaka-current-selection-span')
    label.appendChild(this.currentState_)

    this.button_.appendChild(label)

    this.parent.appendChild(this.button_)

    /** @private */
    this.enabled_ = enabled

    // listeners

    this.eventManager.listen(this.button_, 'click', () => {
      events.dispatchEvent(new CustomEvent('toggleChannelPreferences', {
        detail: !this.enabled_
      }))
    })

    this.eventManager.listen(events, 'setChannelPreferences', (/** @type {CustomEvent} */ event) => {
      this.enabled_ = event.detail
      this.updateLocalisedStrings_()
    })

    this.eventManager.listen(events, 'localeChanged', () => {
      this.updateLocalisedStrings_()
    })

    if (this.isSubMenu) {
      this.eventManager.listen(this.controls, 'submenuopen', () => {
        this.updateVisibility_()
      })

      this.eventManager.listen(this.controls, 'submenuclose', () => {
        this.updateVisibility_()
      })
    }

    this.updateLocalisedStrings_()
  }

  /** @private */
  updateLocalisedStrings_() {
    this.nameSpan_.textContent = i18n.global.t('Video.Player.Remember Settings For This Channel')

    this.icon_.use(this.enabled_ ? PlayerIcons.BOOKMARK_FILLED : PlayerIcons.BOOKMARK_DEFAULT)

    this.currentState_.textContent = this.localization.resolve(this.enabled_ ? 'ON' : 'OFF')

    this.button_.ariaLabel = this.enabled_
      ? i18n.global.t('Video.Player.Settings are being remembered for this channel')
      : i18n.global.t('Video.Player.Settings are not being remembered for this channel')
  }

  /** @private */
  updateVisibility_() {
    if (this.isSubMenuOpened) {
      this.button_.classList.add('shaka-hidden')
    } else {
      this.button_.classList.remove('shaka-hidden')
    }
  }
}
