// ===================================================================
// IGTaxi Complete Database Types
// Generated from: 20250720_complete_igtaxi_system.sql
// ===================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          email: string
          full_name: string
          phone: string | null
          avatar_url: string | null
          user_type: 'personal' | 'driver' | 'business' | 'transporter'
          status: 'active' | 'inactive' | 'suspended' | 'pending'
          location: any // GEOGRAPHY(POINT, 4326)
          address: string | null
          city: string
          country: string
          language: string
          is_verified: boolean
          verification_documents: Json[]
          preferences: Json
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          full_name: string
          phone?: string | null
          avatar_url?: string | null
          user_type: 'personal' | 'driver' | 'business' | 'transporter'
          status?: 'active' | 'inactive' | 'suspended' | 'pending'
          location?: any
          address?: string | null
          city?: string
          country?: string
          language?: string
          is_verified?: boolean
          verification_documents?: Json[]
          preferences?: Json
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          full_name?: string
          phone?: string | null
          avatar_url?: string | null
          user_type?: 'personal' | 'driver' | 'business' | 'transporter'
          status?: 'active' | 'inactive' | 'suspended' | 'pending'
          location?: any
          address?: string | null
          city?: string
          country?: string
          language?: string
          is_verified?: boolean
          verification_documents?: Json[]
          preferences?: Json
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      driver_profiles: {
        Row: {
          id: string
          profile_id: string
          license_number: string
          license_type: string
          license_expiry: string
          vehicle_registration: string | null
          vehicle_model: string | null
          vehicle_year: number | null
          vehicle_color: string | null
          vehicle_type: 'sedan' | 'suv' | 'van' | 'luxury' | 'electric' | 'hybrid' | null
          vehicle_capacity: number
          rta_permit: string | null
          insurance_number: string | null
          insurance_expiry: string | null
          background_check_status: 'pending' | 'approved' | 'rejected'
          driving_experience_years: number | null
          languages_spoken: string[]
          specializations: string[] | null
          availability_status: 'online' | 'offline' | 'busy' | 'break'
          current_location: any
          home_base_location: any
          rating: number
          total_trips: number
          total_earnings: number
          commission_rate: number
          bank_account_details: Json | null
          working_hours: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          license_number: string
          license_type: string
          license_expiry: string
          vehicle_registration?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
          vehicle_color?: string | null
          vehicle_type?: 'sedan' | 'suv' | 'van' | 'luxury' | 'electric' | 'hybrid' | null
          vehicle_capacity?: number
          rta_permit?: string | null
          insurance_number?: string | null
          insurance_expiry?: string | null
          background_check_status?: 'pending' | 'approved' | 'rejected'
          driving_experience_years?: number | null
          languages_spoken?: string[]
          specializations?: string[] | null
          availability_status?: 'online' | 'offline' | 'busy' | 'break'
          current_location?: any
          home_base_location?: any
          rating?: number
          total_trips?: number
          total_earnings?: number
          commission_rate?: number
          bank_account_details?: Json | null
          working_hours?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          license_number?: string
          license_type?: string
          license_expiry?: string
          vehicle_registration?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
          vehicle_color?: string | null
          vehicle_type?: 'sedan' | 'suv' | 'van' | 'luxury' | 'electric' | 'hybrid' | null
          vehicle_capacity?: number
          rta_permit?: string | null
          insurance_number?: string | null
          insurance_expiry?: string | null
          background_check_status?: 'pending' | 'approved' | 'rejected'
          driving_experience_years?: number | null
          languages_spoken?: string[]
          specializations?: string[] | null
          availability_status?: 'online' | 'offline' | 'busy' | 'break'
          current_location?: any
          home_base_location?: any
          rating?: number
          total_trips?: number
          total_earnings?: number
          commission_rate?: number
          bank_account_details?: Json | null
          working_hours?: Json
          created_at?: string
          updated_at?: string
        }
      }
      vehicle_types: {
        Row: {
          id: string
          name: string
          name_ar: string
          description: string | null
          capacity: number
          base_fare: number
          per_km_rate: number
          per_minute_rate: number
          minimum_fare: number
          surge_multiplier: number
          fuel_type: 'petrol' | 'diesel' | 'electric' | 'hybrid'
          features: string[] | null
          icon_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          name_ar: string
          description?: string | null
          capacity: number
          base_fare: number
          per_km_rate: number
          per_minute_rate: number
          minimum_fare: number
          surge_multiplier?: number
          fuel_type?: 'petrol' | 'diesel' | 'electric' | 'hybrid'
          features?: string[] | null
          icon_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          name_ar?: string
          description?: string | null
          capacity?: number
          base_fare?: number
          per_km_rate?: number
          per_minute_rate?: number
          minimum_fare?: number
          surge_multiplier?: number
          fuel_type?: 'petrol' | 'diesel' | 'electric' | 'hybrid'
          features?: string[] | null
          icon_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      trips: {
        Row: {
          id: string
          passenger_id: string | null
          driver_id: string | null
          vehicle_type_id: string | null
          pickup_location: any
          pickup_address: string
          dropoff_location: any
          dropoff_address: string
          estimated_distance: number | null
          actual_distance: number | null
          estimated_duration: number | null
          actual_duration: number | null
          estimated_fare: number | null
          final_fare: number | null
          surge_multiplier: number
          status: 'pending' | 'accepted' | 'driver_arrived' | 'in_progress' | 'completed' | 'cancelled' | 'payment_pending'
          payment_method: 'cash' | 'card' | 'wallet'
          payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
          special_requests: string | null
          notes: string | null
          trip_route: Json | null
          rating_passenger: number | null
          rating_driver: number | null
          passenger_feedback: string | null
          driver_feedback: string | null
          cancellation_reason: string | null
          cancelled_by: string | null
          scheduled_at: string | null
          started_at: string | null
          arrived_at: string | null
          completed_at: string | null
          cancelled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          passenger_id?: string | null
          driver_id?: string | null
          vehicle_type_id?: string | null
          pickup_location: any
          pickup_address: string
          dropoff_location: any
          dropoff_address: string
          estimated_distance?: number | null
          actual_distance?: number | null
          estimated_duration?: number | null
          actual_duration?: number | null
          estimated_fare?: number | null
          final_fare?: number | null
          surge_multiplier?: number
          status?: 'pending' | 'accepted' | 'driver_arrived' | 'in_progress' | 'completed' | 'cancelled' | 'payment_pending'
          payment_method?: 'cash' | 'card' | 'wallet'
          payment_status?: 'pending' | 'completed' | 'failed' | 'refunded'
          special_requests?: string | null
          notes?: string | null
          trip_route?: Json | null
          rating_passenger?: number | null
          rating_driver?: number | null
          passenger_feedback?: string | null
          driver_feedback?: string | null
          cancellation_reason?: string | null
          cancelled_by?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          arrived_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          passenger_id?: string | null
          driver_id?: string | null
          vehicle_type_id?: string | null
          pickup_location?: any
          pickup_address?: string
          dropoff_location?: any
          dropoff_address?: string
          estimated_distance?: number | null
          actual_distance?: number | null
          estimated_duration?: number | null
          actual_duration?: number | null
          estimated_fare?: number | null
          final_fare?: number | null
          surge_multiplier?: number
          status?: 'pending' | 'accepted' | 'driver_arrived' | 'in_progress' | 'completed' | 'cancelled' | 'payment_pending'
          payment_method?: 'cash' | 'card' | 'wallet'
          payment_status?: 'pending' | 'completed' | 'failed' | 'refunded'
          special_requests?: string | null
          notes?: string | null
          trip_route?: Json | null
          rating_passenger?: number | null
          rating_driver?: number | null
          passenger_feedback?: string | null
          driver_feedback?: string | null
          cancellation_reason?: string | null
          cancelled_by?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          arrived_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      trip_offers: {
        Row: {
          id: string
          trip_id: string
          driver_id: string
          estimated_arrival_time: number
          offered_fare: number | null
          message: string | null
          status: 'pending' | 'accepted' | 'rejected' | 'expired'
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          driver_id: string
          estimated_arrival_time: number
          offered_fare?: number | null
          message?: string | null
          status?: 'pending' | 'accepted' | 'rejected' | 'expired'
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          driver_id?: string
          estimated_arrival_time?: number
          offered_fare?: number | null
          message?: string | null
          status?: 'pending' | 'accepted' | 'rejected' | 'expired'
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      ratings: {
        Row: {
          id: string
          reviewer_id: string
          reviewed_id: string
          service_type: 'taxi' | 'food_delivery' | 'pharmacy' | 'transport' | 'fuel' | 'parking' | 'event'
          order_id: string | null
          rating: number
          title: string | null
          comment: string | null
          tags: string[] | null
          is_anonymous: boolean
          is_verified: boolean
          helpful_count: number
          response: string | null
          response_date: string | null
          images: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reviewer_id: string
          reviewed_id: string
          service_type: 'taxi' | 'food_delivery' | 'pharmacy' | 'transport' | 'fuel' | 'parking' | 'event'
          order_id?: string | null
          rating: number
          title?: string | null
          comment?: string | null
          tags?: string[] | null
          is_anonymous?: boolean
          is_verified?: boolean
          helpful_count?: number
          response?: string | null
          response_date?: string | null
          images?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reviewer_id?: string
          reviewed_id?: string
          service_type?: 'taxi' | 'food_delivery' | 'pharmacy' | 'transport' | 'fuel' | 'parking' | 'event'
          order_id?: string | null
          rating?: number
          title?: string | null
          comment?: string | null
          tags?: string[] | null
          is_anonymous?: boolean
          is_verified?: boolean
          helpful_count?: number
          response?: string | null
          response_date?: string | null
          images?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          title_ar: string
          message: string
          message_ar: string
          type: 'info' | 'success' | 'warning' | 'error' | 'promotion'
          category: 'trip' | 'order' | 'payment' | 'system' | 'promotion' | 'reminder' | null
          data: Json
          is_read: boolean
          is_sent: boolean
          sent_at: string | null
          expires_at: string | null
          action_url: string | null
          priority: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          title_ar: string
          message: string
          message_ar: string
          type: 'info' | 'success' | 'warning' | 'error' | 'promotion'
          category?: 'trip' | 'order' | 'payment' | 'system' | 'promotion' | 'reminder' | null
          data?: Json
          is_read?: boolean
          is_sent?: boolean
          sent_at?: string | null
          expires_at?: string | null
          action_url?: string | null
          priority?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          title_ar?: string
          message?: string
          message_ar?: string
          type?: 'info' | 'success' | 'warning' | 'error' | 'promotion'
          category?: 'trip' | 'order' | 'payment' | 'system' | 'promotion' | 'reminder' | null
          data?: Json
          is_read?: boolean
          is_sent?: boolean
          sent_at?: string | null
          expires_at?: string | null
          action_url?: string | null
          priority?: number
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          order_type: string
          order_id: string
          amount: number
          currency: string
          type: 'payment' | 'refund' | 'commission' | 'penalty' | 'bonus'
          payment_method: 'cash' | 'card' | 'wallet' | 'bank_transfer' | 'apple_pay' | 'google_pay' | null
          payment_gateway: string | null
          gateway_transaction_id: string | null
          status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded'
          description: string | null
          metadata: Json
          processed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          order_type: string
          order_id: string
          amount: number
          currency?: string
          type: 'payment' | 'refund' | 'commission' | 'penalty' | 'bonus'
          payment_method?: 'cash' | 'card' | 'wallet' | 'bank_transfer' | 'apple_pay' | 'google_pay' | null
          payment_gateway?: string | null
          gateway_transaction_id?: string | null
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded'
          description?: string | null
          metadata?: Json
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          order_type?: string
          order_id?: string
          amount?: number
          currency?: string
          type?: 'payment' | 'refund' | 'commission' | 'penalty' | 'bonus'
          payment_method?: 'cash' | 'card' | 'wallet' | 'bank_transfer' | 'apple_pay' | 'google_pay' | null
          payment_gateway?: string | null
          gateway_transaction_id?: string | null
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded'
          description?: string | null
          metadata?: Json
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_distance: {
        Args: {
          lat1: number
          lon1: number
          lat2: number
          lon2: number
        }
        Returns: number
      }
      calculate_trip_fare: {
        Args: {
          vehicle_type_id: string
          distance_km: number
          duration_minutes: number
          surge_multiplier?: number
        }
        Returns: number
      }
      send_notification: {
        Args: {
          user_id: string
          title: string
          message: string
          notification_type?: string
          category?: string
          data?: Json
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Additional TypeScript types for better development experience
export type UserType = Database['public']['Tables']['profiles']['Row']['user_type']
export type TripStatus = Database['public']['Tables']['trips']['Row']['status']
export type PaymentMethod = Database['public']['Tables']['trips']['Row']['payment_method']
export type VehicleTypeEnum = Database['public']['Tables']['driver_profiles']['Row']['vehicle_type']
export type ServiceType = Database['public']['Tables']['ratings']['Row']['service_type']

// Utility types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type DriverProfile = Database['public']['Tables']['driver_profiles']['Row']
export type VehicleType = Database['public']['Tables']['vehicle_types']['Row']
export type Trip = Database['public']['Tables']['trips']['Row']
export type TripOffer = Database['public']['Tables']['trip_offers']['Row']
export type Rating = Database['public']['Tables']['ratings']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']

// Joined types for common use cases
export type DriverWithProfile = DriverProfile & {
  profile: Profile
}

export type TripWithDetails = Trip & {
  passenger: Profile | null
  driver: DriverProfile | null
  vehicle_type: VehicleType | null
}

// Location interface for geographic data
export interface LocationCoords {
  latitude: number
  longitude: number
}

export interface LocationWithAddress extends LocationCoords {
  address?: string
  name?: string
}

// Trip creation interface
export interface CreateTripRequest {
  pickup_location: LocationCoords
  pickup_address: string
  dropoff_location: LocationCoords
  dropoff_address: string
  vehicle_type_id: string
  payment_method?: PaymentMethod
  special_requests?: string
  scheduled_at?: string
}

// Driver availability update
export interface DriverLocationUpdate {
  driver_id: string
  location: LocationCoords
  availability_status: 'online' | 'offline' | 'busy' | 'break'
}

// Rating submission
export interface CreateRatingRequest {
  reviewed_id: string
  service_type: ServiceType
  order_id?: string
  rating: number
  title?: string
  comment?: string
  tags?: string[]
  is_anonymous?: boolean
}
