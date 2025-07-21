import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';

interface TrafficInfoProps {
  visible: boolean;
  onClose: () => void;
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
}

interface TrafficIncident {
  id: string;
  type: 'accident' | 'construction' | 'congestion' | 'closure' | 'weather';
  severity: 'low' | 'moderate' | 'high' | 'severe';
  title: string;
  description: string;
  location: string;
  distance: number;
  estimatedDelay: string;
  startTime?: string;
  endTime?: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

interface TrafficRoute {
  id: string;
  name: string;
  currentSpeed: number;
  averageSpeed: number;
  congestionLevel: 'free' | 'light' | 'moderate' | 'heavy' | 'standstill';
  travelTime: string;
  distance: string;
}

export const TrafficInfo: React.FC<TrafficInfoProps> = ({
  visible,
  onClose,
  currentLocation,
}) => {
  const [trafficIncidents, setTrafficIncidents] = useState<TrafficIncident[]>([]);
  const [majorRoutes, setMajorRoutes] = useState<TrafficRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'incidents' | 'routes'>('incidents');

  useEffect(() => {
    if (visible) {
      loadTrafficData();
    }
  }, [visible, currentLocation]);

  const loadTrafficData = async () => {
    setLoading(true);
    
    // محاكاة بيانات الحوادث المرورية
    const mockIncidents: TrafficIncident[] = [
      {
        id: '1',
        type: 'accident',
        severity: 'high',
        title: 'حادث مروري',
        description: 'تصادم بين 3 مركبات في المسار الأيمن',
        location: 'طريق الملك فهد - قبل تقاطع العليا',
        distance: 2.5,
        estimatedDelay: '15-20 دقيقة',
        startTime: '14:30',
        coordinates: { latitude: 24.7136, longitude: 46.6753 },
      },
      {
        id: '2',
        type: 'construction',
        severity: 'moderate',
        title: 'أعمال صيانة',
        description: 'إغلاق مسار واحد لأعمال الصيانة',
        location: 'طريق الأمير محمد بن عبدالعزيز',
        distance: 5.2,
        estimatedDelay: '10 دقائق',
        startTime: '06:00',
        endTime: '18:00',
        coordinates: { latitude: 24.7000, longitude: 46.6800 },
      },
      {
        id: '3',
        type: 'congestion',
        severity: 'moderate',
        title: 'ازدحام مروري',
        description: 'ازدحام في ساعة الذروة',
        location: 'طريق الدائري الشرقي',
        distance: 1.8,
        estimatedDelay: '8-12 دقيقة',
        coordinates: { latitude: 24.7200, longitude: 46.7000 },
      },
      {
        id: '4',
        type: 'weather',
        severity: 'low',
        title: 'ظروف جوية',
        description: 'رياح قوية - قيادة حذرة',
        location: 'الطريق الدائري الغربي',
        distance: 8.5,
        estimatedDelay: '5 دقائق',
        coordinates: { latitude: 24.6800, longitude: 46.6200 },
      },
    ];

    // محاكاة بيانات الطرق الرئيسية
    const mockRoutes: TrafficRoute[] = [
      {
        id: '1',
        name: 'طريق الملك فهد',
        currentSpeed: 45,
        averageSpeed: 70,
        congestionLevel: 'moderate',
        travelTime: '25 دقيقة',
        distance: '18 كم',
      },
      {
        id: '2',
        name: 'طريق الأمير محمد بن عبدالعزيز',
        currentSpeed: 60,
        averageSpeed: 80,
        congestionLevel: 'light',
        travelTime: '18 دقيقة',
        distance: '22 كم',
      },
      {
        id: '3',
        name: 'الطريق الدائري الشرقي',
        currentSpeed: 25,
        averageSpeed: 90,
        congestionLevel: 'heavy',
        travelTime: '45 دقيقة',
        distance: '35 كم',
      },
      {
        id: '4',
        name: 'طريق العروبة',
        currentSpeed: 75,
        averageSpeed: 80,
        congestionLevel: 'free',
        travelTime: '12 دقيقة',
        distance: '15 كم',
      },
    ];

    // ترتيب الحوادث حسب المسافة
    const sortedIncidents = mockIncidents.sort((a, b) => a.distance - b.distance);
    
    setTrafficIncidents(sortedIncidents);
    setMajorRoutes(mockRoutes);
    setLoading(false);
  };

  const getIncidentIcon = (type: string) => {
    switch (type) {
      case 'accident': return 'car-sport';
      case 'construction': return 'construct';
      case 'congestion': return 'people';
      case 'closure': return 'close-circle';
      case 'weather': return 'partly-sunny';
      default: return 'warning';
    }
  };

  const getIncidentColor = (severity: string) => {
    switch (severity) {
      case 'low': return Colors.light.success;
      case 'moderate': return Colors.light.warning;
      case 'high': return '#FF6B35';
      case 'severe': return Colors.light.error;
      default: return Colors.light.secondary;
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'low': return 'منخفض';
      case 'moderate': return 'متوسط';
      case 'high': return 'عالي';
      case 'severe': return 'شديد';
      default: return severity;
    }
  };

  const getCongestionColor = (level: string) => {
    switch (level) {
      case 'free': return Colors.light.success;
      case 'light': return '#90EE90';
      case 'moderate': return Colors.light.warning;
      case 'heavy': return '#FF6B35';
      case 'standstill': return Colors.light.error;
      default: return Colors.light.secondary;
    }
  };

  const getCongestionText = (level: string) => {
    switch (level) {
      case 'free': return 'سالك';
      case 'light': return 'ازدحام خفيف';
      case 'moderate': return 'ازدحام متوسط';
      case 'heavy': return 'ازدحام كثيف';
      case 'standstill': return 'توقف كامل';
      default: return level;
    }
  };

  const renderIncident = (incident: TrafficIncident) => (
    <View key={incident.id} style={styles.incidentCard}>
      <View style={styles.incidentHeader}>
        <View style={[styles.incidentIcon, { backgroundColor: getIncidentColor(incident.severity) }]}>
          <Ionicons 
            name={getIncidentIcon(incident.type) as any} 
            size={20} 
            color={Colors.light.background} 
          />
        </View>
        <View style={styles.incidentInfo}>
          <Text style={styles.incidentTitle}>{incident.title}</Text>
          <Text style={styles.incidentLocation}>{incident.location}</Text>
        </View>
        <View style={styles.incidentMeta}>
          <Text style={styles.incidentDistance}>{incident.distance} كم</Text>
          <Text style={[styles.incidentSeverity, { color: getIncidentColor(incident.severity) }]}>
            {getSeverityText(incident.severity)}
          </Text>
        </View>
      </View>
      
      <Text style={styles.incidentDescription}>{incident.description}</Text>
      
      <View style={styles.incidentFooter}>
        <View style={styles.delayInfo}>
          <Ionicons name="time" size={16} color={Colors.light.secondary} />
          <Text style={styles.delayText}>تأخير متوقع: {incident.estimatedDelay}</Text>
        </View>
        {incident.startTime && (
          <Text style={styles.timeText}>
            منذ {incident.startTime}
            {incident.endTime && ` - حتى ${incident.endTime}`}
          </Text>
        )}
      </View>
    </View>
  );

  const renderRoute = (route: TrafficRoute) => (
    <View key={route.id} style={styles.routeCard}>
      <View style={styles.routeHeader}>
        <Text style={styles.routeName}>{route.name}</Text>
        <View style={[styles.congestionIndicator, { backgroundColor: getCongestionColor(route.congestionLevel) }]}>
          <Text style={styles.congestionText}>{getCongestionText(route.congestionLevel)}</Text>
        </View>
      </View>
      
      <View style={styles.routeStats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>السرعة الحالية</Text>
          <Text style={styles.statValue}>{route.currentSpeed} كم/س</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>السرعة المعتادة</Text>
          <Text style={styles.statValue}>{route.averageSpeed} كم/س</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>وقت السفر</Text>
          <Text style={styles.statValue}>{route.travelTime}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>المسافة</Text>
          <Text style={styles.statValue}>{route.distance}</Text>
        </View>
      </View>
      
      <View style={styles.speedBar}>
        <View 
          style={[
            styles.speedFill, 
            { 
              width: `${(route.currentSpeed / route.averageSpeed) * 100}%`,
              backgroundColor: getCongestionColor(route.congestionLevel)
            }
          ]} 
        />
      </View>
    </View>
  );

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>معلومات المرور</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'incidents' && styles.activeTab]}
          onPress={() => setSelectedTab('incidents')}
        >
          <Ionicons 
            name="warning" 
            size={20} 
            color={selectedTab === 'incidents' ? Colors.light.primary : Colors.light.secondary} 
          />
          <Text style={[
            styles.tabText, 
            selectedTab === 'incidents' && styles.activeTabText
          ]}>
            الحوادث والتنبيهات
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'routes' && styles.activeTab]}
          onPress={() => setSelectedTab('routes')}
        >
          <Ionicons 
            name="map" 
            size={20} 
            color={selectedTab === 'routes' ? Colors.light.primary : Colors.light.secondary} 
          />
          <Text style={[
            styles.tabText, 
            selectedTab === 'routes' && styles.activeTabText
          ]}>
            الطرق الرئيسية
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <Text style={styles.loadingText}>جاري تحميل بيانات المرور...</Text>
          </View>
        ) : (
          <>
            {selectedTab === 'incidents' && (
              <View style={styles.incidentsContainer}>
                {trafficIncidents.length > 0 ? (
                  trafficIncidents.map(renderIncident)
                ) : (
                  <View style={styles.noDataContainer}>
                    <Ionicons name="checkmark-circle" size={48} color={Colors.light.success} />
                    <Text style={styles.noDataText}>لا توجد حوادث أو تنبيهات في المنطقة</Text>
                  </View>
                )}
              </View>
            )}

            {selectedTab === 'routes' && (
              <View style={styles.routesContainer}>
                {majorRoutes.map(renderRoute)}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.updateInfo}>
          <Ionicons name="refresh" size={16} color={Colors.light.secondary} />
          <Text style={styles.updateText}>آخر تحديث: الآن</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={loadTrafficData}>
          <Ionicons name="refresh" size={20} color={Colors.light.primary} />
          <Text style={styles.refreshButtonText}>تحديث</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  closeButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.light.card,
    margin: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: Colors.light.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    color: Colors.light.secondary,
    marginLeft: 8,
  },
  activeTabText: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.secondary,
    marginTop: 16,
  },
  incidentsContainer: {
    paddingBottom: 20,
  },
  incidentCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  incidentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  incidentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  incidentInfo: {
    flex: 1,
  },
  incidentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  incidentLocation: {
    fontSize: 14,
    color: Colors.light.secondary,
  },
  incidentMeta: {
    alignItems: 'flex-end',
  },
  incidentDistance: {
    fontSize: 12,
    color: Colors.light.secondary,
    marginBottom: 4,
  },
  incidentSeverity: {
    fontSize: 12,
    fontWeight: '600',
  },
  incidentDescription: {
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: 12,
    lineHeight: 20,
  },
  incidentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  delayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  delayText: {
    fontSize: 12,
    color: Colors.light.secondary,
    marginLeft: 4,
  },
  timeText: {
    fontSize: 12,
    color: Colors.light.secondary,
  },
  routesContainer: {
    paddingBottom: 20,
  },
  routeCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
  },
  congestionIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  congestionText: {
    fontSize: 12,
    color: Colors.light.background,
    fontWeight: '600',
  },
  routeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.light.secondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
  },
  speedBar: {
    height: 4,
    backgroundColor: Colors.light.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  speedFill: {
    height: '100%',
    borderRadius: 2,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noDataText: {
    fontSize: 16,
    color: Colors.light.secondary,
    marginTop: 16,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  updateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  updateText: {
    fontSize: 12,
    color: Colors.light.secondary,
    marginLeft: 6,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  refreshButtonText: {
    fontSize: 14,
    color: Colors.light.primary,
    marginLeft: 6,
    fontWeight: '600',
  },
});
