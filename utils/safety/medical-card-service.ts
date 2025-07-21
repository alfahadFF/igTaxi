import { supabase } from '@/utils/supabase';

// أنواع البيانات الطبية
export interface MedicalEmergencyCard {
  personalInfo: {
    fullName: string;
    birthDate: string;
    bloodType: string;
    height: string;
    weight: string;
    emergencyContact: string;
    emergencyPhone: string;
  };
  emergencyInfo: {
    chronicDiseases: string;
    currentMedications: string;
    allergies: string;
    emergencyInstructions: string;
  };
  medicalConditions?: Array<{
    condition: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    notes?: string;
  }>;
  medications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    isCritical: boolean;
    notes?: string;
  }>;
  allergies?: Array<{
    allergen: string;
    severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
    reaction: string;
    notes?: string;
  }>;
  isPublicInEmergency: boolean;
}

export interface DatabaseMedicalCard {
  id: string;
  user_id: string;
  personal_info: any;
  emergency_info: any;
  is_active: boolean;
  is_public_in_emergency: boolean;
  created_at: string;
  updated_at: string;
}

export interface DatabaseMedicalCondition {
  id: string;
  medical_card_id: string;
  condition_name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  notes?: string;
  created_at: string;
}

export interface DatabaseMedication {
  id: string;
  medical_card_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  is_critical: boolean;
  notes?: string;
  created_at: string;
}

export interface DatabaseAllergy {
  id: string;
  medical_card_id: string;
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  reaction: string;
  notes?: string;
  created_at: string;
}

class MedicalCardService {
  /**
   * جلب البطاقة الطبية للمستخدم الحالي
   */
  async getMedicalCard(): Promise<MedicalEmergencyCard | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: cardData, error: cardError } = await supabase
        .from('medical_emergency_cards')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (cardError && cardError.code !== 'PGRST116') throw cardError;
      if (!cardData) return null;

      // جلب الحالات الطبية
      const { data: conditions, error: conditionsError } = await supabase
        .from('medical_conditions')
        .select('*')
        .eq('medical_card_id', cardData.id)
        .order('severity', { ascending: false });

      if (conditionsError) throw conditionsError;

      // جلب الأدوية
      const { data: medications, error: medicationsError } = await supabase
        .from('current_medications')
        .select('*')
        .eq('medical_card_id', cardData.id)
        .order('is_critical', { ascending: false });

      if (medicationsError) throw medicationsError;

      // جلب الحساسيات
      const { data: allergies, error: allergiesError } = await supabase
        .from('medical_allergies')
        .select('*')
        .eq('medical_card_id', cardData.id)
        .order('severity', { ascending: false });

      if (allergiesError) throw allergiesError;

      return this.mapDatabaseToMedicalCard(cardData, conditions, medications, allergies);
    } catch (error) {
      console.error('Error fetching medical card:', error);
      throw error;
    }
  }

  /**
   * حفظ أو تحديث البطاقة الطبية
   */
  async saveMedicalCard(card: MedicalEmergencyCard): Promise<MedicalEmergencyCard> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // البحث عن بطاقة موجودة
      const { data: existingCard } = await supabase
        .from('medical_emergency_cards')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      let cardId: string;

      if (existingCard) {
        // تحديث البطاقة الموجودة
        const { data: updatedCard, error: updateError } = await supabase
          .from('medical_emergency_cards')
          .update({
            personal_info: card.personalInfo,
            emergency_info: card.emergencyInfo,
            is_public_in_emergency: card.isPublicInEmergency,
          })
          .eq('id', existingCard.id)
          .select()
          .single();

        if (updateError) throw updateError;
        cardId = updatedCard.id;

        // حذف البيانات القديمة
        await this.deleteExistingMedicalData(cardId);
      } else {
        // إنشاء بطاقة جديدة
        const { data: newCard, error: insertError } = await supabase
          .from('medical_emergency_cards')
          .insert({
            user_id: user.id,
            personal_info: card.personalInfo,
            emergency_info: card.emergencyInfo,
            is_public_in_emergency: card.isPublicInEmergency,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        cardId = newCard.id;
      }

      // إدراج الحالات الطبية
      if (card.medicalConditions && card.medicalConditions.length > 0) {
        const conditionsData = card.medicalConditions.map((condition: any) => ({
          medical_card_id: cardId,
          condition_name: condition.condition,
          severity: condition.severity,
          notes: condition.notes,
        }));

        const { error: conditionsError } = await supabase
          .from('medical_conditions')
          .insert(conditionsData);

        if (conditionsError) throw conditionsError;
      }

      // إدراج الأدوية
      if (card.medications && card.medications.length > 0) {
        const medicationsData = card.medications.map((med: any) => ({
          medical_card_id: cardId,
          medication_name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          is_critical: med.isCritical,
          notes: med.notes,
        }));

        const { error: medicationsError } = await supabase
          .from('current_medications')
          .insert(medicationsData);

        if (medicationsError) throw medicationsError;
      }

      // إدراج الحساسيات
      if (card.allergies && card.allergies.length > 0) {
        const allergiesData = card.allergies.map((allergy: any) => ({
          medical_card_id: cardId,
          allergen: allergy.allergen,
          severity: allergy.severity,
          reaction: allergy.reaction,
          notes: allergy.notes,
        }));

        const { error: allergiesError } = await supabase
          .from('medical_allergies')
          .insert(allergiesData);

        if (allergiesError) throw allergiesError;
      }

      return card;
    } catch (error) {
      console.error('Error saving medical card:', error);
      throw error;
    }
  }

  /**
   * جلب البطاقة الطبية لراكب معين (للسائق في حالة الطوارئ)
   */
  async getPassengerMedicalCard(passengerId: string): Promise<MedicalEmergencyCard | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // التحقق من وجود رحلة نشطة أو حالة طوارئ
      const { data: tripData } = await supabase
        .from('trips')
        .select('*')
        .eq('driver_id', user.id)
        .eq('customer_id', passengerId)
        .in('status', ['in_progress', 'emergency'])
        .single();

      if (!tripData) {
        // التحقق من وجود حالة طوارئ نشطة
        const { data: incidentData } = await supabase
          .from('emergency_incidents')
          .select('*')
          .eq('user_id', passengerId)
          .eq('status', 'active')
          .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
          .single();

        if (!incidentData) {
          throw new Error('No active trip or emergency incident found');
        }
      }

      // جلب البطاقة الطبية إذا كانت عامة في حالات الطوارئ
      const { data: cardData, error: cardError } = await supabase
        .from('medical_emergency_cards')
        .select('*')
        .eq('user_id', passengerId)
        .eq('is_active', true)
        .eq('is_public_in_emergency', true)
        .single();

      if (cardError && cardError.code !== 'PGRST116') throw cardError;
      if (!cardData) return null;

      // جلب البيانات المرتبطة
      const [conditions, medications, allergies] = await Promise.all([
        supabase
          .from('medical_conditions')
          .select('*')
          .eq('medical_card_id', cardData.id)
          .order('severity', { ascending: false }),
        supabase
          .from('current_medications')
          .select('*')
          .eq('medical_card_id', cardData.id)
          .order('is_critical', { ascending: false }),
        supabase
          .from('medical_allergies')
          .select('*')
          .eq('medical_card_id', cardData.id)
          .order('severity', { ascending: false }),
      ]);

      if (conditions.error) throw conditions.error;
      if (medications.error) throw medications.error;
      if (allergies.error) throw allergies.error;

      return this.mapDatabaseToMedicalCard(
        cardData,
        conditions.data,
        medications.data,
        allergies.data
      );
    } catch (error) {
      console.error('Error fetching passenger medical card:', error);
      throw error;
    }
  }

  /**
   * حذف البطاقة الطبية (حذف منطقي)
   */
  async deleteMedicalCard(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('medical_emergency_cards')
        .update({ is_active: false })
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting medical card:', error);
      throw error;
    }
  }

  /**
   * حذف البيانات الطبية الموجودة للبطاقة
   */
  private async deleteExistingMedicalData(cardId: string): Promise<void> {
    await Promise.all([
      supabase.from('medical_conditions').delete().eq('medical_card_id', cardId),
      supabase.from('current_medications').delete().eq('medical_card_id', cardId),
      supabase.from('medical_allergies').delete().eq('medical_card_id', cardId),
    ]);
  }

  /**
   * تحويل بيانات قاعدة البيانات إلى نموذج التطبيق
   */
  private mapDatabaseToMedicalCard(
    cardData: DatabaseMedicalCard,
    conditions: DatabaseMedicalCondition[],
    medications: DatabaseMedication[],
    allergies: DatabaseAllergy[]
  ): MedicalEmergencyCard {
    return {
      personalInfo: cardData.personal_info,
      emergencyInfo: cardData.emergency_info,
      medicalConditions: conditions.map(c => ({
        condition: c.condition_name,
        severity: c.severity,
        notes: c.notes,
      })),
      medications: medications.map(m => ({
        name: m.medication_name,
        dosage: m.dosage,
        frequency: m.frequency,
        isCritical: m.is_critical,
        notes: m.notes,
      })),
      allergies: allergies.map(a => ({
        allergen: a.allergen,
        severity: a.severity,
        reaction: a.reaction,
        notes: a.notes,
      })),
      isPublicInEmergency: cardData.is_public_in_emergency,
    };
  }
}

export const medicalCardService = new MedicalCardService();
