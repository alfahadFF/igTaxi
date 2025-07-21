import { supabase } from './supabase';
import type { 
  TransportRequest, 
  TransportOffer, 
  TransporterProfile,
  CargoType,
  WeightUnit,
  Location,
  Vehicle
} from '@/types/supabase';

// =====================================================
// Transport Requests Functions
// =====================================================

export interface CreateTransportRequestData {
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
  flexible_timing?: boolean;
  budget_min: number;
  budget_max: number;
  currency: string;
  contact_name: string;
  contact_phone: string;
  insurance_required?: boolean;
  loading_assistance_required?: boolean;
}

/**
 * إنشاء طلب نقل جديد
 */
export async function createTransportRequest(data: CreateTransportRequestData) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  const requestData = {
    ...data,
    user_id: user.user.id,
    flexible_timing: data.flexible_timing ?? true,
    insurance_required: data.insurance_required ?? false,
    loading_assistance_required: data.loading_assistance_required ?? false,
  };

  const { data: request, error } = await supabase
    .from('transport_requests')
    .insert(requestData)
    .select()
    .single();

  if (error) throw error;
  return request;
}

/**
 * الحصول على طلبات النقل للمستخدم الحالي
 */
export async function getUserTransportRequests() {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('transport_requests')
    .select(`
      *,
      transport_offers(
        id,
        offered_price,
        currency,
        status,
        transporter_id,
        created_at
      )
    `)
    .eq('user_id', user.user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * الحصول على طلب نقل واحد مع التفاصيل
 */
export async function getTransportRequestWithDetails(requestId: string) {
  const { data, error } = await supabase
    .from('transport_requests_with_customer')
    .select('*')
    .eq('id', requestId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * تحديث حالة طلب النقل
 */
export async function updateTransportRequestStatus(
  requestId: string, 
  status: TransportRequest['status']
) {
  const { data, error } = await supabase
    .from('transport_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =====================================================
// Transport Offers Functions
// =====================================================

export interface CreateTransportOfferData {
  request_id: string;
  offered_price: number;
  currency: string;
  estimated_pickup_time?: string;
  estimated_delivery_time?: string;
  vehicle_info: Vehicle;
  message?: string;
  insurance_included?: boolean;
  loading_assistance_included?: boolean;
}

/**
 * إنشاء عرض نقل جديد
 */
export async function createTransportOffer(data: CreateTransportOfferData) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  const offerData = {
    ...data,
    transporter_id: user.user.id,
    insurance_included: data.insurance_included ?? false,
    loading_assistance_included: data.loading_assistance_included ?? false,
  };

  const { data: offer, error } = await supabase
    .from('transport_offers')
    .insert(offerData)
    .select()
    .single();

  if (error) throw error;

  // تحديث حالة الطلب إلى "offers_received"
  await updateTransportRequestStatus(data.request_id, 'offers_received');

  return offer;
}

/**
 * الحصول على العروض لطلب معين
 */
export async function getTransportOffers(requestId: string) {
  const { data, error } = await supabase
    .from('transport_offers_with_transporter')
    .select('*')
    .eq('request_id', requestId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * قبول عرض نقل
 */
export async function acceptTransportOffer(offerId: string) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  // الحصول على تفاصيل العرض
  const { data: offer, error: offerError } = await supabase
    .from('transport_offers')
    .select(`
      *,
      transport_requests(user_id, status)
    `)
    .eq('id', offerId)
    .single();

  if (offerError) throw offerError;
  if (!offer) throw new Error('Offer not found');

  // التحقق من أن المستخدم هو صاحب الطلب
  if (offer.transport_requests.user_id !== user.user.id) {
    throw new Error('Unauthorized to accept this offer');
  }

  // بداية transaction
  const { data: updatedOffer, error: updateError } = await supabase
    .from('transport_offers')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', offerId)
    .select()
    .single();

  if (updateError) throw updateError;

  // رفض جميع العروض الأخرى
  await supabase
    .from('transport_offers')
    .update({
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejection_reason: 'Another offer was accepted',
    })
    .eq('request_id', offer.request_id)
    .neq('id', offerId);

  // إنشاء رحلة جديدة
  const commissionRate = 10.0; // 10%
  const commissionAmount = (offer.offered_price * commissionRate) / 100;

  const { data: trip, error: tripError } = await supabase
    .from('transport_trips')
    .insert({
      request_id: offer.request_id,
      offer_id: offerId,
      transporter_id: offer.transporter_id,
      customer_id: user.user.id,
      final_price: offer.offered_price,
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      status: 'assigned',
    })
    .select()
    .single();

  if (tripError) throw tripError;

  // تحديث حالة الطلب
  await updateTransportRequestStatus(offer.request_id, 'assigned');

  return { offer: updatedOffer, trip };
}

// =====================================================
// Transporter Profile Functions
// =====================================================

export interface CreateTransporterProfileData {
  company_name?: string;
  license_number?: string;
  commercial_registration?: string;
  business_phone?: string;
  business_email?: string;
  business_address?: string;
  vehicles: Vehicle[];
  service_areas: string[];
  service_radius?: number;
  years_of_experience?: number;
}

/**
 * إنشاء أو تحديث ملف الناقل
 */
export async function upsertTransporterProfile(data: CreateTransporterProfileData) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  const profileData = {
    ...data,
    user_id: user.user.id,
    service_radius: data.service_radius ?? 50,
    years_of_experience: data.years_of_experience ?? 0,
  };

  const { data: profile, error } = await supabase
    .from('transporter_profiles')
    .upsert(profileData, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw error;
  return profile;
}

/**
 * الحصول على ملف الناقل للمستخدم الحالي
 */
export async function getMyTransporterProfile() {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('transporter_profiles')
    .select('*')
    .eq('user_id', user.user.id)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
  return data;
}

/**
 * الحصول على طلبات النقل المتاحة للناقل
 */
export async function getAvailableTransportRequests(radius: number = 50) {
  const profile = await getMyTransporterProfile();
  if (!profile) throw new Error('Transporter profile not found');

  const { data, error } = await supabase
    .from('transport_requests_with_customer')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * الحصول على عروض الناقل
 */
export async function getMyTransportOffers() {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('transport_offers')
    .select(`
      *,
      transport_requests(
        cargo_type,
        weight,
        weight_unit,
        pickup_locations,
        delivery_locations,
        budget_min,
        budget_max,
        currency,
        contact_name,
        contact_phone
      )
    `)
    .eq('transporter_id', user.user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// =====================================================
// Transport Trips Functions
// =====================================================

/**
 * الحصول على رحلات النقل للمستخدم
 */
export async function getMyTransportTrips() {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('transport_trips_complete')
    .select('*')
    .or(`customer_id.eq.${user.user.id},transporter_id.eq.${user.user.id}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * تحديث حالة رحلة النقل
 */
export async function updateTransportTripStatus(
  tripId: string, 
  status: TransportRequest['status']
) {
  const { data, error } = await supabase
    .from('transport_trips')
    .update({ 
      status, 
      updated_at: new Date().toISOString(),
      ...(status === 'completed' && { completed_at: new Date().toISOString() })
    })
    .eq('id', tripId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * إضافة تقييم للرحلة
 */
export async function addTripRating(
  tripId: string,
  rating: number,
  review?: string,
  raterType: 'customer' | 'transporter' = 'customer'
) {
  const updateData = raterType === 'customer' 
    ? { customer_rating: rating, customer_review: review }
    : { transporter_rating: rating, transporter_review: review };

  const { data, error } = await supabase
    .from('transport_trips')
    .update(updateData)
    .eq('id', tripId)
    .select()
    .single();

  if (error) throw error;

  // تحديث تقييم الناقل إذا كان التقييم من العميل
  if (raterType === 'customer') {
    const { data: trip } = await supabase
      .from('transport_trips')
      .select('transporter_id')
      .eq('id', tripId)
      .single();

    if (trip) {
      await supabase.rpc('update_transporter_rating', {
        transporter_user_id: trip.transporter_id
      });
    }
  }

  return data;
}

// =====================================================
// Statistics Functions
// =====================================================

/**
 * إحصائيات النقل للمستخدم
 */
export async function getTransportStats() {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  // إحصائيات العميل
  const { data: customerStats } = await supabase
    .from('transport_trips')
    .select('status, final_price, customer_rating')
    .eq('customer_id', user.user.id);

  // إحصائيات الناقل
  const { data: transporterStats } = await supabase
    .from('transport_trips')
    .select('status, final_price, transporter_rating, commission_amount')
    .eq('transporter_id', user.user.id);

  const totalRequestsAsCustomer = customerStats?.length ?? 0;
  const completedRequestsAsCustomer = customerStats?.filter(t => t.status === 'completed').length ?? 0;
  const totalSpentAsCustomer = customerStats?.reduce((sum, t) => sum + (t.final_price ?? 0), 0) ?? 0;

  const totalTripsAsTransporter = transporterStats?.length ?? 0;
  const completedTripsAsTransporter = transporterStats?.filter(t => t.status === 'completed').length ?? 0;
  const totalEarnedAsTransporter = transporterStats?.reduce((sum, t) => sum + (t.final_price ?? 0), 0) ?? 0;
  const totalCommissionPaid = transporterStats?.reduce((sum, t) => sum + (t.commission_amount ?? 0), 0) ?? 0;

  return {
    asCustomer: {
      totalRequests: totalRequestsAsCustomer,
      completedRequests: completedRequestsAsCustomer,
      totalSpent: totalSpentAsCustomer,
    },
    asTransporter: {
      totalTrips: totalTripsAsTransporter,
      completedTrips: completedTripsAsTransporter,
      totalEarned: totalEarnedAsTransporter,
      totalCommissionPaid,
      netEarned: totalEarnedAsTransporter - totalCommissionPaid,
    },
  };
}
