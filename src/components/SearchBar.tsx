import { useState, useRef, useEffect } from "react";
import { Search, Loader2, X } from "lucide-react";

interface SearchBarProps {
  query: string;
  loading: boolean;
  /** 搜索视图（联网查询植物百科）是否激活：激活时显示「取消」按钮 */
  searching?: boolean;
  /** 搜索框下方的单行口径提示 */
  hint?: string;
  /** 值变化时聚焦输入框（从首页搜索入口跳转过来） */
  focusToken?: number;
  onSearch: (q: string) => void;
  /** 输入框聚焦时触发（进入「联网查询植物百科」视图） */
  onFocusSearch: () => void;
  /** 取消搜索，回到本地植物百科 */
  onCancel: () => void;
}

export function SearchBar({
  query,
  loading,
  searching = false,
  hint,
  focusToken = 0,
  onSearch,
  onFocusSearch,
  onCancel,
}: SearchBarProps) {
  const [localQuery, setLocalQuery] = useState(query);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  useEffect(() => {
    if (focusToken > 0) inputRef.current?.focus();
  }, [focusToken]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(localQuery);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setLocalQuery("");
    onSearch("");
    inputRef.current?.focus();
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2.5">
        <form onSubmit={handleSubmit} className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 rounded-2xl border border-sage-200 bg-white/80 px-3.5 py-2.5 transition-colors focus-within:border-sage-400">
            {loading ? (
              <Loader2 size={17} className="shrink-0 animate-spin text-sage-500" />
            ) : (
              <Search size={17} className="shrink-0 text-sage-500" />
            )}

            <input
              ref={inputRef}
              type="text"
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              onFocus={onFocusSearch}
              onClick={onFocusSearch}
              placeholder="搜索本地或联网植物百科…"
              className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-sage-400 focus:outline-none"
            />

            {localQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="shrink-0 rounded-full p-1 text-sage-400 transition-colors active:text-sage-600"
                aria-label="清除搜索"
              >
                <X size={15} />
              </button>
            )}

            <button
              type="submit"
              className="shrink-0 rounded-xl bg-sage-700 px-4 py-1.5 text-sm font-medium text-white transition-colors active:bg-sage-800"
            >
              搜索
            </button>
          </div>
        </form>

        {searching && (
          <button
            onClick={onCancel}
            className="shrink-0 text-sm text-sage-500 transition-colors active:text-sage-700"
          >
            取消
          </button>
        )}
      </div>

      {hint && (
        <p className="mt-2.5 px-1 text-xs leading-relaxed text-sage-500">
          {hint}
        </p>
      )}
    </div>
  );
}
