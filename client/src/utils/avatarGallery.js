// Curated Inbuilt Avatars & Avatar Compression Utilities for Chatera

export const AVATAR_CATEGORIES = ['All', '3D Avatars', 'Robots & Mascots', 'Modern & Anime', 'Vibrant Gradients'];

// Pure inline SVG gradients for 100% offline reliability & instant rendering
const createGradientSvg = (color1, color2, iconChar) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color1}"/>
        <stop offset="100%" stop-color="${color2}"/>
      </linearGradient>
    </defs>
    <rect width="120" height="120" rx="60" fill="url(#g)"/>
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="-apple-system, sans-serif" font-size="44" font-weight="bold" fill="#ffffff">${iconChar}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const BUILTIN_AVATARS = [
  // 3D Avatars (Adventurer Style)
  {
    id: 'adventurer-1',
    name: 'Alex',
    category: '3D Avatars',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Alexander&backgroundColor=b6e3f4,c0aede,d1d4f9',
  },
  {
    id: 'adventurer-2',
    name: 'Maya',
    category: '3D Avatars',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Maya&backgroundColor=ffd5dc,ffdfbf',
  },
  {
    id: 'adventurer-3',
    name: 'Leo',
    category: '3D Avatars',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Leo&backgroundColor=c0aede,d1d4f9',
  },
  {
    id: 'adventurer-4',
    name: 'Aneka',
    category: '3D Avatars',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka&backgroundColor=ffd5dc,b6e3f4',
  },
  {
    id: 'adventurer-5',
    name: 'Caleb',
    category: '3D Avatars',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Caleb&backgroundColor=b6e3f4',
  },
  {
    id: 'adventurer-6',
    name: 'Avery',
    category: '3D Avatars',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Avery&backgroundColor=d1d4f9',
  },
  {
    id: 'adventurer-7',
    name: 'Destiny',
    category: '3D Avatars',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Destiny&backgroundColor=ffdfbf',
  },
  {
    id: 'adventurer-8',
    name: 'Jordan',
    category: '3D Avatars',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Jordan&backgroundColor=c0aede',
  },

  // Robots & Mascots (Bottts Style)
  {
    id: 'bot-1',
    name: 'Cyber Bot',
    category: 'Robots & Mascots',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Cyber&backgroundColor=1e293b',
  },
  {
    id: 'bot-2',
    name: 'Sparky',
    category: 'Robots & Mascots',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sparky&backgroundColor=0f172a',
  },
  {
    id: 'bot-3',
    name: 'Gizmo',
    category: 'Robots & Mascots',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Gizmo&backgroundColor=334155',
  },
  {
    id: 'bot-4',
    name: 'Cosmo',
    category: 'Robots & Mascots',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Cosmo&backgroundColor=1e1b4b',
  },
  {
    id: 'bot-5',
    name: 'Pixel',
    category: 'Robots & Mascots',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Pixel&backgroundColor=064e3b',
  },
  {
    id: 'bot-6',
    name: 'Turbo',
    category: 'Robots & Mascots',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Turbo&backgroundColor=831843',
  },

  // Modern & Anime (Lorelei Style)
  {
    id: 'lorelei-1',
    name: 'Luna',
    category: 'Modern & Anime',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Luna&backgroundColor=ffd5dc',
  },
  {
    id: 'lorelei-2',
    name: 'Kai',
    category: 'Modern & Anime',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Kai&backgroundColor=b6e3f4',
  },
  {
    id: 'lorelei-3',
    name: 'Sasha',
    category: 'Modern & Anime',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Sasha&backgroundColor=d1d4f9',
  },
  {
    id: 'lorelei-4',
    name: 'Zoe',
    category: 'Modern & Anime',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Zoe&backgroundColor=c0aede',
  },
  {
    id: 'lorelei-5',
    name: 'Oliver',
    category: 'Modern & Anime',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Oliver&backgroundColor=ffdfbf',
  },
  {
    id: 'lorelei-6',
    name: 'Morgan',
    category: 'Modern & Anime',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Morgan&backgroundColor=b6e3f4',
  },

  // Vibrant Gradient Geometric (Zero network dependency)
  {
    id: 'grad-1',
    name: 'Cosmic Violet',
    category: 'Vibrant Gradients',
    url: createGradientSvg('#8b5cf6', '#3b82f6', '⚡'),
  },
  {
    id: 'grad-2',
    name: 'Solar Flare',
    category: 'Vibrant Gradients',
    url: createGradientSvg('#f97316', '#ec4899', '🔥'),
  },
  {
    id: 'grad-3',
    name: 'Emerald Aurora',
    category: 'Vibrant Gradients',
    url: createGradientSvg('#10b981', '#06b6d4', '💎'),
  },
  {
    id: 'grad-4',
    name: 'Cyberpunk Neon',
    category: 'Vibrant Gradients',
    url: createGradientSvg('#06b6d4', '#d946ef', '🚀'),
  },
  {
    id: 'grad-5',
    name: 'Midnight Ocean',
    category: 'Vibrant Gradients',
    url: createGradientSvg('#1e3a8a', '#3b82f6', '🌊'),
  },
  {
    id: 'grad-6',
    name: 'Golden Sunset',
    category: 'Vibrant Gradients',
    url: createGradientSvg('#eab308', '#ef4444', '⭐'),
  },
];

/**
 * Compresses and crops an image file to a lightweight, square base64 DataURL (max 400x400).
 * Prevents large uploads while ensuring crisp display picture resolution.
 */
export function compressAvatarFile(file, maxSize = 400, quality = 0.88) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file provided'));
    }

    const reader = new FileReader();
    reader.onerror = (e) => {
      console.error('FileReader error:', reader.error || e);
      const isCloudOrPermission = reader.error?.name === 'NotReadableError' || 
                                  reader.error?.name === 'SecurityError' ||
                                  reader.error?.message?.includes('permission') ||
                                  reader.error?.message?.includes('read');
      if (isCloudOrPermission) {
        reject(new Error("Cloud File Access Error: This file is currently stored in OneDrive cloud mode and not downloaded on your computer. Please right-click the image in Windows Explorer, select 'Always keep on this device', or take a photo with your webcam."));
      } else {
        reject(new Error('Could not read the selected image file.'));
      }
    };

    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Selected file is corrupted or not a supported image format.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Crop square from center
        const minDim = Math.min(width, height);
        const startX = (width - minDim) / 2;
        const startY = (height - minDim) / 2;

        const targetSize = Math.min(maxSize, minDim);
        canvas.width = targetSize;
        canvas.height = targetSize;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, targetSize, targetSize);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
