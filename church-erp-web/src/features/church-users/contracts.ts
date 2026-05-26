export type ChurchUserRole = "treasurer" | "secretary" | "leadership";

export type CreateChurchUserPayload = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: ChurchUserRole;
};

export type CreateChurchUserResponse = {
  data: {
    user: {
      id: number;
      name: string;
      email: string;
    };
    membership: {
      church_id: number;
      role: ChurchUserRole;
      status: "active";
    };
    action: "created";
    message: string;
  };
};

export type CreateChurchUserErrorResponse = {
  message: string;
  errors?: Partial<Record<keyof CreateChurchUserPayload | "payload", string[]>>;
};
