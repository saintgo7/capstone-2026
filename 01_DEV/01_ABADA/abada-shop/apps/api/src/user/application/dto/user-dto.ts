export interface UserDTO {
  userId: string;
  email: string;
  name: string;
  phone: string | null;
  status: string;
  grade: string;
  points: number;
  totalSpent: number;
  createdAt: string;
}

export interface AddressDTO {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2: string;
  isDefault: boolean;
}

export interface AuthResultDTO {
  user: UserDTO;
  accessToken: string;
  refreshToken: string;
}
