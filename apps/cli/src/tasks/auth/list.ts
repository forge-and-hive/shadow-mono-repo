// TASK: list
// Run this task with:
// forge task:run auth:list

import { createTask } from '@forgehive/task'
import { Schema } from '@forgehive/schema'

import { load as loadProfiles } from './load'
import { type Profiles } from '../types'

const schema = new Schema({})

const boundaries = {
  loadProfiles: loadProfiles.asBoundary()
}

export const list = createTask(
  schema,
  boundaries,
  async function (_argv, { loadProfiles }) {
    const profiles: Profiles = await loadProfiles({})

    if (profiles.profiles.length === 0) {
      console.log('No profiles found. Use auth:add to create one.')
      return { status: 'Ok', profiles: [] }
    }

    console.log('Available profiles:')

    profiles.profiles.forEach(profile => {
      const isDefault = profile.name === profiles.default
      const prefix = isDefault ? '* ' : '  '
      console.log(`${prefix}${profile.name} - API Key: ${profile.apiKey}`)
    })

    console.log('\nUse auth:add to create or update a profile')
    console.log('\nUse auth:switch to switch to a profile')

    return {
      default: profiles.default
    }
  }
)
