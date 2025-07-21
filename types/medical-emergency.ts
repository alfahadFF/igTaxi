import React from 'react';

// Medical Emergency Card Types
export interface MedicalCondition {
  id: string;
  name: string;
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  medications: string[];
  notes?: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  purpose: string;
  sideEffects?: string[];
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
}

export interface MedicalEmergencyCard {
  // Personal Information
  fullName: string;
  dateOfBirth: Date;
  bloodType: string;
  nationalId: string;
  
  // Medical Information
  medicalConditions: MedicalCondition[];
  currentMedications: Medication[];
  allergies: string[];
  
  // Emergency Information
  emergencyContacts: EmergencyContact[];
  preferredHospital?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  
  // Special Instructions
  specialInstructions?: string;
  language: string;
  
  // Timestamps
  lastUpdated: Date;
  isVisible: boolean; // Only visible during emergencies
}

// Emergency Types for different scenarios
export type EmergencyType = 
  | 'medical'      // Medical emergency (فقدان وعي، نوبة صرع، إلخ)
  | 'security'     // Security threat (اعتداء، خطف، إلخ)
  | 'accident'     // Traffic accident
  | 'panic'        // General panic/fear
  | 'health';      // General health issue

export interface EmergencyTrigger {
  id: string;
  type: EmergencyType;
  timestamp: Date;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  triggeredBy: 'passenger' | 'driver';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  autoResolved?: boolean;
}
