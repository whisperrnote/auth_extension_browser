// Export only functions used by the extension's App and AuthProvider

/**
 * A utility function to simulate an asynchronous operation, such as an API call.
 * @param {number} delay - The delay in milliseconds before the promise resolves.
 * @returns {Promise<void>} A promise that resolves after the specified delay.
 */
export function simulateApiCall(delay: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, delay);
  });
}

/**
 * A utility function to validate an email address using a simple regex pattern.
 * @param {string} email - The email address to validate.
 * @returns {boolean} True if the email is valid, false otherwise.
 */
export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}