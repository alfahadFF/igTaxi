import React, { useState } from 'react';
import { View, Modal, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Star } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/utils/supabase';

type RatingCriteria = {
  service_quality: number;
  vehicle_cleanliness: number;
  punctuality: number;
};

interface RatingModalProps {
  isVisible: boolean;
  onClose: () => void;
  tripId: string;
  driverId: string;
  customerId: string;
  onRatingComplete: () => void;
}

export default function RatingModal({
  isVisible,
  onClose,
  tripId,
  driverId,
  customerId,
  onRatingComplete
}: RatingModalProps) {
  const { t } = useTranslation();
  const [ratings, setRatings] = useState<RatingCriteria>({
    service_quality: 0,
    vehicle_cleanliness: 0,
    punctuality: 0
  });
  const [comment, setComment] = useState('');

  const handleRating = async () => {
    try {
      // حساب متوسط التقييم
      const averageRating = (
        Object.values(ratings).reduce((sum, rating) => sum + rating, 0) / 3
      ).toFixed(1);

      const { error } = await supabase.from('driver_ratings').insert({
        driver_id: driverId,
        customer_id: customerId,
        trip_id: tripId,
        rating: averageRating,
        comment,
        ...ratings
      });

      if (error) throw error;

      onRatingComplete();
      onClose();
    } catch (error) {
      console.error('Error submitting rating:', error);
    }
  };

  const renderStars = (category: keyof RatingCriteria) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRatings({ ...ratings, [category]: star })}
          >
            <Star
              size={30}
              color={star <= ratings[category] ? '#F5B800' : '#e0e0e0'}
              fill={star <= ratings[category] ? '#F5B800' : 'transparent'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>{t('ratings.rateYourTrip')}</Text>

          <View style={styles.ratingSection}>
            <Text style={styles.categoryTitle}>{t('ratings.serviceQuality')}</Text>
            {renderStars('service_quality')}
          </View>

          <View style={styles.ratingSection}>
            <Text style={styles.categoryTitle}>{t('ratings.vehicleCleanliness')}</Text>
            {renderStars('vehicle_cleanliness')}
          </View>

          <View style={styles.ratingSection}>
            <Text style={styles.categoryTitle}>{t('ratings.punctuality')}</Text>
            {renderStars('punctuality')}
          </View>

          <TextInput
            style={styles.commentInput}
            placeholder={t('ratings.addComment')}
            value={comment}
            onChangeText={setComment}
            multiline
          />

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleRating}
          >
            <Text style={styles.submitButtonText}>{t('ratings.submit')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    textAlign: 'center',
    marginBottom: 20,
  },
  ratingSection: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    marginBottom: 10,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 15,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#F5B800',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
  },
  cancelButton: {
    padding: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
  },
});
