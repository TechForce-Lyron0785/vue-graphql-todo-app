import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useGraphQL } from "../composables/useGraphQL";
import type { User, AuthResponse } from "../types";

export const useAuthStore = defineStore("auth", () => {
  //State
  const user = ref<User | null>(null);
  const accessToken = ref<string | null>(null);
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);

  //Getters
  const { graphqlRequest } = useGraphQL();
  const isAuthenticated = computed(() => !!user.value);

  const setAuth = (userData: User, token: string) => {
    user.value = userData;
    accessToken.value = token;
    error.value = null;
  };
  const clearAuth = () => {
    user.value = null;
    accessToken.value = null;
    error.value = null;
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    isLoading.value = true;
    error.value = null;
    try {
      const query = `
        mutation Login($email:String!,$password:String!) {
          login(email:$email,password:$password) {
            user {
              id
              email
              createdAt
            }
            accessToken
          }
        }
      `;

      const data = await graphqlRequest<{ login: AuthResponse }>(query, {
        email,
        password,
      });
      setAuth(data.login.user, data.login.accessToken);
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Login failed";
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const register = async (
    email: string,
    password: string
  ): Promise<boolean> => {
    isLoading.value = true;
    error.value = null;

    try {
      const query = `
        mutation Register($email: String!, $password: String!) {
          register(email: $email, password: $password) {
            user {
              id
              email
              createdAt
            }
            accessToken
          }
        }
      `;

      const data = await graphqlRequest<{ register: AuthResponse }>(query, {
        email,
        password,
      });
      setAuth(data.register.user, data.register.accessToken);
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Registration failed";
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const query = `
        mutatiion RefreshToken {
          refreshToken {
            user {
              id
              email
              createdAt
            }
            accessToken
          }
        }
      `;
      const data = await graphqlRequest<{ refreshToken: AuthResponse }>(query);
      setAuth(data.refreshToken.user, data.refreshToken.accessToken);
      return true;
    } catch (err) {
      clearAuth();
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const query = `
        mutation Logout {
          logout
        }
      `;
      await graphqlRequest(query);
    } catch (err) {
      //Continue with logout even if server request fails
    } finally {
      clearAuth();
    }
  };

  const initializeAuth = async (): Promise<void> => {
    //Try to refresh token on app start
    await refreshToken();
  };

  return {
    user,
    accessToken,
    isLoading,
    error,
    isAuthenticated,
    login,
    register,
    logout,
    refreshToken,
    initializeAuth,
  };
});
