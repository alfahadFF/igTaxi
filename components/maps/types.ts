import { ViewStyle } from 'react-native';
import { ReactNode } from 'react';

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type MapViewComponentProps = {
  onLocationSelect?: (location: Coordinates) => void;
  initialLocation?: Coordinates;
  showNearbyDrivers?: boolean;
  onClose?: () => void;
  style?: ViewStyle;
  showLocationPicker?: boolean;
  selectedLocation?: Coordinates;
  region?: Region;
  onRegionChange?: (region: Region) => void;
  showsUserLocation?: boolean;
  children?: ReactNode;
};