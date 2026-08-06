export interface UserDto {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponseDto {
  user: UserDto;
  accessToken: string;
}

export interface RegisterRequestDto {
  email: string;
  username: string;
  password: string;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}
