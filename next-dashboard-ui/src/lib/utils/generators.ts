/**
 * Generate email based on role
 */
export function generateEmail(name: string, role: 'teacher' | 'parent' | 'student'): string {
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const timestamp = Date.now().toString().slice(-4);
  
  switch (role) {
    case 'teacher':
      return `${cleanName}${timestamp}@school.com`;
    case 'parent':
      return `${cleanName}${timestamp}@parent.com`;
    case 'student':
      return `${cleanName}${timestamp}@kindergarten.edu`;
    default:
      return `${cleanName}${timestamp}@school.com`;
  }
}

/**
 * Generate secure password
 * Format: Uppercase + lowercase + numbers + special char
 */
export function generatePassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%';
  
  let password = '';
  
  // At least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill remaining characters (total 8-10 chars)
  const allChars = uppercase + lowercase + numbers + special;
  const remainingLength = Math.floor(Math.random() * 3) + 4; // 4-6 more chars
  
  for (let i = 0; i < remainingLength; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Parse CSV line considering quoted fields
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (10 digits)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
}
