/**
 * Compresses an image (JPG or PNG) to be less than 1MB in size.
 * PNG files are converted to JPG for better compression.
 * Returns the original file if it's already under 1MB.
 */
export async function compressImageIfNeeded(file: File): Promise<File | Blob> {
  const isImage = file.type === 'image/jpeg' || file.type === 'image/jpg' || file.type === 'image/png';
  const MAX_SIZE = 1 * 1024 * 1024; // 1MB

  // If not an image, return as-is
  if (!isImage) {
    return file;
  }

  // If already small enough, return as-is
  if (file.size <= MAX_SIZE) {
    return file;
  }

  // Compress the image
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate initial scale based on file size
        // For very large files, scale down more aggressively
        let maxDimension = 2048;
        if (file.size > 5 * 1024 * 1024) {
          maxDimension = 1600;
        } else if (file.size > 3 * 1024 * 1024) {
          maxDimension = 1800;
        }

        // Scale down if needed
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height / width) * maxDimension);
            width = maxDimension;
          } else {
            width = Math.round((width / height) * maxDimension);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Start with quality based on file size
        let quality = file.size > 3 * 1024 * 1024 ? 0.6 : 0.8;
        
        const attemptCompression = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }

              // If size is good or quality is too low, return result
              if (blob.size <= MAX_SIZE) {
                resolve(blob);
              } else if (quality <= 0.1) {
                // Last resort: scale down further
                if (width > 1024 || height > 1024) {
                  width = Math.round(width * 0.8);
                  height = Math.round(height * 0.8);
                  canvas.width = width;
                  canvas.height = height;
                  ctx.drawImage(img, 0, 0, width, height);
                  quality = 0.7; // Reset quality with smaller dimensions
                  attemptCompression();
                } else {
                  // Can't compress further, return what we have
                  resolve(blob);
                }
              } else {
                // Reduce quality and try again
                quality -= 0.15;
                attemptCompression();
              }
            },
            'image/jpeg',
            quality
          );
        };

        attemptCompression();
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

