export interface LoginResponseDTO {
    accessToken: string;
    expiresIn: number; // segundos
    user: {
        userId: number;
        fullName: string;
        email: string;
    };
}