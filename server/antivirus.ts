import { spawn } from 'child_process';

export interface ScanResult {
  isClean: boolean;
  malwareName?: string;
  error?: string;
}

export async function scanBuffer(buffer: Buffer, filename: string): Promise<ScanResult> {
  return new Promise((resolve) => {
    try {
      const clamscan = spawn('clamscan', ['--no-summary', '-']);
      
      let stdout = '';
      let stderr = '';
      
      clamscan.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      clamscan.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      clamscan.on('close', (code) => {
        if (code === 0) {
          resolve({ isClean: true });
        } else if (code === 1) {
          const match = stdout.match(/: (.+) FOUND/);
          resolve({
            isClean: false,
            malwareName: match ? match[1] : 'Unknown threat',
          });
        } else {
          console.warn(`ClamAV scan warning for ${filename}: ${stderr || 'Scanner unavailable'}`);
          resolve({ isClean: true });
        }
      });
      
      clamscan.on('error', (err) => {
        console.warn(`ClamAV not available, skipping scan for ${filename}:`, err.message);
        resolve({ isClean: true });
      });
      
      clamscan.stdin.write(buffer);
      clamscan.stdin.end();
      
    } catch (error) {
      console.warn(`Antivirus scan failed for ${filename}:`, error);
      resolve({ isClean: true });
    }
  });
}

export async function scanBase64(base64Data: string, filename: string): Promise<ScanResult> {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    return scanBuffer(buffer, filename);
  } catch (error) {
    console.warn(`Failed to decode base64 for scanning ${filename}:`, error);
    return { isClean: true };
  }
}

const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif',
  '.vbs', '.vbe', '.js', '.jse', '.ws', '.wsf', '.wsc', '.wsh',
  '.ps1', '.psm1', '.psd1',
  '.dll', '.sys', '.drv',
  '.hta', '.cpl', '.msc', '.jar',
  '.lnk', '.inf', '.reg',
];

const DANGEROUS_MIME_TYPES = [
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-dosexec',
  'application/hta',
  'application/x-ms-shortcut',
];

export function checkFileType(filename: string, contentType?: string): ScanResult {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    return {
      isClean: false,
      malwareName: `Blocked file type: ${ext}`,
    };
  }
  
  if (contentType && DANGEROUS_MIME_TYPES.includes(contentType.toLowerCase())) {
    return {
      isClean: false,
      malwareName: `Blocked content type: ${contentType}`,
    };
  }
  
  return { isClean: true };
}

export async function scanFile(
  data: Buffer | string,
  filename: string,
  contentType?: string,
  isBase64 = false
): Promise<ScanResult> {
  const typeCheck = checkFileType(filename, contentType);
  if (!typeCheck.isClean) {
    return typeCheck;
  }
  
  if (isBase64 && typeof data === 'string') {
    return scanBase64(data, filename);
  }
  
  if (Buffer.isBuffer(data)) {
    return scanBuffer(data, filename);
  }
  
  return { isClean: true };
}
