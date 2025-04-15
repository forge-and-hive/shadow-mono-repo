// TASK: add
// Run this task with:
// forge task:run auth:add

import { createTask } from '@forgehive/task'
import { Schema } from '@forgehive/schema'
import path from 'path'
import fs from 'fs/promises'
import os from 'os'

import { load as loadProfiles } from './load'
import { type Profiles } from '../types'

const schema = new Schema({
  name: Schema.string(),
  apiKey: Schema.string(),
  apiSecret: Schema.string(),
  url: Schema.string()
})

const boundaries = {
  loadProfiles: loadProfiles.asBoundary(),
  persistProfiles: async (profiles: Profiles): Promise<void> => {
    const buildsPath = path.join(os.homedir(), '.forge')
    const profilesPath = path.join(buildsPath, 'profiles.json')
    await fs.writeFile(profilesPath, JSON.stringify(profiles, null, 2))
  }
}

export const add = createTask(
  schema,
  boundaries,
  async function ({ name, apiKey, apiSecret, url }, { loadProfiles, persistProfiles }) {
    const profiles = await loadProfiles({})

    // Check if profile with same name already exists
    const existingProfileIndex = profiles.profiles.findIndex(p => p.name === name)
    if (existingProfileIndex >= 0) {
      // Replace existing profile
      profiles.profiles[existingProfileIndex] = { name, apiKey, apiSecret, url }
    } else {
      // Add new profile
      profiles.profiles.push({ name, apiKey, apiSecret, url })
    }

    // Set as default profile
    profiles.default = name

    // Persist profiles
    await persistProfiles(profiles)

    return {
      status: 'Ok',
      message: `Profile '${name}' added and set as default`
    }
  }
)
