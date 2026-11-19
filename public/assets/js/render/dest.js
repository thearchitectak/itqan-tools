// مكوّن مشترك: وجهة الحفظ (مجلد مكتبة إتقان على الجهاز أو ملف ZIP)
import { h, ico, toast, seg } from '../ui.js';
import { makeWriter, canPickFolder, savedFolder, chooseFolder, ensurePermission, ROOT_NAME } from './pack.js';

export function destination(note) {
  let root = null, dest = canPickFolder() ? 'folder' : 'zip';
  const folderName = h('b', {}, '—');
  const pickBtn = h('button', { class: 'btn light sm', type: 'button' }, ico('folder-open', 16), 'اختيار مجلد المكتبة');
  pickBtn.onclick = async () => { try { root = await chooseFolder(); folderName.textContent = root.name; } catch (e) { if (e.name !== 'AbortError') toast(e.message, true); } };
  const folderRow = h('div', { class: 'rs-row' + (dest === 'folder' ? '' : ' hidden') }, h('span', {}, 'المجلد الحالي:'), folderName, pickBtn);
  savedFolder().then(x => { if (x) { root = x; folderName.textContent = x.name; } });
  const sg = seg(canPickFolder() ? [['folder', 'حفظ في مجلد مكتبة إتقان'], ['zip', 'تنزيل ملف ZIP']] : [['zip', 'تنزيل ملف ZIP']], dest, v => { dest = v; folderRow.classList.toggle('hidden', v !== 'folder'); });
  const el = h('div', { class: 'panel rs-dest' }, h('h3', {}, ico('folder-down', 20), ' مكان الحفظ'),
    h('p', { class: 'muted' }, note || `تُحفظ الملفات في مجلد «${ROOT_NAME}» نفسه الذي تُحفظ فيه الخامات، فتبقى كل ملفات الإظهار في مكان واحد.`), sg, folderRow,
    canPickFolder() ? null : h('p', { class: 'note info' }, 'متصفحك لا يدعم الحفظ في مجلد مباشرة؛ ستُنزَّل الملفات في ملف ZIP بالبنية نفسها، فُكّه داخل مجلد مكتبتك.'));
  return {
    el,
    async writer() {
      if (dest !== 'folder') return makeWriter('zip');
      if (!root) root = await chooseFolder();
      if (!(await ensurePermission(root))) throw new Error('لم يُمنح إذن الكتابة في المجلد.');
      folderName.textContent = root.name;
      return makeWriter('folder', root);
    },
    get kind() { return dest; }, get name() { return root?.name || ROOT_NAME; },
  };
}
