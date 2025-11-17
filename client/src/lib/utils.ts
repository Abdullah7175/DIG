import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// User session management utilities
export function setUser(user: any) {
  localStorage.setItem("user", JSON.stringify(user));
}

export function getUser() {
  const user = localStorage.getItem("user");
  try {
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export function clearUser() {
  localStorage.removeItem("user");
}

export function isAuthenticated() {
  return !!getUser();
}

// Enhanced logout function that clears all auth data and redirects
export function logout() {
  // Clear localStorage
  clearUser();
  
  // Clear cookies
  document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  
  // Redirect to login page
  window.location.href = '/login';
}

// Check if token is expired and handle accordingly
export function handleTokenExpiration() {
  // Clear all authentication data
  clearUser();
  document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  
  // Redirect to login page
  window.location.href = '/login';
}

// Check token validity by making a test API call
export async function checkTokenValidity() {
  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'include',
    });
    
    if (response.status === 401) {
      handleTokenExpiration();
      return false;
    }
    
    return response.ok;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}
