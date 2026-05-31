import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import { useEffect, useRef, useState } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  /**
   * Optional image uploader. When provided, the toolbar shows an "Image"
   * button that opens a file picker, uploads the chosen file via this
   * callback, and inserts the returned URL into the document. Without it,
   * only the "by URL" insert path is available.
   */
  onUploadImage?: (file: File) => Promise<string>;
}

export function RichTextEditor({ value, onChange, onUploadImage }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      // inline:false keeps images on their own line (block), which reads
      // better in article bodies; allowBase64 stays off so we never bloat
      // the stored HTML with data URIs — images go through the uploader.
      // referrerpolicy=no-referrer lets images hosted on sites that block
      // hot-linking by Referer header still render in our preview/student
      // view; loading=lazy defers off-screen images. Both are baked into the
      // stored HTML so every render surface gets them. (Risha 2026-05-30 —
      // images added by URL weren't showing in the preview.)
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { referrerpolicy: 'no-referrer', loading: 'lazy' },
      }),
    ],
    content: value,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  const btn = (active: boolean) =>
    `px-2 py-1 text-xs rounded transition-colors ${active ? 'bg-ttii-primary/10 text-ttii-primary font-semibold' : 'text-gray-600 hover:bg-gray-100'}`;

  // Normalise a pasted image URL. The #1 reason an "Image URL" doesn't show
  // is a missing scheme: a link like "www.site.com/x.jpg" or "site.com/x.jpg"
  // is treated by the browser as a path RELATIVE to admin.teachersindia.in,
  // so it 404s and renders blank. Prepend https:// in that case. Leave
  // absolute (http/https), root-relative (/...), data: and protocol-relative
  // (//...) URLs untouched.
  const normalizeImageUrl = (raw: string): string => {
    const url = raw.trim();
    if (!url) return '';
    if (/^(https?:)?\/\//i.test(url) || url.startsWith('/') || url.startsWith('data:')) {
      return url;
    }
    return `https://${url}`;
  };

  const insertImageByUrl = (): void => {
    const raw = window.prompt('Paste a direct image link (must start with https://)');
    const url = normalizeImageUrl(raw ?? '');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file twice still fires onChange.
    e.target.value = '';
    if (!file || !onUploadImage) return;
    setUploading(true);
    try {
      const url = await onUploadImage(file);
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    } catch {
      window.alert('Image upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-md border border-input overflow-hidden">
      <div className="flex flex-wrap gap-0.5 border-b bg-gray-50 p-1.5">
        <button type="button" className={btn(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
          <strong>B</strong>
        </button>
        <button type="button" className={btn(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
          <em>I</em>
        </button>
        <button type="button" className={btn(editor.isActive('underline'))} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
          <span className="underline">U</span>
        </button>
        <span className="mx-1 border-r" />
        <button type="button" className={btn(editor.isActive('heading', { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading">
          H2
        </button>
        <button type="button" className={btn(editor.isActive('heading', { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Sub-heading">
          H3
        </button>
        <span className="mx-1 border-r" />
        <button type="button" className={btn(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
          &bull; List
        </button>
        <button type="button" className={btn(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List">
          1. List
        </button>
        <span className="mx-1 border-r" />
        <button type="button" className={btn(editor.isActive('blockquote'))} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote">
          &ldquo;Quote
        </button>
        <button type="button" className={btn(false)} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">
          &mdash;
        </button>
        <span className="mx-1 border-r" />
        {/* Image: upload from device (when an uploader is wired) */}
        {onUploadImage ? (
          <button
            type="button"
            className={btn(false)}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Upload image"
          >
            {uploading ? 'Uploading…' : '🖼 Image'}
          </button>
        ) : null}
        {/* Image: insert by URL (always available) */}
        <button type="button" className={btn(false)} onClick={insertImageByUrl} title="Insert image by URL">
          Image URL
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { void handleFilePicked(e); }}
        />
      </div>
      <EditorContent editor={editor} className="min-h-[200px] p-3 prose prose-sm max-w-none focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[180px] [&_img]:max-w-full [&_img]:rounded-md [&_img]:my-2" />
    </div>
  );
}
