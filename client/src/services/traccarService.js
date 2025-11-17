/**
 * Traccar API Service Layer with Bridge User Authentication
 * Handles all communication with the Traccar backend API using bridge user credentials
 */

// Use backend proxy for Traccar authentication
const PROXY_BASE_URL = '/api/traccar';

class TraccarService {
  constructor() {
    this.baseURL = PROXY_BASE_URL;
    this.sessionToken = null;
    this.isAuthenticated = false;
  }

  /**
   * Login via backend proxy
   */
  async login() {
    try {
      const response = await fetch(`${this.baseURL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      
      if (data.success) {
        this.sessionToken = data.sessionToken;
        this.isAuthenticated = true;
        console.log('Successfully authenticated with Traccar via proxy:', data.credentials);
        return true;
      } else {
        throw new Error(`Login failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Traccar login error:', error);
      this.isAuthenticated = false;
      this.sessionToken = null;
      throw error;
    }
  }

  /**
   * Get headers for API requests with session token
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.sessionToken) {
      headers['Authorization'] = `Bearer ${this.sessionToken}`;
    }
    
    return headers;
  }

  /**
   * Make authenticated API request to Traccar
   */
  async makeRequest(endpoint, options = {}) {
    // Ensure we're logged in
    if (!this.isAuthenticated || !this.sessionToken) {
      await this.login();
    }

    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (response.status === 401) {
        // Session expired, re-login
        console.log('Session expired, re-authenticating...');
        this.sessionToken = null;
        this.isAuthenticated = false;
        await this.login();
        
        // Retry with new session
        config.headers['Cookie'] = `JSESSIONID=${this.sessionToken}`;
        const retryResponse = await fetch(url, config);
        
        if (!retryResponse.ok) {
          const errorText = await retryResponse.text();
          throw new Error(`Traccar API Error ${retryResponse.status}: ${errorText}`);
        }
        
        return await retryResponse.json();
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Traccar API Error ${response.status}: ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Traccar API Request Failed:', error);
      throw error;
    }
  }

  /**
   * Get all devices
   */
  async getDevices() {
    return await this.makeRequest('/devices');
  }

  /**
   * Get device by ID
   */
  async getDevice(deviceId) {
    return await this.makeRequest(`/devices/${deviceId}`);
  }

  /**
   * Create a new device
   */
  async createDevice(deviceData) {
    return await this.makeRequest('/devices', {
      method: 'POST',
      body: JSON.stringify(deviceData)
    });
  }

  /**
   * Update device
   */
  async updateDevice(deviceId, deviceData) {
    return await this.makeRequest(`/devices/${deviceId}`, {
      method: 'PUT',
      body: JSON.stringify(deviceData)
    });
  }

  /**
   * Delete device
   */
  async deleteDevice(deviceId) {
    return await this.makeRequest(`/devices/${deviceId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Get positions for all devices or specific device
   */
  async getPositions(deviceId = null) {
    const endpoint = deviceId ? `/positions?deviceId=${deviceId}` : '/positions';
    return await this.makeRequest(endpoint);
  }

  /**
   * Get events for all devices or specific device
   */
  async getEvents(deviceId = null) {
    const endpoint = deviceId ? `/events?deviceId=${deviceId}` : '/events';
    return await this.makeRequest(endpoint);
  }

  /**
   * Get geofences
   */
  async getGeofences() {
    return await this.makeRequest('/geofences');
  }

  /**
   * Create geofence
   */
  async createGeofence(geofenceData) {
    return await this.makeRequest('/geofences', {
      method: 'POST',
      body: JSON.stringify(geofenceData)
    });
  }

  /**
   * Update geofence
   */
  async updateGeofence(geofenceId, geofenceData) {
    return await this.makeRequest(`/geofences/${geofenceId}`, {
      method: 'PUT',
      body: JSON.stringify(geofenceData)
    });
  }

  /**
   * Delete geofence
   */
  async deleteGeofence(geofenceId) {
    return await this.makeRequest(`/geofences/${geofenceId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Get notifications
   */
  async getNotifications() {
    return await this.makeRequest('/notifications');
  }

  /**
   * Create notification
   */
  async createNotification(notificationData) {
    return await this.makeRequest('/notifications', {
      method: 'POST',
      body: JSON.stringify(notificationData)
    });
  }

  /**
   * Update notification
   */
  async updateNotification(notificationId, notificationData) {
    return await this.makeRequest(`/notifications/${notificationId}`, {
      method: 'PUT',
      body: JSON.stringify(notificationData)
    });
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId) {
    return await this.makeRequest(`/notifications/${notificationId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Get server information
   */
  async getServerInfo() {
    return await this.makeRequest('/server');
  }

  /**
   * Get statistics
   */
  async getStatistics() {
    return await this.makeRequest('/statistics');
  }

  /**
   * Get reports
   */
  async getReports(reportType, params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const endpoint = queryParams ? `/reports/${reportType}?${queryParams}` : `/reports/${reportType}`;
    return await this.makeRequest(endpoint);
  }

  /**
   * Get route report
   */
  async getRouteReport(deviceId, from, to) {
    return await this.getReports('route', {
      deviceId,
      from,
      to
    });
  }

  /**
   * Get events report
   */
  async getEventsReport(deviceId, from, to) {
    return await this.getReports('events', {
      deviceId,
      from,
      to
    });
  }

  /**
   * Get summary report
   */
  async getSummaryReport(deviceId, from, to) {
    return await this.getReports('summary', {
      deviceId,
      from,
      to
    });
  }

  /**
   * Get trips report
   */
  async getTripsReport(deviceId, from, to) {
    return await this.getReports('trips', {
      deviceId,
      from,
      to
    });
  }

  /**
   * Get stops report
   */
  async getStopsReport(deviceId, from, to) {
    return await this.getReports('stops', {
      deviceId,
      from,
      to
    });
  }

  /**
   * Get chart report
   */
  async getChartReport(deviceId, from, to) {
    return await this.getReports('chart', {
      deviceId,
      from,
      to
    });
  }

  /**
   * Get session token for WebSocket connection
   */
  async getSessionToken() {
    if (!this.isAuthenticated || !this.sessionToken) {
      await this.login();
    }
    return this.sessionToken;
  }

  /**
   * Check if service is authenticated
   */
  isLoggedIn() {
    return this.isAuthenticated && this.sessionToken !== null;
  }

  /**
   * Logout and clear session
   */
  async logout() {
    try {
      if (this.sessionToken) {
        await this.makeRequest('/session', {
          method: 'DELETE'
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.sessionToken = null;
      this.isAuthenticated = false;
    }
  }
}

// Create singleton instance
const traccarService = new TraccarService();

export default traccarService;