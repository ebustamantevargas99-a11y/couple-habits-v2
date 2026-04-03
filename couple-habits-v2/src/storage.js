import { supabase } from './supabase.js'

const LOCAL_ROOM = 'couple-room-code'
const LOCAL_ROLE = 'couple-role'

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export const sync = {
  // Get stored room code
  getRoomCode() {
    return localStorage.getItem(LOCAL_ROOM)
  },

  setRoomCode(code) {
    localStorage.setItem(LOCAL_ROOM, code.toUpperCase())
  },

  getRole() {
    return localStorage.getItem(LOCAL_ROLE)
  },

  setRole(role) {
    localStorage.setItem(LOCAL_ROLE, role)
  },

  // Create a new room (first partner)
  async createRoom(setupData, initialData) {
    const code = generateCode()
    const { data, error } = await supabase
      .from('rooms')
      .insert({ code, data: initialData, setup: setupData })
      .select()
      .single()

    if (error) {
      // Code collision, try again
      if (error.code === '23505') return this.createRoom(setupData, initialData)
      console.error('Create room error:', error)
      return null
    }

    this.setRoomCode(code)
    return { code, room: data }
  },

  // Join an existing room (second partner)
  async joinRoom(code) {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .single()

    if (error || !data) {
      console.error('Join room error:', error)
      return null
    }

    this.setRoomCode(code.toUpperCase())
    return data
  },

  // Get current room data
  async getRoomData() {
    const code = this.getRoomCode()
    if (!code) return null

    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code)
      .single()

    if (error) {
      console.error('Get room error:', error)
      return null
    }

    return data
  },

  // Update room data (syncs to both partners instantly)
  async updateRoom(newData, newSetup) {
    const code = this.getRoomCode()
    if (!code) return false

    const update = { data: newData }
    if (newSetup) update.setup = newSetup

    const { error } = await supabase
      .from('rooms')
      .update(update)
      .eq('code', code)

    if (error) {
      console.error('Update room error:', error)
      return false
    }

    return true
  },

  // Subscribe to real-time changes
  subscribeToRoom(callback) {
    const code = this.getRoomCode()
    if (!code) return null

    const channel = supabase
      .channel('room-' + code)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `code=eq.${code}`
        },
        (payload) => {
          callback(payload.new)
        }
      )
      .subscribe()

    return channel
  },

  // Unsubscribe
  unsubscribe(channel) {
    if (channel) supabase.removeChannel(channel)
  },

  // Clear local data
  clear() {
    localStorage.removeItem(LOCAL_ROOM)
    localStorage.removeItem(LOCAL_ROLE)
  }
}
