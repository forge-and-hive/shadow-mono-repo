// TASK: loadCurrent
// Run this task with:
// forge task:run auth:loadCurrent

import { createTask } from '@forgehive/task'
import { Schema } from '@forgehive/schema'

import { load as loadProfiles } from './load'
import { type Profile } from '../types'

const schema = new Schema({})

const boundaries = {
  loadProfiles: loadProfiles.asBoundary()
}

export const loadCurrent = createTask({
  schema,
  boundaries,
  fn: async function (_argv, { loadProfiles }): Promise<Profile> {
    const profiles = await loadProfiles({})

    if (!profiles.default || profiles.default === '') {
      throw new Error('No default profile set. Please run forge task:run auth:add to create a profile.')
    }

    const defaultProfile = profiles.profiles.find(profile => profile.name === profiles.default)

    if (!defaultProfile) {
      throw new Error(`Default profile "${profiles.default}" not found in profiles.`)
    }

    return { ...defaultProfile, name: profiles.default }
  }
})
