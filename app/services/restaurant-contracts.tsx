import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import Header from '@/components/layout/Header';
import { Search, Star, MapPin, Filter, Coffee, ShoppingBag, Store, UtensilsCrossed } from 'lucide-react-native';

type Category = {
  id: string;
  nameKey: string;
  icon: React.ReactNode;
};

type Venue = {
  id: string;
  name: string;
  image: string;
  rating: number;
  distance: string;
  category: string;
  deliveryTime: string;
};

export default function RestaurantsScreen() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories: Category[] = [
    {
      id: 'restaurants',
      nameKey: 'restaurants.categories.restaurants',
      icon: <UtensilsCrossed size={24} color="#333" />,
    },
    {
      id: 'cafes',
      nameKey: 'restaurants.categories.cafes',
      icon: <Coffee size={24} color="#333" />,
    },
    {
      id: 'groceries',
      nameKey: 'restaurants.categories.groceries',
      icon: <ShoppingBag size={24} color="#333" />,
    },
    {
      id: 'shopping',
      nameKey: 'restaurants.categories.shopping',
      icon: <Store size={24} color="#333" />,
    },
  ];

  // Mock data for venues
  const venues: Venue[] = [
    {
      id: '1',
      name: 'Golden Restaurant',
      image: 'https://images.pexels.com/photos/67468/pexels-photo-67468.jpeg',
      rating: 4.5,
      distance: '1.2 km',
      category: 'restaurants',
      deliveryTime: '25-35',
    },
    {
      id: '2',
      name: 'Cafe Delight',
      image: 'https://images.pexels.com/photos/1855214/pexels-photo-1855214.jpeg',
      rating: 4.8,
      distance: '0.8 km',
      category: 'cafes',
      deliveryTime: '15-25',
    },
    {
      id: '3',
      name: 'Fresh Market',
      image: 'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg',
      rating: 4.2,
      distance: '2.1 km',
      category: 'groceries',
      deliveryTime: '30-45',
    },
    {
      id: '4',
      name: 'City Mall',
      image: 'https://images.pexels.com/photos/205961/pexels-photo-205961.jpeg',
      rating: 4.6,
      distance: '3.5 km',
      category: 'shopping',
      deliveryTime: '35-50',
    },
  ];

  const filteredVenues = venues.filter(venue => 
    (!selectedCategory || venue.category === selectedCategory) &&
    (!searchQuery || venue.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header title={t('restaurants.title')} showBackButton />
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Search size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('restaurants.searchPlaceholder')}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
            <TouchableOpacity style={styles.filterButton}>
              <Filter size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Categories */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  selectedCategory === category.id && styles.selectedCategory,
                ]}
                onPress={() => setSelectedCategory(
                  selectedCategory === category.id ? null : category.id
                )}
              >
                <View style={styles.categoryIcon}>
                  {category.icon}
                </View>
                <Text style={styles.categoryName}>
                  {t(category.nameKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Venues List */}
          <View style={styles.venuesContainer}>
            {filteredVenues.map((venue) => (
              <TouchableOpacity key={venue.id} style={styles.venueCard}>
                <Image
                  source={{ uri: venue.image }}
                  style={styles.venueImage}
                />
                <View style={styles.venueInfo}>
                  <Text style={styles.venueName}>{venue.name}</Text>
                  <View style={styles.venueDetails}>
                    <View style={styles.ratingContainer}>
                      <Star size={16} color="#F5B800" fill="#F5B800" />
                      <Text style={styles.ratingText}>{venue.rating}</Text>
                    </View>
                    <View style={styles.distanceContainer}>
                      <MapPin size={16} color="#666" />
                      <Text style={styles.distanceText}>{venue.distance}</Text>
                    </View>
                  </View>
                  <View style={styles.deliveryInfo}>
                    <Text style={styles.deliveryTime}>
                      {venue.deliveryTime} {t('taxi.minutes')}
                    </Text>
                    <TouchableOpacity style={styles.orderButton}>
                      <Text style={styles.orderButtonText}>
                        {t('restaurants.orderNow')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#333',
  },
  filterButton: {
    padding: 4,
  },
  categoriesContainer: {
    marginBottom: 20,
  },
  categoryCard: {
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedCategory: {
    backgroundColor: '#F5B800',
  },
  categoryIcon: {
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#333',
    textAlign: 'center',
  },
  venuesContainer: {
    marginTop: 8,
  },
  venueCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  venueImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  venueInfo: {
    padding: 16,
  },
  venueName: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  venueDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#333',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    marginLeft: 4,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  deliveryTime: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  orderButton: {
    backgroundColor: '#F5B800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  orderButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
});