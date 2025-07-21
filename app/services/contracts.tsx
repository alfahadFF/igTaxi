import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import Header from '@/components/layout/Header';
import { Building2, Bus, Car, Clock, Users, Chrome as Home, User, MapPin, Calendar, HardHat, Map as MapIcon } from 'lucide-react-native';
import * as Location from 'expo-location';
import MapViewComponent, { Coordinates } from '@/components/maps';

type ContractType = {
  id: string;
  icon: React.ReactNode;
  duration: string[];
  formFields: string[];
};

export default function ContractsScreen() {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  // formData: يدعم string أو string[] حسب الحقل
  const [formData, setFormData] = useState<Record<string, any>>({});
  // الموقع الحالي للجهاز
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  // حالة اختيار نقطة من الخريطة
  const [mapModal, setMapModal] = useState<{field: string, idx: number} | null>(null);
  const [tempLocation, setTempLocation] = useState<Coordinates | null>(null);
  // تفعيل الموقع تلقائياً عند دخول الشاشة
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
      setCurrentLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    })();
  }, []);

  // الحقول التي تدعم تعدد النقاط (تشمل الآن projectLocation وworkSite لعقد العمال)
  const multiPointFields = ['pickupLocation', 'dropoffLocation', 'projectLocation', 'workSite'];
  const contractTypes: ContractType[] = [
    {
      id: 'corporate',
      icon: <Building2 size={24} color="#333" />,
      duration: ['daily', 'weekly', 'monthly', 'yearly'],
      formFields: ['companyName', 'employeeCount', 'pickupLocation', 'dropoffLocation', 'pickupTime'],
    },
    {
      id: 'school',
      icon: <Bus size={24} color="#333" />,
      duration: ['semester', 'yearly'],
      formFields: ['schoolName', 'studentCount', 'grade', 'pickupLocation', 'dropoffLocation', 'pickupTime', 'returnTime'],
    },
    {
      id: 'hotel',
      icon: <Car size={24} color="#333" />,
      duration: ['daily', 'weekly', 'monthly'],
      formFields: ['hotelName', 'guestCount', 'pickupLocation', 'serviceType'],
    },
    {
      id: 'employee',
      icon: <Users size={24} color="#333" />,
      duration: ['monthly', 'yearly'],
      formFields: ['employeeName', 'department', 'pickupLocation', 'dropoffLocation', 'workSchedule'],
    },
    {
      id: 'personal',
      icon: <Home size={24} color="#333" />,
      duration: ['daily', 'weekly', 'monthly', 'yearly'],
      formFields: ['name', 'familyMembers', 'pickupLocation', 'dropoffLocation', 'preferredTime'],
    },
    {
      id: 'workers',
      icon: <HardHat size={24} color="#333" />,
      duration: ['daily', 'weekly', 'monthly', 'project-based'],
      formFields: ['contractorName', 'workerCount', 'workType', 'projectLocation', 'workSite', 'shiftTiming', 'transportationType'],
    },
  ];

  const handleContractSelect = (contractId: string) => {
    setSelectedType(contractId);
    setSelectedDuration(null);
    setFormData({});
  };

  const handleSubmit = () => {
    if (selectedType && selectedDuration) {
      console.log('Contract submitted:', {
        type: selectedType,
        duration: selectedDuration,
        formData,
      });
      // Handle contract submission
    }
  };

  // دالة لإضافة نقطة جديدة
  const addPoint = (field: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: [...(prev[field] || ['']) , ''],
    }));
  };
  // دالة لحذف نقطة
  const removePoint = (field: string, idx: number) => {
    setFormData((prev: any) => {
      const arr = [...(prev[field] || [])];
      arr.splice(idx, 1);
      return { ...prev, [field]: arr };
    });
  };

  // نافذة اختيار الموقع من الخريطة (يجب أن تكون خارج renderFormField)
  const renderMapModal = () => {
    if (!mapModal) return null;
    const { field, idx } = mapModal;
    return (
      <Modal visible transparent animationType="slide">
        <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'center',alignItems:'center'}}>
          <View style={{width:'95%',height:'70%',backgroundColor:'#fff',borderRadius:12,overflow:'hidden'}}>
            <MapViewComponent
              onLocationSelect={(loc) => {
                // حفظ الإحداثيات في النقطة المطلوبة
                const arr = [...(formData[field] || [])];
                arr[idx] = loc;
                setFormData({ ...formData, [field]: arr });
                setMapModal(null);
              }}
              initialLocation={currentLocation || undefined}
              onClose={() => setMapModal(null)}
              selectedLocation={typeof (formData[field]?.[idx]) === 'object' ? formData[field][idx] : undefined}
            />
          </View>
        </View>
      </Modal>
    );
  };

  const renderFormField = (field: string) => {
    const getIcon = () => {
      switch (field) {
        case 'companyName':
        case 'schoolName':
        case 'hotelName':
        case 'employeeName':
        case 'name':
        case 'contractorName':
          return <User size={20} color="#666" />;
        case 'pickupLocation':
        case 'dropoffLocation':
        case 'projectLocation':
        case 'workSite':
          return <MapPin size={20} color="#666" />;
        case 'pickupTime':
        case 'returnTime':
        case 'workSchedule':
        case 'preferredTime':
        case 'shiftTiming':
          return <Clock size={20} color="#666" />;
        case 'workerCount':
        case 'employeeCount':
        case 'studentCount':
        case 'guestCount':
        case 'familyMembers':
          return <Users size={20} color="#666" />;
        case 'workType':
        case 'transportationType':
        case 'serviceType':
          return <HardHat size={20} color="#666" />;
        default:
          return <Calendar size={20} color="#666" />;
      }
    };

    // إذا كان الحقل متعدد النقاط
    if (multiPointFields.includes(field)) {
      const points: (string | Coordinates)[] = formData[field] || [''];
      return (
        <View key={field} style={styles.formField}>
          <Text style={{fontWeight:'bold',marginBottom:4}}>{t(`contracts.fields.${field}`)}</Text>
          {points.map((point, idx) => (
            <View key={idx} style={{flexDirection:'row',alignItems:'center',marginBottom:4}}>
              {getIcon()}
              {typeof point === 'object' && point !== null ? (
                <View style={{flex:1, flexDirection:'row', alignItems:'center'}}>
                  <Text style={{color:'#333', flex:1}}>
                    {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
                  </Text>
                  <TouchableOpacity onPress={() => setMapModal({field, idx})} style={{marginLeft:6}}>
                    <MapIcon size={20} color="#007bff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.input, {flex:1, flexDirection:'row',alignItems:'center',borderColor:'#007bff',borderWidth:1,justifyContent:'center'}]}
                  onPress={() => setMapModal({field, idx})}
                >
                  <MapIcon size={20} color="#007bff" />
                  <Text style={{marginLeft:6,color:'#007bff'}}>{t('contracts.selectOnMap') || 'Select on map'}</Text>
                </TouchableOpacity>
              )}
              {points.length > 1 && (
                <TouchableOpacity onPress={() => removePoint(field, idx)} style={{marginLeft:6}}>
                  <Text style={{color:'red',fontSize:18}}>-</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity onPress={() => addPoint(field)} style={{marginTop:2}}>
            <Text style={{color:'#007bff'}}>{t('contracts.addPoint')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
  // نافذة اختيار الموقع من الخريطة
  const renderMapModal = () => {
    if (!mapModal) return null;
    const { field, idx } = mapModal;
    return (
      <Modal visible transparent animationType="slide">
        <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'center',alignItems:'center'}}>
          <View style={{width:'95%',height:'70%',backgroundColor:'#fff',borderRadius:12,overflow:'hidden'}}>
            <MapViewComponent
              onLocationSelect={(loc) => {
                // حفظ الإحداثيات في النقطة المطلوبة
                const arr = [...(formData[field] || [])];
                arr[idx] = loc;
                setFormData({ ...formData, [field]: arr });
                setMapModal(null);
              }}
              initialLocation={currentLocation || undefined}
              onClose={() => setMapModal(null)}
              selectedLocation={typeof (formData[field]?.[idx]) === 'object' ? formData[field][idx] : undefined}
            />
          </View>
        </View>
      </Modal>
    );
  };
    // حقل عادي
    return (
      <View key={field} style={styles.formField}>
        <View style={styles.inputContainer}>
          {getIcon()}
          <TextInput
            style={styles.input}
            placeholder={t(`contracts.fields.${field}`)}
            value={formData[field]}
            onChangeText={(text) => setFormData({ ...formData, [field]: text })}
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title={t('contracts.title')} showBackButton />
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>{t('contracts.selectType')}</Text>
          <View style={styles.contractsGrid}>
            {contractTypes.map((contract) => (
              <TouchableOpacity
                key={contract.id}
                style={[
                  styles.contractCard,
                  selectedType === contract.id && styles.selectedCard,
                ]}
                onPress={() => handleContractSelect(contract.id)}
              >
                <View style={styles.iconContainer}>
                  {contract.icon}
                </View>
                <Text style={styles.contractName}>
                  {t(`contracts.types.${contract.id}.name`)}
                </Text>
                <Text style={styles.contractDescription}>
                  {t(`contracts.types.${contract.id}.description`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {selectedType && (
            <>
              <Text style={styles.sectionTitle}>{t('contracts.selectDuration')}</Text>
              <View style={styles.durationGrid}>
                {contractTypes
                  .find((c) => c.id === selectedType)
                  ?.duration.map((duration) => (
                    <TouchableOpacity
                      key={duration}
                      style={[
                        styles.durationCard,
                        selectedDuration === duration && styles.selectedDuration,
                      ]}
                      onPress={() => setSelectedDuration(duration)}
                    >
                      <Clock 
                        size={20} 
                        color={selectedDuration === duration ? '#fff' : '#333'} 
                      />
                      <Text
                        style={[
                          styles.durationText,
                          selectedDuration === duration && styles.selectedDurationText,
                        ]}
                      >
                        {t(`contracts.duration.${duration}`)}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
              {selectedDuration && (
                <>
                  <Text style={styles.sectionTitle}>{t('contracts.formTitle')}</Text>
                  <View style={styles.formContainer}>
                    {contractTypes
                      .find((c) => c.id === selectedType)
                      ?.formFields.map(renderFormField)}
                  </View>
                  <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                    <Text style={styles.submitButtonText}>{t('contracts.submit')}</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>
      {renderMapModal()}
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
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 16,
  },
  contractsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  contractCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedCard: {
    borderColor: '#F5B800',
  },
  iconContainer: {
    backgroundColor: 'rgba(245, 184, 0, 0.1)',
    padding: 12,
    borderRadius: 50,
    alignSelf: 'center',
    marginBottom: 12,
  },
  contractName: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  contractDescription: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    textAlign: 'center',
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  durationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedDuration: {
    backgroundColor: '#F5B800',
    borderColor: '#F5B800',
  },
  durationText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#333',
  },
  selectedDurationText: {
    color: '#fff',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  formField: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#F5B800',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
});