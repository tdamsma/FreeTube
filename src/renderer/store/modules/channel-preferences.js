import { DBChannelPreferencesHandlers } from '../../../datastores/handlers/index'

// how many recent videos from a channel have to be played at the same non-default speed before we offer to remember it
const SUGGESTION_THRESHOLD = 3
// how many suggestions per channel to make before giving up on it
const MAX_SUGGESTIONS = 2
const RECENT_VIDEOS_TO_TRACK = 5

/**
 * @typedef {object} ChannelPreference
 * @property {string} _id the channel's ID
 * @property {string} [name] the channel's name, only stored for remembered speeds so they can be listed in the settings
 * @property {number} [playbackRate] the remembered playback speed for this channel
 * @property {[videoId: string, playbackRate: number][]} [recentPlaybackRates] used to detect repeated speed changes
 * @property {number} [suggestionCount] how often the user has been offered to remember the playback speed
 */

const state = {
  /** @type {ChannelPreference[]} */
  channelPreferences: []
}

const getters = {
  /** @returns {ChannelPreference[]} */
  getRememberedChannelPlaybackRates: (state) => {
    return state.channelPreferences
      .filter(preference => preference.playbackRate !== undefined)
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
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

  /**
   * Remembers a fixed playback speed for a channel, discarding any learning data collected for it.
   * @param {any} context
   * @param {{ channelId: string, channelName: string, playbackRate: number }} payload
   */
  async pinChannelPlaybackRate({ commit }, { channelId, channelName, playbackRate }) {
    const channelPreference = { _id: channelId, name: channelName, playbackRate }

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
  },

  /**
   * Records the playback speed the user chose for a video and
   * returns the speed to offer to remember for the channel, if the user keeps picking the same one.
   * @param {any} context
   * @param {{ channelId: string, videoId: string, playbackRate: number, defaultPlaybackRate: number }} payload
   * @returns {Promise<number|null>}
   */
  async trackChannelPlaybackRate({ dispatch, state }, { channelId, videoId, playbackRate, defaultPlaybackRate }) {
    const existing = state.channelPreferences.find(preference => preference._id === channelId)

    if (existing?.playbackRate !== undefined || (existing?.suggestionCount ?? 0) >= MAX_SUGGESTIONS) {
      return null
    }

    const recentPlaybackRates = (existing?.recentPlaybackRates ?? []).filter(([id]) => id !== videoId)

    // going back to the default speed doesn't count as a preference
    if (playbackRate !== defaultPlaybackRate) {
      recentPlaybackRates.push([videoId, playbackRate])
    }

    if (recentPlaybackRates.length > RECENT_VIDEOS_TO_TRACK) {
      recentPlaybackRates.shift()
    }

    const matchingVideos = recentPlaybackRates.filter(([, rate]) => rate === playbackRate).length

    if (matchingVideos >= SUGGESTION_THRESHOLD) {
      await dispatch('updateChannelPreference', {
        channelId,
        preferences: { recentPlaybackRates: [], suggestionCount: (existing?.suggestionCount ?? 0) + 1 }
      })
      return playbackRate
    }

    await dispatch('updateChannelPreference', { channelId, preferences: { recentPlaybackRates } })
    return null
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
