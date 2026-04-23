export type InitialSetupPayload = {
  church_name: string;
  admin_name: string;
  admin_email: string;
  password: string;
  password_confirmation: string;
};

export type InitialSetupErrors = Partial<
  Record<keyof InitialSetupPayload, string[]>
>;

export type InitialSetupSuccess = {
  data: {
    church: {
      id: number;
      name: string;
      slug: string;
    };
    admin: {
      id: number;
      name: string;
      email: string;
    };
    role: "administrator";
    message: string;
  };
};

export type InitialSetupErrorResponse = {
  message: string;
  errors?: InitialSetupErrors;
};
