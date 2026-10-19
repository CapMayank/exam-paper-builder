"use client";

import React, { useState } from "react";
import { ImagePlus, Search, Sparkles, Upload, X } from "lucide-react";
import { CLIPART_LIBRARY, searchClipart } from "../clipartLibrary";
import type { ClipartItem } from "../types";
import { imageUrl, uploadImage } from "@/lib/client";

interface ClipartPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: ClipartItem | { customUrl: string; name: string }) => void;
  title?: string;
}

export function ClipartPickerModal({
  isOpen,
  onClose,
  onSelect,
  title = "Select Clipart or Photo",
}: ClipartPickerModalProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!isOpen) return null;

  const results = searchClipart(query, category);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      setUploadError(null);
      const fileName = await uploadImage(file);
      onSelect({ customUrl: imageUrl(fileName), name: file.name.replace(/\.[^/.]+$/, "") });
      onClose();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploading(false);
    }
  }

  const categories = [
    { id: "all", label: "All Items" },
    { id: "toys", label: "Toys & Play" },
    { id: "animals", label: "Animals" },
    { id: "fruits", label: "Fruits & Veg" },
    { id: "shapes", label: "Shapes & Nature" },
    { id: "objects", label: "School & Objects" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">{title}</h3>
              <p className="text-xs text-slate-500">
                High-contrast outline clipart optimized for clean printing & coloring
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="p-4 border-b border-slate-100 space-y-3 bg-white">
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clipart (e.g., balloon, cat, apple, star, car)..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  category === c.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Clipart Grid */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-50/30">
          {results.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm font-medium text-slate-500">No clipart found matching &quot;{query}&quot;</p>
              <p className="text-xs text-slate-400 mt-1">Try another keyword or upload a custom image below.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className="group flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-500 hover:shadow-md hover:scale-105 transition-all text-center text-slate-800"
                >
                  <div className="w-16 h-16 flex items-center justify-center text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {item.renderSvg(54)}
                  </div>
                  <span className="mt-2 text-xs font-semibold text-slate-700 truncate w-full">
                    {item.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer: Custom Upload Option */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <label className="btn btn-sm bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg">
            <Upload size={14} />
            <span>{uploading ? "Uploading..." : "Upload custom photo"}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={handleFileUpload}
            />
          </label>
          {uploadError && <span className="text-xs text-rose-600">{uploadError}</span>}
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
