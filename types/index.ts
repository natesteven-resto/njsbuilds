export type JobStatus = 'Active' | 'Pending' | 'Complete' | 'Opportunity' | 'Loss'
export type DocumentType = 'document' | 'photo'

export interface Company {
  id: string
  first_name: string
  last_name: string
  email: string
  phone_1: string | null
  phone_2: string | null
  fax: string | null
  business_name: string
  business_address_1: string
  business_address_2: string | null
  business_city: string
  business_state: string
  business_zip_code: string
  trial: boolean
  active: boolean
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: string | null
  trial_ends_at: string | null
  created_at: string
}

export interface AppUser {
  id: string
  company_id: string
  first_name: string
  last_name: string
  email: string
  active: boolean
  role: 'owner' | 'admin' | 'technician'
  created_at: string
}

export interface Job {
  id: string
  company_id: string
  address: string
  city: string
  state: string
  zip_code: string
  phone: string | null
  claim_number: string | null
  job_number: string | null
  contact_first_name: string | null
  contact_last_name: string | null
  contact_email: string | null
  contact_phone: string | null
  description: string | null
  status: JobStatus
  estimated_amount: number | null
  private: boolean
  private_password: string | null
  active: boolean
  created_at: string
}

export interface Room {
  id: string
  job_id: string
  name: string
  description: string | null
  map_data: string | null
  active: boolean
  created_at: string
}

export interface RoomReading {
  id: string
  room_id: string
  technician_name: string
  notes: string | null
  notes_private: boolean
  temperature_in: number | null
  relative_humidity_in: number | null
  grains_per_pound_in: number | null
  created_at: string
  reading_date: string | null
  humidity_readings?: HumidityReading[]
  equipment_readings?: EquipmentReading[]
}

export interface HumidityReading {
  id: string
  room_reading_id: string
  label: string
  value: number
  created_at: string
}

export interface EquipmentType {
  id: string
  company_id: string
  name: string
}

export interface EquipmentReading {
  id: string
  room_reading_id: string
  equipment_type_id?: string | null
  room_equipment_id?: string | null
  name?: string | null
  count: number
  created_at: string
  equipment_type?: EquipmentType
}

export interface JobDocument {
  id: string
  job_id: string
  room_id: string | null
  title: string
  tags: string | null
  description: string | null
  type: DocumentType
  name: string
  private: boolean
  storage_path: string
  created_at: string
}

export interface JobNote {
  id: string
  job_id: string
  technician_name: string
  value: string
  private: boolean
  created_at: string
}

export interface AdminNote {
  id: string
  company_id: string
  value: string
  created_at: string
}
