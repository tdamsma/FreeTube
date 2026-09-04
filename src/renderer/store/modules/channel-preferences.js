import { DBChannelPreferencesHandlers } from '../../../datastores/handlers/index'

/**
 * @typedef {object} ChannelPreference
 * @property {string} _id the channel's ID
 * @property {number} [playbackRate]
 * @property {number} [volume]
 * @property {boolean} [muted]
 * @property {string|null} [captionLanguage] the language code of the caption track to select, or null for no captions
 */

const state = {
  /** @type {ChannelPreference[]} */
  channelPreferences: []
}

const getters = {
  getChannelPreferences: (state) => {
    return state.channelPreferences
  },

  /** @returns {(channelId: string) => ChannelPreference|undefined} */
  getChannelPreferenceById: (state) => (channelId) => {
    return state.channelPreferences.find(preference => preference._id === channelId)
  }
}

const actions = {
  async grabChannelPreferences({ commit }) {
    try {
      const results = await DBChannelPreferencesHandlers.find()
      commit('setChannelPreferences', results)
    } catch (errMessage) {
      console.error(errMessage)
    }
  },

  /**
   * Creates or updates the preferences for a channel, merging the given values into any existing ones.
   * @param {any} context
   * @param {{ channelId: string, preferences: Omit<ChannelPreference, '_id'> }} payload
   */
  async updateChannelPreference({ commit, state }, { channelId, preferences }) {
    const existing = state.channelPreferences.find(preference => preference._id === channelId)
    const channelPreference = { ...existing, ...preferences, _id: channelId }

    try {
      await DBChannelPreferencesHandlers.upsert(channelPreference)
      commit('upsertChannelPreference', channelPreference)
    } catch (errMessage) {
      console.error(errMessage)
    }
  },

  async removeChannelPreference({ commit }, channelId) {
    try {
      await DBChannelPreferencesHandlers.delete(channelId)
      commit('removeChannelPreference', channelId)
    } catch (errMessage) {
      console.error(errMessage)
    }
  },

  async removeAllChannelPreferences({ commit }) {
    try {
      await DBChannelPreferencesHandlers.deleteAll()
      commit('setChannelPreferences', [])
    } catch (errMessage) {
      console.error(errMessage)
    }
  }
}

const mutations = {
  setChannelPreferences(state, channelPreferences) {
    state.channelPreferences = channelPreferences
  },

  upsertChannelPreference(state, channelPreference) {
    const index = state.channelPreferences.findIndex(preference => preference._id === channelPreference._id)

    if (index === -1) {
      state.channelPreferences.push(channelPreference)
    } else {
      state.channelPreferences.splice(index, 1, channelPreference)
    }
  },

  removeChannelPreference(state, channelId) {
    state.channelPreferences = state.channelPreferences.filter(preference => preference._id !== channelId)
  }
}

export default {
  state,
  getters,
  actions,
  mutations
}
