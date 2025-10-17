const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiService {
  /**
   * Compile and run code
   */
  async compileCode(code, language = 'c') {
    try {
      const response = await fetch(`${API_BASE_URL}/compile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, language }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${error.message}`,
      };
    }
  }

  /**
   * Get list of all executables
   */
  async getExecutables() {
    try {
      const response = await fetch(`${API_BASE_URL}/executables`);
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch executables: ${error.message}`,
        executables: [],
      };
    }
  }

  /**
   * Run a specific executable
   */
  async runExecutable(executableName) {
    try {
      const response = await fetch(`${API_BASE_URL}/executables/${executableName}/run`, {
        method: 'POST',
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: `Failed to run executable: ${error.message}`,
      };
    }
  }

  /**
   * Delete an executable
   */
  async deleteExecutable(executableName) {
    try {
      const response = await fetch(`${API_BASE_URL}/executables/${executableName}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete executable: ${error.message}`,
      };
    }
  }

  /**
   * Get download URL for an executable
   */
  getDownloadUrl(executableName) {
    return `${API_BASE_URL}/executables/${executableName}/download`;
  }
}

export default new ApiService();