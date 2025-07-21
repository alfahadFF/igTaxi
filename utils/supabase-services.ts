// ===================================================================
// Supabase Configuration for IGTaxi
// ===================================================================

import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/supabase-complete'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://gemjqbxmfkclfgvscqbj.supabase.co'
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbWpxYnhtZmtjbGZndnNjcWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTA4MzEsImV4cCI6MjA2ODQ2NjgzMX0.MN27PE4pyIFbiNF7g54s0EY_x7XS_qLwV0Pv1xQGiSw'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Helper functions for common database operations

// ===================================================================
// Profile Management
// ===================================================================

export const ProfileService = {
  // Get user profile
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    return { data, error }
  },

  // Create or update profile
  async upsertProfile(profile: Database['public']['Tables']['profiles']['Insert']) {
    const { data, error } = await supabase
      .from('profiles')
      .upsert(profile)
      .select()
      .single()
    
    return { data, error }
  },

  // Get driver profile with details
  async getDriverProfile(profileId: string) {
    const { data, error } = await supabase
      .from('driver_profiles')
      .select(`
        *,
        profile:profiles(*)
      `)
      .eq('profile_id', profileId)
      .single()
    
    return { data, error }
  },
}

// ===================================================================
// Trip Management
// ===================================================================

export const TripService = {
  // Create new trip
  async createTrip(trip: Database['public']['Tables']['trips']['Insert']) {
    const { data, error } = await supabase
      .from('trips')
      .insert(trip)
      .select()
      .single()
    
    return { data, error }
  },

  // Get trip with full details
  async getTripDetails(tripId: string) {
    const { data, error } = await supabase
      .from('trips')
      .select(`
        *,
        passenger:profiles!trips_passenger_id_fkey(*),
        driver:driver_profiles!trips_driver_id_fkey(
          *,
          profile:profiles(*)
        ),
        vehicle_type:vehicle_types(*)
      `)
      .eq('id', tripId)
      .single()
    
    return { data, error }
  },

  // Update trip status
  async updateTripStatus(tripId: string, status: Database['public']['Tables']['trips']['Row']['status']) {
    const { data, error } = await supabase
      .from('trips')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', tripId)
      .select()
      .single()
    
    return { data, error }
  },

  // Get user trips
  async getUserTrips(userId: string, limit = 20) {
    const { data, error } = await supabase
      .from('trips')
      .select(`
        *,
        driver:driver_profiles!trips_driver_id_fkey(
          *,
          profile:profiles(*)
        ),
        vehicle_type:vehicle_types(*)
      `)
      .eq('passenger_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    return { data, error }
  },

  // Get driver trips
  async getDriverTrips(driverId: string, limit = 20) {
    const { data, error } = await supabase
      .from('trips')
      .select(`
        *,
        passenger:profiles!trips_passenger_id_fkey(*),
        vehicle_type:vehicle_types(*)
      `)
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    return { data, error }
  },
}

// ===================================================================
// Vehicle Management
// ===================================================================

export const VehicleService = {
  // Get all active vehicle types
  async getActiveVehicleTypes() {
    const { data, error } = await supabase
      .from('vehicle_types')
      .select('*')
      .eq('is_active', true)
      .order('base_fare', { ascending: true })
    
    return { data, error }
  },

  // Calculate trip fare
  async calculateFare(vehicleTypeId: string, distanceKm: number, durationMinutes: number, surgeMultiplier = 1.0) {
    const { data, error } = await supabase
      .rpc('calculate_trip_fare', {
        vehicle_type_id: vehicleTypeId,
        distance_km: distanceKm,
        duration_minutes: durationMinutes,
        surge_multiplier: surgeMultiplier
      })
    
    return { data, error }
  },
}

// ===================================================================
// Driver Management
// ===================================================================

export const DriverService = {
  // Get nearby drivers
  async getNearbyDrivers(latitude: number, longitude: number, radiusKm = 10) {
    const { data, error } = await supabase
      .from('driver_profiles')
      .select(`
        *,
        profile:profiles(*)
      `)
      .eq('availability_status', 'online')
      .not('current_location', 'is', null)
    
    // Note: In production, you would use PostGIS functions for proper geospatial queries
    return { data, error }
  },

  // Update driver location
  async updateDriverLocation(driverId: string, latitude: number, longitude: number) {
    const location = `POINT(${longitude} ${latitude})`
    
    const { data, error } = await supabase
      .from('driver_profiles')
      .update({ 
        current_location: location,
        updated_at: new Date().toISOString()
      })
      .eq('id', driverId)
      .select()
      .single()
    
    return { data, error }
  },

  // Update driver availability
  async updateDriverAvailability(driverId: string, status: Database['public']['Tables']['driver_profiles']['Row']['availability_status']) {
    const { data, error } = await supabase
      .from('driver_profiles')
      .update({ 
        availability_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', driverId)
      .select()
      .single()
    
    return { data, error }
  },
}

// ===================================================================
// Rating System
// ===================================================================

export const RatingService = {
  // Create rating
  async createRating(rating: Database['public']['Tables']['ratings']['Insert']) {
    const { data, error } = await supabase
      .from('ratings')
      .insert(rating)
      .select()
      .single()
    
    return { data, error }
  },

  // Get user ratings
  async getUserRatings(userId: string, serviceType?: Database['public']['Tables']['ratings']['Row']['service_type']) {
    let query = supabase
      .from('ratings')
      .select(`
        *,
        reviewer:profiles!ratings_reviewer_id_fkey(*),
        reviewed:profiles!ratings_reviewed_id_fkey(*)
      `)
      .eq('reviewed_id', userId)
    
    if (serviceType) {
      query = query.eq('service_type', serviceType)
    }
    
    const { data, error } = await query
      .order('created_at', { ascending: false })
    
    return { data, error }
  },
}

// ===================================================================
// Notification System
// ===================================================================

export const NotificationService = {
  // Send notification
  async sendNotification(notification: Database['public']['Tables']['notifications']['Insert']) {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single()
    
    return { data, error }
  },

  // Get user notifications
  async getUserNotifications(userId: string, limit = 50) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    return { data, error }
  },

  // Mark notification as read
  async markAsRead(notificationId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select()
      .single()
    
    return { data, error }
  },
}

// ===================================================================
// Real-time Subscriptions
// ===================================================================

export const RealtimeService = {
  // Subscribe to trip updates
  subscribeToTrip(tripId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`trip:${tripId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'trips',
          filter: `id=eq.${tripId}`
        }, 
        callback
      )
      .subscribe()
  },

  // Subscribe to driver location updates
  subscribeToDriverLocation(driverId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`driver:${driverId}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'driver_profiles',
          filter: `id=eq.${driverId}`
        }, 
        callback
      )
      .subscribe()
  },

  // Subscribe to user notifications
  subscribeToNotifications(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        }, 
        callback
      )
      .subscribe()
  },
}

// ===================================================================
// Error Handling Utilities
// ===================================================================

export const handleSupabaseError = (error: any) => {
  console.error('Supabase Error:', error)
  
  if (error?.code === 'PGRST116') {
    return 'لم يتم العثور على البيانات المطلوبة'
  }
  
  if (error?.code === '23505') {
    return 'البيانات موجودة مسبقاً'
  }
  
  if (error?.code === 'PGRST301') {
    return 'غير مصرح لك بالوصول لهذه البيانات'
  }
  
  return error?.message || 'حدث خطأ غير متوقع'
}

export default supabase
