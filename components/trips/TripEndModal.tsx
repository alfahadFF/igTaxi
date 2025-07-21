import React, { useEffect } from 'react';
import { View, Modal } from 'react-native';
import RatingModal from '../ratings/RatingModal';

interface TripEndModalProps {
  tripId: string;
  driverId: string;
  customerId: string;
  isComplete: boolean;
  onRatingComplete: () => void;
}

export default function TripEndModal({
  tripId,
  driverId,
  customerId,
  isComplete,
  onRatingComplete
}: TripEndModalProps) {
  const [showRating, setShowRating] = useState(false);

  useEffect(() => {
    if (isComplete) {
      setShowRating(true);
    }
  }, [isComplete]);

  return (
    <RatingModal
      isVisible={showRating}
      onClose={() => setShowRating(false)}
      tripId={tripId}
      driverId={driverId}
      customerId={customerId}
      onRatingComplete={() => {
        onRatingComplete();
        setShowRating(false);
      }}
    />
  );
}
