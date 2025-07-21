// ===================================================================
// App Context - State Management for IGTaxi
// ===================================================================

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { supabase } from '../utils/supabase'
import { ProfileService } from '../utils/supabase-services'
import type { Profile, DriverProfile } from '../types/supabase-complete'

// ===================================================================
// Types
// ===================================================================

interface User {
  id: string
  email?: string
  phone?: string
  created_at?: string
}

interface AppState {
  // Authentication
  user: User | null
  isAuthenticated: boolean
  authLoading: boolean

  // Profile
  profile: Profile | null
  driverProfile: DriverProfile | null
  profileLoading: boolean

  // Location
  currentLocation: {
    latitude: number
    longitude: number
    accuracy?: number
    address?: string
  } | null
  locationLoading: boolean

  // App State
  isOnline: boolean
  language: 'ar' | 'en'
  theme: 'light' | 'dark'

  // Trip State
  activeTrip: any | null
  tripRequests: any[]

  // Errors
  error: string | null
}

type AppAction = 
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_AUTH_LOADING'; payload: boolean }
  | { type: 'SET_PROFILE'; payload: Profile | null }
  | { type: 'SET_DRIVER_PROFILE'; payload: DriverProfile | null }
  | { type: 'SET_PROFILE_LOADING'; payload: boolean }
  | { type: 'SET_LOCATION'; payload: AppState['currentLocation'] }
  | { type: 'SET_LOCATION_LOADING'; payload: boolean }
  | { type: 'SET_ONLINE_STATUS'; payload: boolean }
  | { type: 'SET_LANGUAGE'; payload: 'ar' | 'en' }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_ACTIVE_TRIP'; payload: any }
  | { type: 'SET_TRIP_REQUESTS'; payload: any[] }
  | { type: 'ADD_TRIP_REQUEST'; payload: any }
  | { type: 'REMOVE_TRIP_REQUEST'; payload: string }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ALL_DATA' }

// ===================================================================
// Initial State
// ===================================================================

const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  authLoading: true,
  profile: null,
  driverProfile: null,
  profileLoading: false,
  currentLocation: null,
  locationLoading: false,
  isOnline: true,
  language: 'ar',
  theme: 'light',
  activeTrip: null,
  tripRequests: [],
  error: null,
}

// ===================================================================
// Reducer
// ===================================================================

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        authLoading: false,
      }

    case 'SET_AUTH_LOADING':
      return {
        ...state,
        authLoading: action.payload,
      }

    case 'SET_PROFILE':
      return {
        ...state,
        profile: action.payload,
        profileLoading: false,
      }

    case 'SET_DRIVER_PROFILE':
      return {
        ...state,
        driverProfile: action.payload,
      }

    case 'SET_PROFILE_LOADING':
      return {
        ...state,
        profileLoading: action.payload,
      }

    case 'SET_LOCATION':
      return {
        ...state,
        currentLocation: action.payload,
        locationLoading: false,
      }

    case 'SET_LOCATION_LOADING':
      return {
        ...state,
        locationLoading: action.payload,
      }

    case 'SET_ONLINE_STATUS':
      return {
        ...state,
        isOnline: action.payload,
      }

    case 'SET_LANGUAGE':
      return {
        ...state,
        language: action.payload,
      }

    case 'SET_THEME':
      return {
        ...state,
        theme: action.payload,
      }

    case 'SET_ACTIVE_TRIP':
      return {
        ...state,
        activeTrip: action.payload,
      }

    case 'SET_TRIP_REQUESTS':
      return {
        ...state,
        tripRequests: action.payload,
      }

    case 'ADD_TRIP_REQUEST':
      return {
        ...state,
        tripRequests: [...state.tripRequests, action.payload],
      }

    case 'REMOVE_TRIP_REQUEST':
      return {
        ...state,
        tripRequests: state.tripRequests.filter(req => req.id !== action.payload),
      }

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      }

    case 'CLEAR_ALL_DATA':
      return {
        ...initialState,
        authLoading: false,
      }

    default:
      return state
  }
}

// ===================================================================
// Context
// ===================================================================

interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<AppAction>
  
  // Auth Actions
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, userData?: any) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  
  // Profile Actions
  loadProfile: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<{ success: boolean; error?: string }>
  
  // Location Actions
  getCurrentLocation: () => Promise<void>
  updateLocation: (latitude: number, longitude: number) => void
  
  // Trip Actions
  createTripRequest: (tripData: any) => Promise<{ success: boolean; tripId?: string; error?: string }>
  acceptTripRequest: (tripId: string) => Promise<{ success: boolean; error?: string }>
  cancelTrip: (tripId: string, reason?: string) => Promise<{ success: boolean; error?: string }>
  
  // Utility Actions
  clearError: () => void
  setLanguage: (lang: 'ar' | 'en') => void
  setTheme: (theme: 'light' | 'dark') => void
  toggleOnlineStatus: () => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

// ===================================================================
// Provider Component
// ===================================================================

interface AppProviderProps {
  children: ReactNode
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState)

  // ===================================================================
  // Authentication Effects
  // ===================================================================

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (mounted) {
          if (session?.user) {
            dispatch({ type: 'SET_USER', payload: session.user as User })
          } else {
            dispatch({ type: 'SET_AUTH_LOADING', payload: false })
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (mounted) {
          dispatch({ type: 'SET_ERROR', payload: 'حدث خطأ في تحميل بيانات المستخدم' })
          dispatch({ type: 'SET_AUTH_LOADING', payload: false })
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        if (session?.user) {
          dispatch({ type: 'SET_USER', payload: session.user as User })
          // Load profile when user logs in
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            loadProfile()
          }
        } else {
          dispatch({ type: 'CLEAR_ALL_DATA' })
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // ===================================================================
  // Auth Actions
  // ===================================================================

  const signIn = async (email: string, password: string) => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null })
      dispatch({ type: 'SET_AUTH_LOADING', payload: true })

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message })
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      const errorMessage = 'حدث خطأ في تسجيل الدخول'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      return { success: false, error: errorMessage }
    } finally {
      dispatch({ type: 'SET_AUTH_LOADING', payload: false })
    }
  }

  const signUp = async (email: string, password: string, userData?: any) => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null })
      dispatch({ type: 'SET_AUTH_LOADING', payload: true })

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      })

      if (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message })
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      const errorMessage = 'حدث خطأ في إنشاء الحساب'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      return { success: false, error: errorMessage }
    } finally {
      dispatch({ type: 'SET_AUTH_LOADING', payload: false })
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      dispatch({ type: 'CLEAR_ALL_DATA' })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'حدث خطأ في تسجيل الخروج' })
    }
  }

  // ===================================================================
  // Profile Actions
  // ===================================================================

  const loadProfile = async () => {
    if (!state.user?.id) return

    try {
      dispatch({ type: 'SET_PROFILE_LOADING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })

      const { data: profile, error: profileError } = await ProfileService.getProfile(state.user.id)
      
      if (profileError) {
        dispatch({ type: 'SET_ERROR', payload: profileError.message })
        return
      }

      dispatch({ type: 'SET_PROFILE', payload: profile })

      // Load driver profile if user is a driver
      if (profile && profile.user_type === 'driver') {
        const { data: driverProfile, error: driverError } = await ProfileService.getDriverProfile(profile.id!)
        
        if (!driverError && driverProfile) {
          dispatch({ type: 'SET_DRIVER_PROFILE', payload: driverProfile })
        }
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'حدث خطأ في تحميل بيانات الملف الشخصي' })
    } finally {
      dispatch({ type: 'SET_PROFILE_LOADING', payload: false })
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!state.profile?.id) {
      return { success: false, error: 'لا يوجد ملف شخصي' }
    }

    try {
      dispatch({ type: 'SET_ERROR', payload: null })

      const { data, error } = await ProfileService.updateProfile(state.profile.id, updates)
      
      if (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message })
        return { success: false, error: error.message }
      }

      dispatch({ type: 'SET_PROFILE', payload: data })
      return { success: true }
    } catch (error) {
      const errorMessage = 'حدث خطأ في تحديث الملف الشخصي'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      return { success: false, error: errorMessage }
    }
  }

  // ===================================================================
  // Location Actions
  // ===================================================================

  const getCurrentLocation = async () => {
    try {
      dispatch({ type: 'SET_LOCATION_LOADING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })

      // For web/React Native
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            dispatch({
              type: 'SET_LOCATION',
              payload: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
              }
            })
          },
          (error) => {
            dispatch({ type: 'SET_ERROR', payload: 'لا يمكن الحصول على الموقع الحالي' })
            dispatch({ type: 'SET_LOCATION_LOADING', payload: false })
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000
          }
        )
      } else {
        dispatch({ type: 'SET_ERROR', payload: 'خدمة الموقع غير متاحة' })
        dispatch({ type: 'SET_LOCATION_LOADING', payload: false })
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'حدث خطأ في الحصول على الموقع' })
      dispatch({ type: 'SET_LOCATION_LOADING', payload: false })
    }
  }

  const updateLocation = (latitude: number, longitude: number) => {
    dispatch({
      type: 'SET_LOCATION',
      payload: { latitude, longitude }
    })
  }

  // ===================================================================
  // Trip Actions (Placeholder implementations)
  // ===================================================================

  const createTripRequest = async (tripData: any) => {
    // Implementation will be added when trip creation is needed
    return { success: true, tripId: 'placeholder' }
  }

  const acceptTripRequest = async (tripId: string) => {
    // Implementation will be added when trip acceptance is needed
    return { success: true }
  }

  const cancelTrip = async (tripId: string, reason?: string) => {
    // Implementation will be added when trip cancellation is needed
    return { success: true }
  }

  // ===================================================================
  // Utility Actions
  // ===================================================================

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null })
  }

  const setLanguage = (lang: 'ar' | 'en') => {
    dispatch({ type: 'SET_LANGUAGE', payload: lang })
  }

  const setTheme = (theme: 'light' | 'dark') => {
    dispatch({ type: 'SET_THEME', payload: theme })
  }

  const toggleOnlineStatus = () => {
    dispatch({ type: 'SET_ONLINE_STATUS', payload: !state.isOnline })
  }

  // ===================================================================
  // Context Value
  // ===================================================================

  const contextValue: AppContextType = {
    state,
    dispatch,
    signIn,
    signUp,
    signOut,
    loadProfile,
    updateProfile,
    getCurrentLocation,
    updateLocation,
    createTripRequest,
    acceptTripRequest,
    cancelTrip,
    clearError,
    setLanguage,
    setTheme,
    toggleOnlineStatus,
  }

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  )
}

// ===================================================================
// Hook
// ===================================================================

export const useApp = () => {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

export default AppContext
