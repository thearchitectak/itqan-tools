// ينسخ المكتبات من node_modules إلى public/vendor بعد تحديثها (npm update ثم npm run update-vendor)
import fs from 'fs';
const copy = (a, b) => { fs.mkdirSync(b.split('/').slice(0, -1).join('/'), { recursive: true }); fs.copyFileSync('node_modules/' + a, 'public/vendor/' + b); console.log('✓', b); };
copy('pdf-lib/dist/pdf-lib.min.js', 'pdf-lib.min.js');
copy('pdfjs-dist/legacy/build/pdf.min.mjs', 'pdfjs/pdf.min.mjs');
copy('pdfjs-dist/legacy/build/pdf.worker.min.mjs', 'pdfjs/pdf.worker.min.mjs');
copy('qr-code-styling/lib/qr-code-styling.js', 'qr-code-styling.js');
copy('docx/dist/index.iife.js', 'docx.js');
copy('exceljs/dist/exceljs.min.js', 'exceljs.min.js');
copy('mammoth/mammoth.browser.min.js', 'mammoth.browser.min.js');
copy('jszip/dist/jszip.min.js', 'jszip.min.js');
copy('html2pdf.js/dist/html2pdf.bundle.min.js', 'html2pdf.bundle.min.js');
copy('xlsx/dist/xlsx.full.min.js', 'xlsx.full.min.js');
copy('jsbarcode/dist/JsBarcode.all.min.js', 'JsBarcode.all.min.js');
copy('@fontsource-variable/cairo/files/cairo-arabic-wght-normal.woff2', 'fonts/cairo-arabic-wght-normal.woff2');
copy('@fontsource-variable/cairo/files/cairo-latin-wght-normal.woff2', 'fonts/cairo-latin-wght-normal.woff2');
