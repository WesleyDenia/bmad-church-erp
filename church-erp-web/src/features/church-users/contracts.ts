export type ChurchUserRole = "treasurer" | "secretary" | "leadership";
export type ChurchUserManagedRole = ChurchUserRole | "administrator";
export type ChurchUserStatus = "active" | "inactive";

export type ChurchUserListItem = {
  membership_id: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
  membership: {
    role: ChurchUserManagedRole;
    status: ChurchUserStatus;
  };
  is_current_user: boolean;
};

export type CreateChurchUserPayload = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: ChurchUserRole;
};

export type UpdateChurchUserPayload = {
  role?: ChurchUserRole;
  status?: ChurchUserStatus;
};

export type CreateChurchUserResponse = {
  data: {
    membership_id: number;
    user: {
      id: number;
      name: string;
      email: string;
    };
    membership: {
      church_id: number;
      role: ChurchUserManagedRole;
      status: ChurchUserStatus;
    };
    is_current_user: boolean;
    action: "created";
    message: string;
  };
};

export type ListChurchUsersResponse = {
  data: ChurchUserListItem[];
};

export type ChurchUserErrorResponse = {
  message: string;
  errors?: Partial<
    Record<
      keyof CreateChurchUserPayload
      | keyof UpdateChurchUserPayload
      | "membership"
      | "payload",
      string[]
    >
  >;
};

export type CreateChurchUserErrorResponse = ChurchUserErrorResponse;

export type UpdateChurchUserResponse = {
  data: ChurchUserListItem & {
    action: "updated";
    message: string;
  };
};
