import { useEffect, useRef } from 'react';
import {
  Bold, Italic, Underline, Strikethrough,
  List, ListOrdered, Link2, Subscript, Superscript, RemoveFormatting,
} from 'lucide-react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const TOOLS = [
  { cmd: 'bold', icon: Bold, title: 'Bold' },
  { cmd: 'italic', icon: Italic, title: 'Italic' },
  { cmd: 'underline', icon: Underline, title: 'Underline' },
  { cmd: 'strikeThrough', icon: Strikethrough, title: 'Strikethrough' },
  { cmd: 'insertUnorderedList', icon: List, title: 'Bullet list' },
  { cmd: 'insertOrderedList', icon: ListOrdered, title: 'Numbered list' },
  { cmd: 'subscript', icon: Subscript, title: 'Subscript' },
  { cmd: 'superscript', icon: Superscript, title: 'Superscript' },
  { cmd: 'removeFormat', icon: RemoveFormatting, title: 'Clear formatting' },
] as const;

export default function RichTextEditor({ value, onChange, placeholder, minHeight = 100 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  const exec = (cmd: string) => {
    ref.current?.focus();
    if (cmd === 'createLink') {
      const url = window.prompt('Enter the link URL');
      if (url) document.execCommand('createLink', false, url);
    } else {
      document.execCommand(cmd, false);
    }
    if (ref.current) onChange(ref.current.innerHTML);
  };

  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: 8 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2, padding: '8px 12px',
        borderBottom: '1px solid #F3F4F6', flexWrap: 'wrap',
      }}>
        {TOOLS.map(({ cmd, icon: Icon, title }) => (
          <button
            key={cmd}
            type="button"
            title={title}
            onMouseDown={e => { e.preventDefault(); exec(cmd); }}
            style={{
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', background: 'none', cursor: 'pointer', color: '#374151', borderRadius: 4,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F3F4F6')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <Icon size={15} />
          </button>
        ))}
        <button
          type="button"
          title="Insert link"
          onMouseDown={e => { e.preventDefault(); exec('createLink'); }}
          style={{
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', background: 'none', cursor: 'pointer', color: '#374151', borderRadius: 4,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#F3F4F6')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <Link2 size={15} />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={e => onChange((e.target as HTMLDivElement).innerHTML)}
        className="rte-area"
        style={{
          minHeight, padding: '10px 12px', fontSize: 14, color: '#374151',
          outline: 'none', fontFamily: 'inherit', lineHeight: 1.5,
        }}
      />
    </div>
  );
}
