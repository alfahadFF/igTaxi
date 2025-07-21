import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert, Share } from 'react-native';
import { 
  Card, 
  Title, 
  Button, 
  Text, 
  Surface, 
  Searchbar,
  Chip,
  List,
  IconButton,
  DataTable,
  Dialog,
  Portal,
  TextInput,
  SegmentedButtons,
  Menu,
  Divider
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../../utils/supabase';

/**
 * نظام أرشفة الوثائق المتقدم
 * إدارة شاملة لجميع الوثائق مع فهرسة ذكية وبحث متقدم
 */

interface DocumentArchiveProps {
  route?: { params?: { driverId?: string; documentType?: string } };
  navigation: any;
}

interface ArchiveDocument {
  id: string;
  driver_id: string;
  document_type: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  upload_date: string;
  tags: string[];
  metadata: {
    extractedData?: Record<string, any>;
    ocrResults?: Record<string, any>;
    imageAnalysis?: Record<string, any>;
    verificationResults?: Record<string, any>;
  };
  version: number;
  status: 'active' | 'archived' | 'deleted';
  access_level: 'public' | 'internal' | 'confidential' | 'restricted';
  retention_date?: string;
  compliance_notes?: string;
}

interface ArchiveStats {
  totalDocuments: number;
  totalSize: number;
  documentsByType: Record<string, number>;
  documentsByStatus: Record<string, number>;
  storageUsage: {
    used: number;
    available: number;
    percentage: number;
  };
  recentActivity: {
    uploads: number;
    downloads: number;
    searches: number;
  };
}

interface SearchFilters {
  documentType: string;
  status: string;
  accessLevel: string;
  dateRange: {
    start: string;
    end: string;
  };
  sizeRange: {
    min: number;
    max: number;
  };
  tags: string[];
}

export default function DocumentArchiveSystem({ route, navigation }: DocumentArchiveProps) {
  
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<ArchiveDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<ArchiveDocument[]>([]);
  const [archiveStats, setArchiveStats] = useState<ArchiveStats>({
    totalDocuments: 0,
    totalSize: 0,
    documentsByType: {},
    documentsByStatus: {},
    storageUsage: { used: 0, available: 0, percentage: 0 },
    recentActivity: { uploads: 0, downloads: 0, searches: 0 }
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    documentType: 'all',
    status: 'all',
    accessLevel: 'all',
    dateRange: { start: '', end: '' },
    sizeRange: { min: 0, max: 100000000 },
    tags: []
  });
  
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('list');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [showFiltersDialog, setShowFiltersDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<ArchiveDocument | null>(null);
  
  const [bulkSelection, setBulkSelection] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  useEffect(() => {
    loadArchiveData();
  }, []);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [documents, searchQuery, searchFilters, sortBy, sortOrder]);

  const loadArchiveData = async () => {
    try {
      setLoading(true);
      
      // تحميل الوثائق
      const { data: documentsData, error: documentsError } = await supabase
        .from('document_archive')
        .select('*')
        .order('upload_date', { ascending: false });
      
      if (documentsError) throw documentsError;
      
      setDocuments(documentsData || []);
      
      // حساب الإحصائيات
      const stats = calculateArchiveStats(documentsData || []);
      setArchiveStats(stats);
      
    } catch (error) {
      console.error('خطأ في تحميل بيانات الأرشيف:', error);
      Alert.alert('خطأ', 'فشل في تحميل بيانات الأرشيف');
    } finally {
      setLoading(false);
    }
  };

  const calculateArchiveStats = (docs: ArchiveDocument[]): ArchiveStats => {
    const totalDocuments = docs.length;
    const totalSize = docs.reduce((sum, doc) => sum + doc.file_size, 0);
    
    const documentsByType = docs.reduce((acc, doc) => {
      acc[doc.document_type] = (acc[doc.document_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const documentsByStatus = docs.reduce((acc, doc) => {
      acc[doc.status] = (acc[doc.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // محاكاة بيانات التخزين والنشاط
    const storageLimit = 10 * 1024 * 1024 * 1024; // 10 GB
    const storageUsage = {
      used: totalSize,
      available: storageLimit - totalSize,
      percentage: (totalSize / storageLimit) * 100
    };
    
    const recentActivity = {
      uploads: Math.floor(Math.random() * 50) + 10,
      downloads: Math.floor(Math.random() * 100) + 20,
      searches: Math.floor(Math.random() * 200) + 50
    };
    
    return {
      totalDocuments,
      totalSize,
      documentsByType,
      documentsByStatus,
      storageUsage,
      recentActivity
    };
  };

  const applyFiltersAndSearch = () => {
    let filtered = [...documents];
    
    // تطبيق البحث النصي
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.file_name.toLowerCase().includes(query) ||
        doc.document_type.toLowerCase().includes(query) ||
        doc.tags.some(tag => tag.toLowerCase().includes(query)) ||
        JSON.stringify(doc.metadata).toLowerCase().includes(query)
      );
    }
    
    // تطبيق المرشحات
    if (searchFilters.documentType !== 'all') {
      filtered = filtered.filter(doc => doc.document_type === searchFilters.documentType);
    }
    
    if (searchFilters.status !== 'all') {
      filtered = filtered.filter(doc => doc.status === searchFilters.status);
    }
    
    if (searchFilters.accessLevel !== 'all') {
      filtered = filtered.filter(doc => doc.access_level === searchFilters.accessLevel);
    }
    
    // تطبيق نطاق التاريخ
    if (searchFilters.dateRange.start) {
      filtered = filtered.filter(doc => 
        new Date(doc.upload_date) >= new Date(searchFilters.dateRange.start)
      );
    }
    
    if (searchFilters.dateRange.end) {
      filtered = filtered.filter(doc => 
        new Date(doc.upload_date) <= new Date(searchFilters.dateRange.end)
      );
    }
    
    // تطبيق نطاق الحجم
    filtered = filtered.filter(doc => 
      doc.file_size >= searchFilters.sizeRange.min &&
      doc.file_size <= searchFilters.sizeRange.max
    );
    
    // تطبيق العلامات
    if (searchFilters.tags.length > 0) {
      filtered = filtered.filter(doc => 
        searchFilters.tags.some(tag => doc.tags.includes(tag))
      );
    }
    
    // تطبيق الترتيب
    filtered.sort((a, b) => {
      let valueA: any, valueB: any;
      
      switch (sortBy) {
        case 'name':
          valueA = a.file_name.toLowerCase();
          valueB = b.file_name.toLowerCase();
          break;
        case 'date':
          valueA = new Date(a.upload_date);
          valueB = new Date(b.upload_date);
          break;
        case 'size':
          valueA = a.file_size;
          valueB = b.file_size;
          break;
        case 'type':
          valueA = a.document_type;
          valueB = b.document_type;
          break;
        default:
          valueA = a.upload_date;
          valueB = b.upload_date;
      }
      
      if (sortOrder === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
    
    setFilteredDocuments(filtered);
  };

  const uploadDocument = async () => {
    try {
      // اختيار الملف
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true
      });
      
      if (result.canceled) return;
      
      const file = result.assets?.[0];
      if (!file) return;
      
      // رفع الملف إلى Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `documents/${fileName}`;
      
      // قراءة الملف وتحويله إلى Base64
      const fileUri = file.uri;
      const fileData = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // رفع إلى Supabase
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, decode(fileData), {
          contentType: file.mimeType
        });
      
      if (uploadError) throw uploadError;
      
      // حفظ بيانات الوثيقة في قاعدة البيانات
      const documentData: Partial<ArchiveDocument> = {
        driver_id: route?.params?.driverId || 'current_user',
        document_type: route?.params?.documentType || 'general',
        file_name: file.name,
        file_size: file.size || 0,
        mime_type: file.mimeType || 'application/octet-stream',
        upload_date: new Date().toISOString(),
        tags: [],
        metadata: {},
        version: 1,
        status: 'active',
        access_level: 'internal'
      };
      
      const { error: insertError } = await supabase
        .from('document_archive')
        .insert([documentData]);
      
      if (insertError) throw insertError;
      
      Alert.alert('نجح', 'تم رفع الوثيقة بنجاح');
      setShowUploadDialog(false);
      loadArchiveData();
      
    } catch (error) {
      console.error('خطأ في رفع الوثيقة:', error);
      Alert.alert('خطأ', 'فشل في رفع الوثيقة');
    }
  };

  const downloadDocument = async (document: ArchiveDocument) => {
    try {
      // الحصول على رابط التحميل من Supabase
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(`documents/${document.file_name}`, 3600);
      
      if (error) throw error;
      
      // مشاركة الرابط أو تحميل الملف
      await Share.share({
        url: data.signedUrl,
        title: document.file_name
      });
      
      // تسجيل عملية التحميل
      await supabase
        .from('document_access_log')
        .insert([{
          document_id: document.id,
          action: 'download',
          user_id: 'current_user',
          timestamp: new Date().toISOString()
        }]);
      
    } catch (error) {
      console.error('خطأ في تحميل الوثيقة:', error);
      Alert.alert('خطأ', 'فشل في تحميل الوثيقة');
    }
  };

  const deleteDocument = async (documentId: string) => {
    Alert.alert(
      'تأكيد الحذف',
      'هل أنت متأكد من حذف هذه الوثيقة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              // تحديث حالة الوثيقة إلى محذوفة (soft delete)
              const { error } = await supabase
                .from('document_archive')
                .update({ status: 'deleted' })
                .eq('id', documentId);
              
              if (error) throw error;
              
              Alert.alert('نجح', 'تم حذف الوثيقة');
              loadArchiveData();
              
            } catch (error) {
              console.error('خطأ في حذف الوثيقة:', error);
              Alert.alert('خطأ', 'فشل في حذف الوثيقة');
            }
          }
        }
      ]
    );
  };

  const bulkAction = async (action: 'download' | 'delete' | 'archive' | 'tag') => {
    if (bulkSelection.length === 0) {
      Alert.alert('تنبيه', 'لم يتم اختيار أي وثائق');
      return;
    }
    
    try {
      switch (action) {
        case 'delete':
          await supabase
            .from('document_archive')
            .update({ status: 'deleted' })
            .in('id', bulkSelection);
          Alert.alert('نجح', `تم حذف ${bulkSelection.length} وثيقة`);
          break;
          
        case 'archive':
          await supabase
            .from('document_archive')
            .update({ status: 'archived' })
            .in('id', bulkSelection);
          Alert.alert('نجح', `تم أرشفة ${bulkSelection.length} وثيقة`);
          break;
          
        default:
          Alert.alert('معلومة', `سيتم تطبيق العملية على ${bulkSelection.length} وثيقة`);
      }
      
      setBulkSelection([]);
      setShowBulkActions(false);
      loadArchiveData();
      
    } catch (error) {
      console.error('خطأ في العملية المجمعة:', error);
      Alert.alert('خطأ', 'فشل في تنفيذ العملية');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDocumentIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.includes('pdf')) return 'file-pdf-box';
    if (mimeType.includes('word')) return 'file-word-box';
    if (mimeType.includes('excel')) return 'file-excel-box';
    return 'file-document';
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'active': '#4CAF50',
      'archived': '#FF9800',
      'deleted': '#F44336'
    };
    return colors[status] || '#9E9E9E';
  };

  const getAccessLevelIcon = (level: string): string => {
    const icons: Record<string, string> = {
      'public': 'earth',
      'internal': 'office-building',
      'confidential': 'lock',
      'restricted': 'security'
    };
    return icons[level] || 'help-circle';
  };

  const decode = (str: string): Uint8Array => {
    const binaryString = atob(str);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const renderStatsOverview = () => (
    <Card style={{ margin: 16, marginBottom: 8 }}>
      <Card.Content>
        <Title>📊 إحصائيات الأرشيف</Title>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{archiveStats.totalDocuments}</Text>
            <Text style={{ fontSize: 12, opacity: 0.7 }}>إجمالي الوثائق</Text>
          </View>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{formatFileSize(archiveStats.totalSize)}</Text>
            <Text style={{ fontSize: 12, opacity: 0.7 }}>الحجم الإجمالي</Text>
          </View>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{archiveStats.storageUsage.percentage.toFixed(1)}%</Text>
            <Text style={{ fontSize: 12, opacity: 0.7 }}>استخدام التخزين</Text>
          </View>
        </View>
        
        <Divider style={{ marginVertical: 16 }} />
        
        <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>النشاط الأخير:</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <Text style={{ fontSize: 12 }}>⬆️ {archiveStats.recentActivity.uploads} رفع</Text>
          <Text style={{ fontSize: 12 }}>⬇️ {archiveStats.recentActivity.downloads} تحميل</Text>
          <Text style={{ fontSize: 12 }}>🔍 {archiveStats.recentActivity.searches} بحث</Text>
        </View>
      </Card.Content>
    </Card>
  );

  const renderDocumentGrid = () => (
    <View style={{ padding: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {filteredDocuments.map((doc) => (
          <Surface 
            key={doc.id} 
            style={{ 
              width: '48%', 
              margin: '1%', 
              padding: 12, 
              borderRadius: 8,
              backgroundColor: bulkSelection.includes(doc.id) ? '#E3F2FD' : 'white'
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <MaterialCommunityIcons 
                name={getDocumentIcon(doc.mime_type) as any} 
                size={48} 
                color="#2196F3" 
              />
              <Text 
                style={{ 
                  marginTop: 8, 
                  fontSize: 12, 
                  textAlign: 'center',
                  fontWeight: 'bold'
                }}
                numberOfLines={2}
              >
                {doc.file_name}
              </Text>
              <Text style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>
                {formatFileSize(doc.file_size)}
              </Text>
              
              <View style={{ flexDirection: 'row', marginTop: 8 }}>
                <IconButton
                  icon="eye"
                  size={16}
                  onPress={() => {
                    setSelectedDocument(doc);
                    setShowDetailsDialog(true);
                  }}
                />
                <IconButton
                  icon="download"
                  size={16}
                  onPress={() => downloadDocument(doc)}
                />
                <IconButton
                  icon={bulkSelection.includes(doc.id) ? "checkbox-marked" : "checkbox-blank-outline"}
                  size={16}
                  onPress={() => {
                    if (bulkSelection.includes(doc.id)) {
                      setBulkSelection(prev => prev.filter(id => id !== doc.id));
                    } else {
                      setBulkSelection(prev => [...prev, doc.id]);
                    }
                  }}
                />
              </View>
            </View>
          </Surface>
        ))}
      </View>
    </View>
  );

  const renderDocumentList = () => (
    <View style={{ padding: 8 }}>
      {filteredDocuments.map((doc) => (
        <Surface 
          key={doc.id} 
          style={{ 
            padding: 12, 
            marginBottom: 8, 
            borderRadius: 8,
            backgroundColor: bulkSelection.includes(doc.id) ? '#E3F2FD' : 'white'
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons 
              name={getDocumentIcon(doc.mime_type) as any} 
              size={32} 
              color="#2196F3" 
            />
            
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 14 }}>{doc.file_name}</Text>
              <Text style={{ fontSize: 12, opacity: 0.7 }}>
                {doc.document_type} • {formatFileSize(doc.file_size)}
              </Text>
              <Text style={{ fontSize: 10, opacity: 0.5 }}>
                {new Date(doc.upload_date).toLocaleDateString('ar-AE')}
              </Text>
              
              {doc.tags.length > 0 && (
                <View style={{ flexDirection: 'row', marginTop: 4 }}>
                  {doc.tags.slice(0, 3).map((tag, index) => (
                    <Chip 
                      key={index} 
                      mode="outlined" 
                      style={{ marginRight: 4, height: 20 }}
                      textStyle={{ fontSize: 8 }}
                    >
                      {tag}
                    </Chip>
                  ))}
                </View>
              )}
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <MaterialCommunityIcons 
                  name={getAccessLevelIcon(doc.access_level) as any} 
                  size={16} 
                  color="#666"
                />
                <View 
                  style={{ 
                    width: 8, 
                    height: 8, 
                    borderRadius: 4, 
                    backgroundColor: getStatusColor(doc.status),
                    marginLeft: 4
                  }}
                />
              </View>
              
              <View style={{ flexDirection: 'row' }}>
                <IconButton
                  icon="eye"
                  size={18}
                  onPress={() => {
                    setSelectedDocument(doc);
                    setShowDetailsDialog(true);
                  }}
                />
                <IconButton
                  icon="download"
                  size={18}
                  onPress={() => downloadDocument(doc)}
                />
                <IconButton
                  icon={bulkSelection.includes(doc.id) ? "checkbox-marked" : "checkbox-blank-outline"}
                  size={18}
                  onPress={() => {
                    if (bulkSelection.includes(doc.id)) {
                      setBulkSelection(prev => prev.filter(id => id !== doc.id));
                    } else {
                      setBulkSelection(prev => [...prev, doc.id]);
                    }
                  }}
                />
              </View>
            </View>
          </View>
        </Surface>
      ))}
    </View>
  );

  const renderDocumentTable = () => (
    <DataTable style={{ backgroundColor: 'white', margin: 8 }}>
      <DataTable.Header>
        <DataTable.Title>اسم الملف</DataTable.Title>
        <DataTable.Title>النوع</DataTable.Title>
        <DataTable.Title>الحجم</DataTable.Title>
        <DataTable.Title>التاريخ</DataTable.Title>
        <DataTable.Title>العمليات</DataTable.Title>
      </DataTable.Header>
      
      {filteredDocuments.map((doc) => (
        <DataTable.Row 
          key={doc.id}
          style={{ 
            backgroundColor: bulkSelection.includes(doc.id) ? '#E3F2FD' : 'transparent' 
          }}
        >
          <DataTable.Cell>{doc.file_name}</DataTable.Cell>
          <DataTable.Cell>{doc.document_type}</DataTable.Cell>
          <DataTable.Cell>{formatFileSize(doc.file_size)}</DataTable.Cell>
          <DataTable.Cell>{new Date(doc.upload_date).toLocaleDateString('ar-AE')}</DataTable.Cell>
          <DataTable.Cell>
            <View style={{ flexDirection: 'row' }}>
              <IconButton
                icon="eye"
                size={16}
                onPress={() => {
                  setSelectedDocument(doc);
                  setShowDetailsDialog(true);
                }}
              />
              <IconButton
                icon="download"
                size={16}
                onPress={() => downloadDocument(doc)}
              />
              <IconButton
                icon={bulkSelection.includes(doc.id) ? "checkbox-marked" : "checkbox-blank-outline"}
                size={16}
                onPress={() => {
                  if (bulkSelection.includes(doc.id)) {
                    setBulkSelection(prev => prev.filter(id => id !== doc.id));
                  } else {
                    setBulkSelection(prev => [...prev, doc.id]);
                  }
                }}
              />
            </View>
          </DataTable.Cell>
        </DataTable.Row>
      ))}
    </DataTable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* شريط البحث والأدوات */}
      <Surface style={{ padding: 16 }}>
        <Searchbar
          placeholder="البحث في الوثائق..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={{ marginBottom: 12 }}
        />
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row' }}>
            <Button
              mode="outlined"
              icon="filter"
              onPress={() => setShowFiltersDialog(true)}
              style={{ marginRight: 8 }}
            >
              مرشحات
            </Button>
            
            <SegmentedButtons
              value={viewMode}
              onValueChange={(value) => setViewMode(value as any)}
              buttons={[
                { value: 'grid', icon: 'view-grid' },
                { value: 'list', icon: 'view-list' },
                { value: 'table', icon: 'table' }
              ]}
              style={{ marginRight: 8 }}
            />
          </View>
          
          <View style={{ flexDirection: 'row' }}>
            <Button
              mode="contained"
              icon="upload"
              onPress={() => setShowUploadDialog(true)}
              style={{ marginRight: 8 }}
            >
              رفع
            </Button>
            
            {bulkSelection.length > 0 && (
              <Button
                mode="outlined"
                icon="cog"
                onPress={() => setShowBulkActions(true)}
              >
                إجراءات ({bulkSelection.length})
              </Button>
            )}
          </View>
        </View>
      </Surface>

      {/* إحصائيات النظام */}
      {renderStatsOverview()}

      {/* عرض الوثائق */}
      <ScrollView style={{ flex: 1 }}>
        {viewMode === 'grid' && renderDocumentGrid()}
        {viewMode === 'list' && renderDocumentList()}
        {viewMode === 'table' && renderDocumentTable()}
        
        {filteredDocuments.length === 0 && (
          <View style={{ padding: 32, alignItems: 'center' }}>
            <MaterialCommunityIcons name="folder-open" size={64} color="#ccc" />
            <Text style={{ marginTop: 16, fontSize: 16, opacity: 0.7 }}>
              لا توجد وثائق مطابقة للبحث
            </Text>
          </View>
        )}
      </ScrollView>

      {/* نافذة المرشحات */}
      <Portal>
        <Dialog visible={showFiltersDialog} onDismiss={() => setShowFiltersDialog(false)}>
          <Dialog.Title>مرشحات البحث</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView style={{ padding: 16 }}>
              {/* مرشحات أساسية */}
              <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>نوع الوثيقة:</Text>
              <SegmentedButtons
                value={searchFilters.documentType}
                onValueChange={(value) => setSearchFilters(prev => ({ ...prev, documentType: value }))}
                buttons={[
                  { value: 'all', label: 'الكل' },
                  { value: 'national_id', label: 'هوية' },
                  { value: 'license', label: 'رخصة' },
                  { value: 'vehicle_registration', label: 'مركبة' }
                ]}
                style={{ marginBottom: 16 }}
              />
              
              <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>الحالة:</Text>
              <SegmentedButtons
                value={searchFilters.status}
                onValueChange={(value) => setSearchFilters(prev => ({ ...prev, status: value }))}
                buttons={[
                  { value: 'all', label: 'الكل' },
                  { value: 'active', label: 'نشط' },
                  { value: 'archived', label: 'مؤرشف' }
                ]}
                style={{ marginBottom: 16 }}
              />
              
              <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>مستوى الوصول:</Text>
              <SegmentedButtons
                value={searchFilters.accessLevel}
                onValueChange={(value) => setSearchFilters(prev => ({ ...prev, accessLevel: value }))}
                buttons={[
                  { value: 'all', label: 'الكل' },
                  { value: 'public', label: 'عام' },
                  { value: 'internal', label: 'داخلي' },
                  { value: 'confidential', label: 'سري' }
                ]}
                style={{ marginBottom: 16 }}
              />
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowFiltersDialog(false)}>إغلاق</Button>
            <Button 
              mode="contained" 
              onPress={() => {
                // إعادة تعيين المرشحات
                setSearchFilters({
                  documentType: 'all',
                  status: 'all',
                  accessLevel: 'all',
                  dateRange: { start: '', end: '' },
                  sizeRange: { min: 0, max: 100000000 },
                  tags: []
                });
                setShowFiltersDialog(false);
              }}
            >
              إعادة تعيين
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* نافذة الرفع */}
      <Portal>
        <Dialog visible={showUploadDialog} onDismiss={() => setShowUploadDialog(false)}>
          <Dialog.Title>رفع وثيقة جديدة</Dialog.Title>
          <Dialog.Content>
            <Button
              mode="contained"
              icon="file-upload"
              onPress={uploadDocument}
              style={{ marginBottom: 16 }}
            >
              اختيار ملف
            </Button>
            <Text style={{ fontSize: 12, opacity: 0.7 }}>
              الصيغ المدعومة: PDF, JPG, PNG, DOC, DOCX
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowUploadDialog(false)}>إلغاء</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* نافذة تفاصيل الوثيقة */}
      <Portal>
        <Dialog visible={showDetailsDialog} onDismiss={() => setShowDetailsDialog(false)}>
          <Dialog.Title>تفاصيل الوثيقة</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView style={{ padding: 16 }}>
              {selectedDocument && (
                <View>
                  <Text style={{ fontWeight: 'bold' }}>اسم الملف:</Text>
                  <Text style={{ marginBottom: 8 }}>{selectedDocument.file_name}</Text>
                  
                  <Text style={{ fontWeight: 'bold' }}>النوع:</Text>
                  <Text style={{ marginBottom: 8 }}>{selectedDocument.document_type}</Text>
                  
                  <Text style={{ fontWeight: 'bold' }}>الحجم:</Text>
                  <Text style={{ marginBottom: 8 }}>{formatFileSize(selectedDocument.file_size)}</Text>
                  
                  <Text style={{ fontWeight: 'bold' }}>تاريخ الرفع:</Text>
                  <Text style={{ marginBottom: 8 }}>
                    {new Date(selectedDocument.upload_date).toLocaleString('ar-AE')}
                  </Text>
                  
                  <Text style={{ fontWeight: 'bold' }}>الحالة:</Text>
                  <Chip style={{ alignSelf: 'flex-start', marginBottom: 8 }}>
                    {selectedDocument.status}
                  </Chip>
                  
                  <Text style={{ fontWeight: 'bold' }}>مستوى الوصول:</Text>
                  <Chip style={{ alignSelf: 'flex-start', marginBottom: 8 }}>
                    {selectedDocument.access_level}
                  </Chip>
                  
                  {selectedDocument.tags.length > 0 && (
                    <View>
                      <Text style={{ fontWeight: 'bold', marginTop: 8 }}>العلامات:</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                        {selectedDocument.tags.map((tag, index) => (
                          <Chip key={index} style={{ margin: 2 }}>{tag}</Chip>
                        ))}
                      </View>
                    </View>
                  )}
                  
                  {Object.keys(selectedDocument.metadata).length > 0 && (
                    <View style={{ marginTop: 16 }}>
                      <Text style={{ fontWeight: 'bold' }}>البيانات المستخرجة:</Text>
                      <Text style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                        {JSON.stringify(selectedDocument.metadata, null, 2)}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowDetailsDialog(false)}>إغلاق</Button>
            {selectedDocument && (
              <Button
                mode="contained"
                onPress={() => downloadDocument(selectedDocument)}
              >
                تحميل
              </Button>
            )}
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* نافذة الإجراءات المجمعة */}
      <Portal>
        <Dialog visible={showBulkActions} onDismiss={() => setShowBulkActions(false)}>
          <Dialog.Title>إجراءات مجمعة ({bulkSelection.length} وثيقة)</Dialog.Title>
          <Dialog.Content>
            <Button
              mode="outlined"
              icon="archive"
              onPress={() => bulkAction('archive')}
              style={{ marginBottom: 8 }}
            >
              أرشفة المحدد
            </Button>
            <Button
              mode="outlined"
              icon="delete"
              onPress={() => bulkAction('delete')}
              style={{ marginBottom: 8 }}
            >
              حذف المحدد
            </Button>
            <Button
              mode="outlined"
              icon="tag"
              onPress={() => bulkAction('tag')}
              style={{ marginBottom: 8 }}
            >
              إضافة علامات
            </Button>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowBulkActions(false)}>إلغاء</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}
