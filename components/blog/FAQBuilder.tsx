"use client"

import { Plus, Trash2, HelpCircle } from "lucide-react"

interface FAQItem {
  q: string
  a: string
}

interface FAQBuilderProps {
  items: FAQItem[]
  onChange: (items: FAQItem[]) => void
}

export function FAQBuilder({ items = [], onChange }: FAQBuilderProps) {
  const addItem = () => {
    onChange([...items, { q: "", a: "" }])
  }

  const removeItem = (index: number) => {
    const newItems = [...items]
    newItems.splice(index, 1)
    onChange(newItems)
  }

  const updateItem = (index: number, field: keyof FAQItem, value: string) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    onChange(newItems)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-[#70BF4B]" />
          <h3 className="text-white font-semibold">FAQ Builder</h3>
        </div>
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#70BF4B]/10 text-[#70BF4B] border border-[#70BF4B]/20 hover:bg-[#70BF4B]/20 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Question
        </button>
      </div>

      {items.length === 0 ? (
        <div className="bg-[#001f1f] border border-dashed border-[#003434] rounded-xl p-8 text-center">
          <p className="text-zinc-600 text-sm">No FAQs added yet. Click "Add Question" to start.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="bg-[#001f1f] border border-[#003434] rounded-xl p-4 space-y-3 relative group">
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="absolute top-4 right-4 p-1 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">
                  Question {index + 1}
                </label>
                <input
                  type="text"
                  value={item.q}
                  onChange={(e) => updateItem(index, 'q', e.target.value)}
                  placeholder="Enter the question..."
                  className="w-full bg-[#001a1a] border border-[#003434] focus:border-[#70BF4B]/40 text-white text-sm rounded-lg px-3 py-2 outline-none transition-all"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">
                  Answer
                </label>
                <textarea
                  value={item.a}
                  onChange={(e) => updateItem(index, 'a', e.target.value)}
                  placeholder="Enter the answer..."
                  rows={2}
                  className="w-full bg-[#001a1a] border border-[#003434] focus:border-[#70BF4B]/40 text-white text-sm rounded-lg px-3 py-2 outline-none transition-all resize-none"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
