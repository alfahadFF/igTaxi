import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/utils/supabase';
import { Star } from 'lucide-react-native';

interface TripRatingProps {
  isVisible: boolean;
  onClose: () => void;
  tripId: string;
  driverId: string;
  customerId: string;
  onRatingComplete: () => void;
}

export default function TripRatingCard({ isVisible, onClose, tripId, driverId, customerId, onRatingComplete }: TripRatingProps) {
  const { t } = useTranslation();
  const [ratings, setRatings] = useState({
    service_quality: 0,
    vehicle_cleanliness: 0,
    punctuality: 0
  });
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // حساب متوسط التقييم من جميع المعايير
      const averageRating = (
        ratings.service_quality + 
        ratings.vehicle_cleanliness + 
        ratings.punctuality
      ) / 3;

      const { error } = await supabase.from('driver_ratings').insert({
        trip_id: tripId,
        driver_id: driverId,
        customer_id: customerId,
        rating: averageRating,
        service_quality: ratings.service_quality,
        vehicle_cleanliness: ratings.vehicle_cleanliness,
        punctuality: ratings.punctuality,
        comment: comment.trim()
      });

      if (error) throw error;

      onRatingComplete();
      onClose();
    } catch (error) {
      console.error('Rating submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ...rest of the code (UI rendering)...
}
