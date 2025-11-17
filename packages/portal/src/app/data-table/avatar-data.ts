import type { StatusType } from '@/components/data-table/data-table-status-cell'

export interface UserData {
  id: string
  name: string
  email: string
  avatarUrl?: string
  role: string
  department: string
  status: 'active' | 'inactive' | 'pending'
  projectStatus: StatusType
  lastLogin: Date
  joinDate: Date
  location: string
  phone?: string
}

const generateAvatarUrl = (seed: string) => {
  // Using DiceBear API for consistent avatar generation
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=3b82f6,8b5cf6,06b6d4,10b981,f59e0b,ef4444`
}

export const avatarData: UserData[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    avatarUrl: generateAvatarUrl('Sarah Johnson'),
    role: 'Senior Developer',
    department: 'Engineering',
    status: 'active',
    projectStatus: 'working',
    lastLogin: new Date(2024, 10, 10, 14, 30),
    joinDate: new Date(2022, 2, 15),
    location: 'San Francisco, CA',
    phone: '+1 (555) 123-4567',
  },
  {
    id: '2',
    name: 'Michael Chen',
    email: 'michael.chen@company.com',
    role: 'Product Manager',
    department: 'Product',
    status: 'active',
    projectStatus: 'done',
    lastLogin: new Date(2024, 10, 11, 9, 15),
    joinDate: new Date(2021, 8, 22),
    location: 'New York, NY',
  },
  {
    id: '3',
    name: 'Emma Rodriguez',
    email: 'emma.rodriguez@company.com',
    avatarUrl: generateAvatarUrl('Emma Rodriguez'),
    role: 'UX Designer',
    department: 'Design',
    status: 'active',
    projectStatus: 'review',
    lastLogin: new Date(2024, 10, 11, 16, 45),
    joinDate: new Date(2023, 0, 10),
    location: 'Austin, TX',
    phone: '+1 (555) 987-6543',
  },
  {
    id: '4',
    name: 'James Wilson',
    email: 'james.wilson@company.com',
    role: 'DevOps Engineer',
    department: 'Engineering',
    status: 'inactive',
    projectStatus: 'stuck',
    lastLogin: new Date(2024, 9, 28, 11, 20),
    joinDate: new Date(2020, 5, 3),
    location: 'Seattle, WA',
  },
  {
    id: '5',
    name: 'Aisha Patel',
    email: 'aisha.patel@company.com',
    avatarUrl: generateAvatarUrl('Aisha Patel'),
    role: 'Data Scientist',
    department: 'Analytics',
    status: 'active',
    projectStatus: 'working',
    lastLogin: new Date(2024, 10, 11, 13, 10),
    joinDate: new Date(2023, 6, 18),
    location: 'Boston, MA',
    phone: '+1 (555) 456-7890',
  },
  {
    id: '6',
    name: 'David Kim',
    email: 'david.kim@company.com',
    role: 'Marketing Lead',
    department: 'Marketing',
    status: 'active',
    projectStatus: 'todo',
    lastLogin: new Date(2024, 10, 11, 8, 30),
    joinDate: new Date(2022, 10, 1),
    location: 'Los Angeles, CA',
  },
  {
    id: '7',
    name: 'Lisa Thompson',
    email: 'lisa.thompson@company.com',
    avatarUrl: generateAvatarUrl('Lisa Thompson'),
    role: 'HR Manager',
    department: 'Human Resources',
    status: 'active',
    projectStatus: 'done',
    lastLogin: new Date(2024, 10, 11, 12, 0),
    joinDate: new Date(2019, 3, 12),
    location: 'Chicago, IL',
    phone: '+1 (555) 321-9876',
  },
  {
    id: '8',
    name: 'Robert Garcia',
    email: 'robert.garcia@company.com',
    role: 'Sales Director',
    department: 'Sales',
    status: 'pending',
    projectStatus: 'pending',
    lastLogin: new Date(2024, 10, 5, 17, 45),
    joinDate: new Date(2024, 9, 15),
    location: 'Miami, FL',
  },
  {
    id: '9',
    name: 'Jennifer Lee',
    email: 'jennifer.lee@company.com',
    avatarUrl: generateAvatarUrl('Jennifer Lee'),
    role: 'Quality Assurance',
    department: 'Engineering',
    status: 'active',
    projectStatus: 'working',
    lastLogin: new Date(2024, 10, 11, 15, 20),
    joinDate: new Date(2021, 1, 28),
    location: 'Portland, OR',
    phone: '+1 (555) 654-3210',
  },
  {
    id: '10',
    name: 'Ahmed Hassan',
    email: 'ahmed.hassan@company.com',
    role: 'Solutions Architect',
    department: 'Engineering',
    status: 'active',
    projectStatus: 'review',
    lastLogin: new Date(2024, 10, 11, 10, 30),
    joinDate: new Date(2020, 11, 8),
    location: 'Denver, CO',
  },
  {
    id: '11',
    name: 'Maria Santos',
    email: 'maria.santos@company.com',
    avatarUrl: generateAvatarUrl('Maria Santos'),
    role: 'Content Manager',
    department: 'Marketing',
    status: 'active',
    projectStatus: 'done',
    lastLogin: new Date(2024, 10, 10, 16, 15),
    joinDate: new Date(2023, 4, 20),
    location: 'Phoenix, AZ',
    phone: '+1 (555) 789-0123',
  },
  {
    id: '12',
    name: "Kevin O'Connor",
    email: 'kevin.oconnor@company.com',
    role: 'Financial Analyst',
    department: 'Finance',
    status: 'active',
    projectStatus: 'todo',
    lastLogin: new Date(2024, 10, 11, 7, 45),
    joinDate: new Date(2022, 7, 5),
    location: 'Atlanta, GA',
  },
]
