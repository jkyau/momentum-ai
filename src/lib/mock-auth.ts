// This file provides mock implementations of Clerk authentication for development
// It allows the application to run without valid Clerk API keys

// Mock user data
export const mockUser = {
  id: "dev_user_123",
  firstName: "Development",
  lastName: "User",
  emailAddresses: [{ emailAddress: "dev@example.com" }],
  imageUrl: "https://via.placeholder.com/150",
};

// Mock auth function that returns a consistent user ID
export const mockAuth = async () => {
  return {
    userId: mockUser.id,
    sessionId: "dev_session_123",
    getToken: async () => "mock_token_123",
  };
};

// Mock user function that returns consistent user data
export const mockCurrentUser = async () => {
  return mockUser;
}; 