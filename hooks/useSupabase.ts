// ===================================================================
// Custom Hooks for Data Fetching - IGTaxi
// ===================================================================

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../utils/supabase'
import { ProfileService, TripService, VehicleService, DriverService } from '../utils/supabase-services'
import type { Profile, DriverProfile, Trip, VehicleType, TripWithDetails } from '../types/supabase-complete'

// ===================================================================
// Profile Hooks
// ===================================================================

export const useProfile = (userId?: string) => {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await ProfileService.getProfile(userId)
      
      if (error) {
        setError(error.message)
      } else {
        setProfile(data)
      }
    } catch (err) {
      setError('حدث خطأ في جلب بيانات الملف الشخصي')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return { profile, loading, error, refetch: fetchProfile }
}

export const useDriverProfile = (profileId?: string) => {
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDriverProfile = useCallback(async () => {
    if (!profileId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await ProfileService.getDriverProfile(profileId)
      
      if (error) {
        setError(error.message)
      } else {
        setDriverProfile(data)
      }
    } catch (err) {
      setError('حدث خطأ في جلب بيانات السائق')
    } finally {
      setLoading(false)
    }
  }, [profileId])

  useEffect(() => {
    fetchDriverProfile()
  }, [fetchDriverProfile])

  return { driverProfile, loading, error, refetch: fetchDriverProfile }
}

// ===================================================================
// Vehicle Hooks
// ===================================================================

export const useVehicleTypes = () => {
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVehicleTypes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await VehicleService.getActiveVehicleTypes()
      
      if (error) {
        setError(error.message)
      } else {
        setVehicleTypes(data || [])
      }
    } catch (err) {
      setError('حدث خطأ في جلب أنواع المركبات')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVehicleTypes()
  }, [fetchVehicleTypes])

  return { vehicleTypes, loading, error, refetch: fetchVehicleTypes }
}

// ===================================================================
// Trip Hooks
// ===================================================================

export const useTrip = (tripId?: string) => {
  const [trip, setTrip] = useState<TripWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTrip = useCallback(async () => {
    if (!tripId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await TripService.getTripDetails(tripId)
      
      if (error) {
        setError(error.message)
      } else {
        setTrip(data)
      }
    } catch (err) {
      setError('حدث خطأ في جلب بيانات الرحلة')
    } finally {
      setLoading(false)
    }
  }, [tripId])

  useEffect(() => {
    fetchTrip()
  }, [fetchTrip])

  return { trip, loading, error, refetch: fetchTrip }
}

export const useUserTrips = (userId?: string, limit = 20) => {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTrips = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await TripService.getUserTrips(userId, limit)
      
      if (error) {
        setError(error.message)
      } else {
        setTrips(data || [])
      }
    } catch (err) {
      setError('حدث خطأ في جلب الرحلات')
    } finally {
      setLoading(false)
    }
  }, [userId, limit])

  useEffect(() => {
    fetchTrips()
  }, [fetchTrips])

  return { trips, loading, error, refetch: fetchTrips }
}

export const useDriverTrips = (driverId?: string, limit = 20) => {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTrips = useCallback(async () => {
    if (!driverId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await TripService.getDriverTrips(driverId, limit)
      
      if (error) {
        setError(error.message)
      } else {
        setTrips(data || [])
      }
    } catch (err) {
      setError('حدث خطأ في جلب رحلات السائق')
    } finally {
      setLoading(false)
    }
  }, [driverId, limit])

  useEffect(() => {
    fetchTrips()
  }, [fetchTrips])

  return { trips, loading, error, refetch: fetchTrips }
}

// ===================================================================
// Driver Location Hook
// ===================================================================

export const useNearbyDrivers = (latitude?: number, longitude?: number, radiusKm = 10) => {
  const [drivers, setDrivers] = useState<DriverProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNearbyDrivers = useCallback(async () => {
    if (!latitude || !longitude) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await DriverService.getNearbyDrivers(latitude, longitude, radiusKm)
      
      if (error) {
        setError(error.message)
      } else {
        setDrivers(data || [])
      }
    } catch (err) {
      setError('حدث خطأ في جلب السائقين المتاحين')
    } finally {
      setLoading(false)
    }
  }, [latitude, longitude, radiusKm])

  useEffect(() => {
    fetchNearbyDrivers()
  }, [fetchNearbyDrivers])

  return { drivers, loading, error, refetch: fetchNearbyDrivers }
}

// ===================================================================
// Authentication Hook
// ===================================================================

export const useAuth = () => {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
      } catch (err) {
        setError('حدث خطأ في جلب بيانات المستخدم')
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      setError(null)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        setError(error.message)
        return { success: false, error: error.message }
      }
      
      return { success: true, user: data.user }
    } catch (err) {
      setError('حدث خطأ في تسجيل الدخول')
      return { success: false, error: 'حدث خطأ في تسجيل الدخول' }
    }
  }

  const signUp = async (email: string, password: string, additionalData?: any) => {
    try {
      setError(null)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: additionalData
        }
      })
      
      if (error) {
        setError(error.message)
        return { success: false, error: error.message }
      }
      
      return { success: true, user: data.user }
    } catch (err) {
      setError('حدث خطأ في إنشاء الحساب')
      return { success: false, error: 'حدث خطأ في إنشاء الحساب' }
    }
  }

  const signOut = async () => {
    try {
      setError(null)
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        setError(error.message)
        return { success: false, error: error.message }
      }
      
      return { success: true }
    } catch (err) {
      setError('حدث خطأ في تسجيل الخروج')
      return { success: false, error: 'حدث خطأ في تسجيل الخروج' }
    }
  }

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user
  }
}

// ===================================================================
// Real-time Trip Updates Hook
// ===================================================================

export const useRealtimeTrip = (tripId?: string) => {
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tripId) {
      setLoading(false)
      return
    }

    // Initial fetch
    const fetchTrip = async () => {
      try {
        const { data, error } = await TripService.getTripDetails(tripId)
        if (error) {
          setError(error.message)
        } else {
          setTrip(data)
        }
      } catch (err) {
        setError('حدث خطأ في جلب بيانات الرحلة')
      } finally {
        setLoading(false)
      }
    }

    fetchTrip()

    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`trip:${tripId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'trips',
          filter: `id=eq.${tripId}`
        }, 
        (payload) => {
          if (payload.new) {
            setTrip(payload.new as Trip)
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [tripId])

  return { trip, loading, error }
}

// ===================================================================
// Fare Calculation Hook
// ===================================================================

export const useFareCalculation = () => {
  const [fare, setFare] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const calculateFare = useCallback(async (
    vehicleTypeId: string,
    distanceKm: number,
    durationMinutes: number,
    surgeMultiplier = 1.0
  ) => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await VehicleService.calculateFare(
        vehicleTypeId,
        distanceKm,
        durationMinutes,
        surgeMultiplier
      )
      
      if (error) {
        setError(error.message)
      } else {
        setFare(data)
      }
    } catch (err) {
      setError('حدث خطأ في حساب التكلفة')
    } finally {
      setLoading(false)
    }
  }, [])

  return { fare, loading, error, calculateFare }
}

export default {
  useProfile,
  useDriverProfile,
  useVehicleTypes,
  useTrip,
  useUserTrips,
  useDriverTrips,
  useNearbyDrivers,
  useAuth,
  useRealtimeTrip,
  useFareCalculation,
}
