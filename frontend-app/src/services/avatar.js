import axios from 'axios';
import { apiUrl } from './api';

const authOptions = () => ({ headers: { 'X-Authorization': localStorage.getItem('session_token') }, timeout: 10000 });

export async function saveAvatar(value) {
  localStorage.setItem('avatar', value);
  window.dispatchEvent(new Event('avatar-change'));
  if (localStorage.getItem('session_token')) await axios.put(apiUrl('/users/avatar'), { avatar_url: value }, authOptions());
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
    const imageData = canvas.toDataURL('image/webp', 0.85);
    const { data } = await axios.post(apiUrl('/upload-card-image'), { image: imageData }, authOptions());
    await saveAvatar(data.image_url);
    return data.image_url;
  } finally {
    URL.revokeObjectURL(url);
  }
}
