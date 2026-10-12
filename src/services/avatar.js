export function saveAvatar(value) {
  localStorage.setItem('avatar', value);
  window.dispatchEvent(new Event('avatar-change'));
}

export async function uploadAvatarFile(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('请选择 JPG、PNG 或 WEBP 图片。');
  }
  if (file.size > 6 * 1024 * 1024) throw new Error('图片不能超过 6 MB。');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('无法读取图片，请换一张图片。'));
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    canvas.getContext('2d').drawImage(image,
      (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2,
      side, side, 0, 0, 256, 256);
    const value = canvas.toDataURL('image/webp', 0.85);
    saveAvatar(value);
    return value;
  } finally {
    URL.revokeObjectURL(url);
  }
}
