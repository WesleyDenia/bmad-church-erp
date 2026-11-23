export type InitialSetupPayload = {
  church_name: string;
  admin_name: string;
  admin_email: string;
  password: string;
  password_confirmation: string;
  terms_accepted: boolean;
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

export type OnboardingTerms = {
  id: number;
  version: number;
  content: string;
  content_hash: string;
};

export type OnboardingTermsResponse = {
  data: OnboardingTerms;
};
