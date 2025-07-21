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
          full_name: string
          phone: string | null
          email: string | null
          avatar_url: string | null
          role: 'user' | 'driver' | 'admin'
          preferred_language: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          phone?: string | null
          email?: string | null
          avatar_url?: string | null
          role?: 'user' | 'driver' | 'admin'
          preferred_language?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          phone?: string | null
          email?: string | null
          avatar_url?: string | null
          role?: 'user' | 'driver' | 'admin'
          preferred_language?: string
          created_at?: string
          updated_at?: string
        }
      }
      driver_profiles: {
        Row: {
          id: string
          license_number: string
          verification_status: string
          current_location: any | null
          status: 'available' | 'busy' | 'offline'
          average_rating: number
          total_trips: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          license_number: string
          verification_status?: string
          current_location?: any | null
          status?: 'available' | 'busy' | 'offline'
          average_rating?: number
          total_trips?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          license_number?: string
          verification_status?: string
          current_location?: any | null
          status?: 'available' | 'busy' | 'offline'
          average_rating?: number
          total_trips?: number
          created_at?: string
          updated_at?: string
        }
      }
      transport_requests: {
        Row: {
          id: string
          user_id: string
          cargo_type: 'furniture' | 'electronics' | 'food' | 'construction' | 'clothing' | 'documents' | 'fragile' | 'other'
          weight: number
          weight_unit: 'kg' | 'ton'
          dimensions?: Json | null
          special_instructions?: string | null
          pickup_locations: Json
          delivery_locations: Json
          preferred_pickup_time?: string | null
          required_delivery_time?: string | null
          flexible_timing?: boolean
          budget_min: number
          budget_max: number
          currency: string
          contact_name: string
          contact_phone: string
          status: 'pending' | 'offers_received' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
          insurance_required?: boolean
          loading_assistance_required?: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          cargo_type: 'furniture' | 'electronics' | 'food' | 'construction' | 'clothing' | 'documents' | 'fragile' | 'other'
          weight: number
          weight_unit: 'kg' | 'ton'
          dimensions?: Json | null
          special_instructions?: string | null
          pickup_locations: Json
          delivery_locations: Json
          preferred_pickup_time?: string | null
          required_delivery_time?: string | null
          flexible_timing?: boolean
          budget_min: number
          budget_max: number
          currency?: string
          contact_name: string
          contact_phone: string
          status?: 'pending' | 'offers_received' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
          insurance_required?: boolean
          loading_assistance_required?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          cargo_type?: 'furniture' | 'electronics' | 'food' | 'construction' | 'clothing' | 'documents' | 'fragile' | 'other'
          weight?: number
          weight_unit?: 'kg' | 'ton'
          dimensions?: Json | null
          special_instructions?: string | null
          pickup_locations?: Json
          delivery_locations?: Json
          preferred_pickup_time?: string | null
          required_delivery_time?: string | null
          flexible_timing?: boolean
          budget_min?: number
          budget_max?: number
          currency?: string
          contact_name?: string
          contact_phone?: string
          status?: 'pending' | 'offers_received' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
          insurance_required?: boolean
          loading_assistance_required?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      transport_offers: {
        Row: {
          id: string
          request_id: string
          transporter_id: string
          offered_price: number
          currency: string
          estimated_pickup_time?: string | null
          estimated_delivery_time?: string | null
          vehicle_info: Json
          message?: string | null
          insurance_included?: boolean
          loading_assistance_included?: boolean
          status: 'pending' | 'accepted' | 'rejected' | 'expired'
          accepted_at?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          request_id: string
          transporter_id: string
          offered_price: number
          currency?: string
          estimated_pickup_time?: string | null
          estimated_delivery_time?: string | null
          vehicle_info: Json
          message?: string | null
          insurance_included?: boolean
          loading_assistance_included?: boolean
          status?: 'pending' | 'accepted' | 'rejected' | 'expired'
          accepted_at?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          transporter_id?: string
          offered_price?: number
          currency?: string
          estimated_pickup_time?: string | null
          estimated_delivery_time?: string | null
          vehicle_info?: Json
          message?: string | null
          insurance_included?: boolean
          loading_assistance_included?: boolean
          status?: 'pending' | 'accepted' | 'rejected' | 'expired'
          accepted_at?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      transport_trips: {
        Row: {
          id: string
          request_id: string
          offer_id: string
          transporter_id: string
          customer_id: string
          pickup_time?: string | null
          delivery_time?: string | null
          actual_pickup_location?: Json | null
          actual_delivery_location?: Json | null
          status: 'assigned' | 'en_route_pickup' | 'pickup_arrived' | 'cargo_loaded' | 'en_route_delivery' | 'delivery_arrived' | 'cargo_delivered' | 'completed' | 'cancelled'
          final_price: number
          commission_rate?: number
          commission_amount?: number | null
          payment_status?: 'pending' | 'paid' | 'refunded'
          customer_rating?: number | null
          customer_review?: string | null
          transporter_rating?: number | null
          transporter_review?: string | null
          notes?: string | null
          photos?: Json | null
          created_at: string
          updated_at: string
          completed_at?: string | null
        }
        Insert: {
          id?: string
          request_id: string
          offer_id: string
          transporter_id: string
          customer_id: string
          pickup_time?: string | null
          delivery_time?: string | null
          actual_pickup_location?: Json | null
          actual_delivery_location?: Json | null
          status?: 'assigned' | 'en_route_pickup' | 'pickup_arrived' | 'cargo_loaded' | 'en_route_delivery' | 'delivery_arrived' | 'cargo_delivered' | 'completed' | 'cancelled'
          final_price: number
          commission_rate?: number
          commission_amount?: number | null
          payment_status?: 'pending' | 'paid' | 'refunded'
          customer_rating?: number | null
          customer_review?: string | null
          transporter_rating?: number | null
          transporter_review?: string | null
          notes?: string | null
          photos?: Json | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          request_id?: string
          offer_id?: string
          transporter_id?: string
          customer_id?: string
          pickup_time?: string | null
          delivery_time?: string | null
          actual_pickup_location?: Json | null
          actual_delivery_location?: Json | null
          status?: 'assigned' | 'en_route_pickup' | 'pickup_arrived' | 'cargo_loaded' | 'en_route_delivery' | 'delivery_arrived' | 'cargo_delivered' | 'completed' | 'cancelled'
          final_price?: number
          commission_rate?: number
          commission_amount?: number | null
          payment_status?: 'pending' | 'paid' | 'refunded'
          customer_rating?: number | null
          customer_review?: string | null
          transporter_rating?: number | null
          transporter_review?: string | null
          notes?: string | null
          photos?: Json | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
      }
      transporter_profiles: {
        Row: {
          id: string
          user_id: string
          company_name?: string | null
          license_number?: string | null
          commercial_registration?: string | null
          business_phone?: string | null
          business_email?: string | null
          business_address?: string | null
          vehicles: Json
          service_areas: Json
          service_radius?: number
          years_of_experience?: number
          completed_trips?: number
          average_rating?: number
          total_reviews?: number
          verification_status?: 'pending' | 'verified' | 'rejected' | 'suspended'
          is_active?: boolean
          is_available?: boolean
          documents?: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_name?: string | null
          license_number?: string | null
          commercial_registration?: string | null
          business_phone?: string | null
          business_email?: string | null
          business_address?: string | null
          vehicles?: Json
          service_areas?: Json
          service_radius?: number
          years_of_experience?: number
          completed_trips?: number
          average_rating?: number
          total_reviews?: number
          verification_status?: 'pending' | 'verified' | 'rejected' | 'suspended'
          is_active?: boolean
          is_available?: boolean
          documents?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_name?: string | null
          license_number?: string | null
          commercial_registration?: string | null
          business_phone?: string | null
          business_email?: string | null
          business_address?: string | null
          vehicles?: Json
          service_areas?: Json
          service_radius?: number
          years_of_experience?: number
          completed_trips?: number
          average_rating?: number
          total_reviews?: number
          verification_status?: 'pending' | 'verified' | 'rejected' | 'suspended'
          is_active?: boolean
          is_available?: boolean
          documents?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      transport_contracts: {
        Row: {
          id: string
          customer_id: string
          transporter_id?: string | null
          contract_type: 'corporate' | 'school' | 'hotel' | 'employee' | 'personal' | 'workers'
          duration_type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'semester' | 'project-based'
          start_date: string
          end_date?: string | null
          contract_details: Json
          service_locations: Json
          service_schedule?: Json | null
          monthly_amount?: number | null
          total_amount?: number | null
          payment_terms?: string | null
          status: 'draft' | 'pending_approval' | 'active' | 'suspended' | 'expired' | 'cancelled'
          customer_signature_date?: string | null
          transporter_signature_date?: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          transporter_id?: string | null
          contract_type: 'corporate' | 'school' | 'hotel' | 'employee' | 'personal' | 'workers'
          duration_type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'semester' | 'project-based'
          start_date: string
          end_date?: string | null
          contract_details: Json
          service_locations: Json
          service_schedule?: Json | null
          monthly_amount?: number | null
          total_amount?: number | null
          payment_terms?: string | null
          status?: 'draft' | 'pending_approval' | 'active' | 'suspended' | 'expired' | 'cancelled'
          customer_signature_date?: string | null
          transporter_signature_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          transporter_id?: string | null
          contract_type?: 'corporate' | 'school' | 'hotel' | 'employee' | 'personal' | 'workers'
          duration_type?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'semester' | 'project-based'
          start_date?: string
          end_date?: string | null
          contract_details?: Json
          service_locations?: Json
          service_schedule?: Json | null
          monthly_amount?: number | null
          total_amount?: number | null
          payment_terms?: string | null
          status?: 'draft' | 'pending_approval' | 'active' | 'suspended' | 'expired' | 'cancelled'
          customer_signature_date?: string | null
          transporter_signature_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

export type UserType = 'personal' | 'driver' | 'transporter' | 'special_driver' | 'business';

// Transport System Types
export type CargoType = 'furniture' | 'electronics' | 'food' | 'construction' | 'clothing' | 'documents' | 'fragile' | 'other';
export type WeightUnit = 'kg' | 'ton';
export type TransportRequestStatus = 'pending' | 'offers_received' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
export type TransportOfferStatus = 'pending' | 'accepted' | 'rejected' | 'expired';
export type TransportTripStatus = 'assigned' | 'en_route_pickup' | 'pickup_arrived' | 'cargo_loaded' | 'en_route_delivery' | 'delivery_arrived' | 'cargo_delivered' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'refunded';
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended';
export type ContractType = 'corporate' | 'school' | 'hotel' | 'employee' | 'personal' | 'workers';
export type DurationType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'semester' | 'project-based';
export type ContractStatus = 'draft' | 'pending_approval' | 'active' | 'suspended' | 'expired' | 'cancelled';

// Location Interface
export interface Location {
  address: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  type: 'pickup' | 'delivery';
}

// Vehicle Interface
export interface Vehicle {
  make: string;
  model: string;
  year: number;
  type: string;
  capacity: string;
  license_plate?: string;
}

// Transport Request Interface
export interface TransportRequest {
  id: string;
  user_id: string;
  cargo_type: CargoType;
  weight: number;
  weight_unit: WeightUnit;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  special_instructions?: string;
  pickup_locations: Location[];
  delivery_locations: Location[];
  preferred_pickup_time?: string;
  required_delivery_time?: string;
  flexible_timing: boolean;
  budget_min: number;
  budget_max: number;
  currency: string;
  contact_name: string;
  contact_phone: string;
  status: TransportRequestStatus;
  insurance_required: boolean;
  loading_assistance_required: boolean;
  created_at: string;
  updated_at: string;
}

// Transport Offer Interface
export interface TransportOffer {
  id: string;
  request_id: string;
  transporter_id: string;
  offered_price: number;
  currency: string;
  estimated_pickup_time?: string;
  estimated_delivery_time?: string;
  vehicle_info: Vehicle;
  message?: string;
  insurance_included: boolean;
  loading_assistance_included: boolean;
  status: TransportOfferStatus;
  accepted_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

// Transporter Profile Interface
export interface TransporterProfile {
  id: string;
  user_id: string;
  company_name?: string;
  license_number?: string;
  commercial_registration?: string;
  business_phone?: string;
  business_email?: string;
  business_address?: string;
  vehicles: Vehicle[];
  service_areas: string[];
  service_radius: number;
  years_of_experience: number;
  completed_trips: number;
  average_rating: number;
  total_reviews: number;
  verification_status: VerificationStatus;
  is_active: boolean;
  is_available: boolean;
  documents?: {
    license_copy?: string;
    registration_copy?: string;
    insurance_copy?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  type: UserType;
  verified: boolean;
  created_at: string;
  updated_at: string;
}