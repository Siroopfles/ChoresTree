export interface IBaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IServerScoped {
  serverId: string;
}
