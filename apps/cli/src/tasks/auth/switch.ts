// TASK: switch
// Run this task with:
// forge task:run auth:switch --profileName [name]

import { createTask } from '@forgehive/task'
import { Schema } from '@forgehive/schema'
import path from 'path'
import fs from 'fs/promises'
import os from 'os'

import { load as loadProfiles } from './load'
import { type Profiles } from '../types'

const schema = new Schema({
  profileName: Schema.string()
})

const boundaries = {
  loadProfiles: loadProfiles.asBoundary(),
  persistProfiles: async (profiles: Profiles): Promise<void> => {
    const buildsPath = path.join(os.homedir(), '.forge')
    const profilesPath = path.join(buildsPath, 'profiles.json')
    await fs.writeFile(profilesPath, JSON.stringify(profiles, null, 2))
  }
}

export const switchProfile = createTask({
  schema,
  boundaries,
  fn: async function ({ profileName }, { loadProfiles, persistProfiles }) {
    // Load profiles
    const profiles = await loadProfiles({})

    // Check if profile exists
    const profileExists = profiles.profiles.some(profile => profile.name === profileName)

    if (!profileExists) {
      throw new Error(`Profile "${profileName}" not found. Use auth:list to see available profiles.`)
    }

    // Update default profile
    profiles.default = profileName

    // Save updated profiles
    await persistProfiles(profiles)

    console.log(`Switched to profile: ${profileName}`)

    return {
      default: profileName
    }
  }
})
