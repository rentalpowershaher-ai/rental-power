const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const apiSrc = path.join(__dirname, '../app/api');
const apiBackup = path.join(__dirname, '../_backup_api');

const mwSrc = path.join(__dirname, '../middleware.ts');
const mwBackup = path.join(__dirname, '../_backup_middleware.ts');

try {
  console.log('🔄 جاري الاحتفاظ بنسخة مؤقته من ملفات السيرفر...');
  
  // حفظ الـ api بطريقة النسخ الآمن
  if (fs.existsSync(apiSrc)) {
    fs.rmSync(apiBackup, { recursive: true, force: true });
    fs.cpSync(apiSrc, apiBackup, { recursive: true });
    fs.rmSync(apiSrc, { recursive: true, force: true }); // مسح القديم لتفادي مشاكل الصلاحيات
  }
  
  // حفظ الـ middleware
  if (fs.existsSync(mwSrc)) {
    fs.copyFileSync(mwSrc, mwBackup);
    fs.unlinkSync(mwSrc);
  }

  console.log('🚀 جاري بناء تطبيق Next.js...');
  execSync('npx next build', { stdio: 'inherit' });
  
  if (fs.existsSync('android')) {
    console.log('📱 جاري مزامنة مشروع Capacitor للأندرويد...');
    execSync('npx cap sync android', { stdio: 'inherit' });
  } else {
    console.log('\n⚠️ مجلد android غير موجود. يمكنك إضافته عبر: npx cap add android');
  }

} catch (error) {
  console.error('❌ حدث خطأ أثناء البناء:', error.message);
  process.exit(1);
} finally {
  console.log('↩️ جاري إرجاع ملفات السيرفر لمكانها الأصلي...');
  
  if (fs.existsSync(apiBackup)) {
    fs.cpSync(apiBackup, apiSrc, { recursive: true });
    fs.rmSync(apiBackup, { recursive: true, force: true });
  }
  
  if (fs.existsSync(mwBackup)) {
    fs.copyFileSync(mwBackup, mwSrc);
    fs.unlinkSync(mwBackup);
  }
  console.log('✨ تمت العملية بنجاح تام!');
}