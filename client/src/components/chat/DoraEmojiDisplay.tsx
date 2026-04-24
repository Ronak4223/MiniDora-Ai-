import { DoraEmoji } from '@/lib/emoji-engine';
import sheet1 from '@/assets/stickers/sheet1.png';
import sheet2 from '@/assets/stickers/sheet2.png';
import sheet3 from '@/assets/stickers/sheet3.png';
import sheet4 from '@/assets/stickers/sheet4.png';
import sheet5 from '@/assets/stickers/sheet5.png';
const SHEETS: Record<number, string> = { 1:sheet1, 2:sheet2, 3:sheet3, 4:sheet4, 5:sheet5 };
interface Props { emoji: DoraEmoji; size?: number; className?: string; }
export default function DoraEmojiDisplay({ emoji, size = 40, className = '' }: Props) {
  const src = SHEETS[emoji.sheetIndex];
  if (!src) return null;
  const xPct = emoji.cols <= 1 ? 0 : (emoji.col / (emoji.cols - 1)) * 100;
  const yPct = emoji.rows <= 1 ? 0 : (emoji.row / (emoji.rows - 1)) * 100;
  return (
    <span role="img" aria-label={emoji.label} title={emoji.label} className={`inline-block shrink-0 ${className}`}
      style={{ width:size, height:size, backgroundImage:`url(${src})`, backgroundSize:`${emoji.cols*100}% ${emoji.rows*100}%`, backgroundPosition:`${xPct}% ${yPct}%`, backgroundRepeat:'no-repeat' }} />
  );
}
