export interface LoginResponseDTO {
    accessToken: string;
    expiresIn: number;
    user: {
        userId: number;
        fullName: string;
        email: string;
    };
    allowedFeatures?: string[];
}