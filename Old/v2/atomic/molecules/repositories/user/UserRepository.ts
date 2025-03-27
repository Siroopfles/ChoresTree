export interface User {
  id: string;
  username: string;
  serverId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
  inheritsFrom?: string;
}

export interface UserRepository {
  /**
   * Vindt een gebruiker op ID
   */
  findById(userId: string): Promise<User | null>;

  /**
   * Haalt alle rollen op voor een gebruiker
   */
  findRoles(userId: string): Promise<UserRole[]>;
}