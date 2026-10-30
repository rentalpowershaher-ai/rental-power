/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // تفعيل التصدير الثابت ليتوافق مع تطبيق الموبايل
  images: {
    unoptimized: true, // تعطيل تحسين الصور لتجنب مشاكل العرض على تطبيق الهاتف
  },
};

export default nextConfig;