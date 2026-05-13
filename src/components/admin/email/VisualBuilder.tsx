import React, { useMemo, useState } from 'react';

type BlockType = 'heading' | 'text' | 'button' | 'image' | 'divider' | 'spacer';

interface Block {
  id: string;
  type: BlockType;
  content?: string;
  url?: string;
  align?: 'left' | 'center' | 'right';
  color?: string;
  bg?: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);

function blocksToHtml(blocks: Block[], design: { bg: string; textColor: string; buttonBg: string; buttonColor: string; padding: number; radius: number }): string {
  const inner = blocks.map(b => {
    const align = b.align || 'left';
    switch (b.type) {
      case 'heading':
        return `<h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:${b.color || design.textColor};text-align:${align};">${b.content || ''}</h2>`;
      case 'text':
        return `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:${b.color || design.textColor};text-align:${align};">${b.content || ''}</p>`;
      case 'button':
        return `<div style="text-align:${align};margin:16px 0;"><a href="${b.url || '#'}" style="background:${b.bg || design.buttonBg};color:${b.color || design.buttonColor};padding:12px 22px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600;">${b.content || 'Click here'}</a></div>`;
      case 'image':
        return `<div style="text-align:${align};margin:12px 0;"><img src="${b.url || ''}" alt="" style="max-width:100%;border-radius:6px;"/></div>`;
      case 'divider':
        return `<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;"/>`;
      case 'spacer':
        return `<div style="height:24px;"></div>`;
      default:
        return '';
    }
  }).join('\n');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;font-family:Helvetica,Arial,sans-serif;background:${design.bg};border-radius:${design.radius}px;overflow:hidden;"><tr><td style="padding:${design.padding}px;">${inner}</td></tr></table>`;
}

function htmlToBlocks(html: string): { blocks: Block[]; design: any } {
  // Simple importer: detect existing structure. Falls back to one text block.
  const design = { bg: '#ffffff', textColor: '#1f2937', buttonBg: '#003751', buttonColor: '#ffffff', padding: 24, radius: 12 };
  if (!html || !html.includes('<')) {
    return { blocks: [{ id: uid(), type: 'text', content: html || '' }], design };
  }
  return { blocks: [], design };
}

export const VisualBuilder: React.FC<{ html: string; onHtmlChange: (html: string) => void }> = ({ html, onHtmlChange }) => {
  const initial = useMemo(() => htmlToBlocks(html), []);
  const [blocks, setBlocks] = useState<Block[]>(initial.blocks);
  const [design, setDesign] = useState(initial.design);
  const [selected, setSelected] = useState<string | null>(null);
  const [importedHtml] = useState(html);

  React.useEffect(() => {
    if (blocks.length > 0) onHtmlChange(blocksToHtml(blocks, design));
  }, [blocks, design]);

  const addBlock = (type: BlockType) => {
    const defaults: Partial<Record<BlockType, Partial<Block>>> = {
      heading: { content: 'New heading' },
      text: { content: 'Write your message here.' },
      button: { content: 'Click here', url: 'https://example.com', align: 'center' },
      image: { url: 'https://images.pexels.com/photos/259774/pexels-photo-259774.jpeg', align: 'center' },
      divider: {},
      spacer: {},
    };
    setBlocks([...blocks, { id: uid(), type, ...defaults[type] }]);
  };

  const update = (id: string, patch: Partial<Block>) => setBlocks(bs => bs.map(b => b.id === id ? { ...b, ...patch } : b));
  const remove = (id: string) => setBlocks(bs => bs.filter(b => b.id !== id));
  const move = (id: string, dir: -1 | 1) => {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx < 0 || idx + dir < 0 || idx + dir >= blocks.length) return;
    const next = [...blocks];
    [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
    setBlocks(next);
  };

  const sel = blocks.find(b => b.id === selected);

  if (blocks.length === 0 && importedHtml) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        This template was authored in code. Open the <strong>Code</strong> tab to edit raw HTML, or clear the HTML body and add blocks below to start using the visual builder.
        <div className="mt-3">
          <button onClick={() => setBlocks([{ id: uid(), type: 'heading', content: 'Hi {{first_name}}' }])} className="text-xs text-amber-900 underline">Start fresh with blocks</button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
      <div className="bg-gray-50 rounded-lg p-6 min-h-[400px]">
        <div className="space-y-2">
          {blocks.map(b => (
            <div
              key={b.id}
              onClick={() => setSelected(b.id)}
              className={`bg-white border ${selected === b.id ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'} rounded p-3 cursor-pointer`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{b.type}</span>
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); move(b.id, -1); }} className="text-xs text-gray-400 hover:text-gray-700">&uarr;</button>
                  <button onClick={(e) => { e.stopPropagation(); move(b.id, 1); }} className="text-xs text-gray-400 hover:text-gray-700">&darr;</button>
                  <button onClick={(e) => { e.stopPropagation(); remove(b.id); }} className="text-xs text-red-500 hover:text-red-700">x</button>
                </div>
              </div>
              {b.type === 'heading' && <h2 className="text-lg font-bold text-gray-900">{b.content}</h2>}
              {b.type === 'text' && <p className="text-sm text-gray-700">{b.content}</p>}
              {b.type === 'button' && <div className="text-center"><span className="inline-block px-4 py-2 bg-gray-900 text-white rounded text-sm">{b.content}</span></div>}
              {b.type === 'image' && b.url && <img src={b.url} className="max-w-full rounded" alt="" />}
              {b.type === 'divider' && <hr className="border-gray-300" />}
              {b.type === 'spacer' && <div className="h-6 border border-dashed border-gray-300 rounded" />}
            </div>
          ))}
        </div>

        <div className="mt-4 border-2 border-dashed border-gray-300 rounded-lg p-4">
          <div className="text-xs text-center text-gray-400 mb-3">Add a block</div>
          <div className="grid grid-cols-3 gap-2">
            {(['heading', 'text', 'button', 'image', 'divider', 'spacer'] as BlockType[]).map(t => (
              <button
                key={t}
                onClick={() => addBlock(t)}
                className="border border-gray-200 rounded-lg py-3 text-xs font-medium text-gray-700 hover:bg-white hover:border-gray-300 capitalize"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-bold text-gray-900 mb-3">{sel ? `${sel.type} block` : 'Email design'}</h3>
        {sel ? (
          <div className="space-y-3">
            {(sel.type === 'heading' || sel.type === 'text' || sel.type === 'button') && (
              <div>
                <label className="text-xs text-gray-500 block mb-1">Content</label>
                <textarea
                  value={sel.content || ''}
                  onChange={e => update(sel.id, { content: e.target.value })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                  rows={3}
                />
              </div>
            )}
            {(sel.type === 'button' || sel.type === 'image') && (
              <div>
                <label className="text-xs text-gray-500 block mb-1">URL</label>
                <input
                  value={sel.url || ''}
                  onChange={e => update(sel.id, { url: e.target.value })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                />
              </div>
            )}
            {(sel.type === 'heading' || sel.type === 'text' || sel.type === 'button' || sel.type === 'image') && (
              <div>
                <label className="text-xs text-gray-500 block mb-1">Align</label>
                <select value={sel.align || 'left'} onChange={e => update(sel.id, { align: e.target.value as any })} className="w-full border border-gray-300 rounded px-2 py-1 text-xs">
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Email background</label>
              <input type="color" value={design.bg} onChange={e => setDesign({ ...design, bg: e.target.value })} className="w-full h-8 rounded cursor-pointer" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Text colour</label>
              <input type="color" value={design.textColor} onChange={e => setDesign({ ...design, textColor: e.target.value })} className="w-full h-8 rounded cursor-pointer" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Button colour</label>
              <input type="color" value={design.buttonBg} onChange={e => setDesign({ ...design, buttonBg: e.target.value })} className="w-full h-8 rounded cursor-pointer" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Button text colour</label>
              <input type="color" value={design.buttonColor} onChange={e => setDesign({ ...design, buttonColor: e.target.value })} className="w-full h-8 rounded cursor-pointer" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Corner rounding</label>
              <div className="flex gap-1">
                {[0, 4, 8, 12, 20].map(r => (
                  <button key={r} onClick={() => setDesign({ ...design, radius: r })} className={`flex-1 text-xs py-1 rounded border ${design.radius === r ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>{r === 0 ? 'none' : r}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
