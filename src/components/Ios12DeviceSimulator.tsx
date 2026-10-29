import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  FileText,
  Bookmark as BookmarkIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  ChevronLeft,
  Volume2,
  Pause,
  Check,
  Trash2,
} from 'lucide-react';

export interface Chapter {
  id: number;
  name_arabic: string;
  name_simple: string;
  translated_name: { name: string } | string;
  verses_count: number;
  revelation_place: string;
}

interface WordInfo {
  position: number;
  arabic: string;
  translation: string;
  transliteration: string;
  audioURL?: string;
}

interface Verse {
  id: number;
  verseKey: string;
  arabic: string;
  translation: string;
  words?: WordInfo[];
}

interface BookmarkItem {
  verseKey: string;
  chapterName: string;
  arabic: string;
  translation: string;
  createdAt: string;
}

interface QuranResource {
  id: number;
  name: string;
  language_name: string;
  author_name: string;
  translated_name?: { name: string };
}

interface SearchResultItem {
  verseKey: string;
  arabic: string;
  translation: string;
}

function cleanHtmlText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<sup[^>]*>.*?<\/sup>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .trim();
}

export const Ios12DeviceSimulator: React.FC = () => {
  const [deviceIdiom, setDeviceIdiom] = useState<'iphone' | 'ipad'>('iphone');
  const [activeTab, setActiveTab] = useState<'surahs' | 'mushaf' | 'bookmarks' | 'search' | 'settings'>('surahs');

  // Persisted Settings (matching AppSettings in Models.swift)
  const [translationId, setTranslationId] = useState<number>(() => Number(localStorage.getItem('sim_translationID')) || 20);
  const [reciterId, setReciterId] = useState<number>(() => Number(localStorage.getItem('sim_reciterID')) || 7);
  const [tafsirId, setTafsirId] = useState<number>(() => Number(localStorage.getItem('sim_tafsirID')) || 169);
  const [arabicFontSize, setArabicFontSize] = useState<number>(() => Number(localStorage.getItem('sim_readingSize')) || 28);

  // Chapters & Navigation Stack
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [surahQuery, setSurahQuery] = useState('');
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [showingWords, setShowingWords] = useState(false);
  const [activeTafsir, setActiveTafsir] = useState<{ verseKey: string; resourceName: string; html: string } | null>(null);
  const [loadingTafsir, setLoadingTafsir] = useState(false);

  // Mushaf State
  const [mushafPage, setMushafPage] = useState<number>(() => Number(localStorage.getItem('sim_lastMushafPage')) || 1);
  const [pageJumpInput, setPageJumpInput] = useState<string>('1');
  const [showPageJumpModal, setShowPageJumpModal] = useState(false);

  // Bookmarks State
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() => {
    try {
      const saved = localStorage.getItem('sim_savedQuranBookmarks');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        verseKey: '1:1',
        chapterName: 'Al-Fatihah',
        arabic: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
        translation: 'In the name of Allāh, the Entirely Merciful, the Especially Merciful.',
        createdAt: new Date().toISOString(),
      },
      {
        verseKey: '2:255',
        chapterName: 'Al-Baqarah',
        arabic: 'ٱللَّهُ لَآ إِلَـٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ ۚ لَا تَأْخُذُهُۥ سِنَةٌ وَلَا نَوْمٌ',
        translation: 'Allāh - there is no deity except Him, the Ever-Living, the Sustainer of [all] existence. Neither drowsiness overtakes Him nor sleep.',
        createdAt: new Date().toISOString(),
      },
    ];
  });

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState('Enter a word or phrase to search the Quran.');

  // Catalogs State
  const [translationsCatalog, setTranslationsCatalog] = useState<QuranResource[]>([]);
  const [recitersCatalog, setRecitersCatalog] = useState<QuranResource[]>([]);
  const [tafsirsCatalog, setTafsirsCatalog] = useState<QuranResource[]>([]);
  const [activeCatalogModal, setActiveCatalogModal] = useState<'translations' | 'reciters' | 'tafsirs' | null>(null);
  const [catalogFilter, setCatalogFilter] = useState('');
  const [noticeModal, setNoticeModal] = useState<{ title: string; message: string } | null>(null);

  // Audio Player State
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingTrackTitle, setPlayingTrackTitle] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  // Load Bundled 114 Chapters & Catalogs on Mount
  useEffect(() => {
    fetch('/api/quran/bundled-chapters')
      .then((r) => r.json())
      .then((data) => {
        if (data.chapters) setChapters(data.chapters);
      })
      .catch(() => {
        fetch('https://api.quran.com/api/v4/chapters?language=en')
          .then((r) => r.json())
          .then((data) => {
            if (data.chapters) setChapters(data.chapters);
          });
      });

    fetch('/api/quran/bundled-catalog')
      .then((r) => r.json())
      .then((data) => {
        if (data.translations?.translations) setTranslationsCatalog(data.translations.translations);
        if (data.chapter_reciters?.reciters) setRecitersCatalog(data.chapter_reciters.reciters);
        if (data.tafsirs?.tafsirs) setTafsirsCatalog(data.tafsirs.tafsirs);
      })
      .catch(() => {});
  }, []);

  // Load Verses when a Chapter is selected
  useEffect(() => {
    if (!selectedChapter) return;
    let cancelled = false;
    setLoadingVerses(true);
    const params = new URLSearchParams({
      language: 'en',
      fields: 'text_uthmani',
      translations: String(translationId),
      per_page: '50',
      page: '1',
    });
    if (showingWords) {
      params.set('words', 'true');
      params.set('word_fields', 'text_uthmani,translation,transliteration,audio_url');
    }
    fetch(`https://api.quran.com/api/v4/verses/by_chapter/${selectedChapter.id}?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const rows = data.verses || [];
        const mapped: Verse[] = rows.map((row: any) => {
          const rawTrans = row.translations?.[0]?.text || '';
          const words: WordInfo[] = (row.words || [])
            .filter((w: any) => (w.char_type_name || 'word') === 'word')
            .map((w: any) => ({
              position: w.position || 0,
              arabic: w.text_uthmani || w.text || '',
              translation: cleanHtmlText(w.translation?.text || ''),
              transliteration: w.transliteration?.text || '',
              audioURL: w.audio_url || '',
            }));
          return {
            id: row.id,
            verseKey: row.verse_key,
            arabic: row.text_uthmani || '',
            translation: cleanHtmlText(rawTrans),
            words,
          };
        });
        setVerses(mapped);
        setLoadingVerses(false);
      })
      .catch(() => {
        if (!cancelled) setLoadingVerses(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedChapter, translationId, showingWords]);

  const playUrl = (url: string, label: string) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.onended = () => setIsAudioPlaying(false);
      audioRef.current.onpause = () => setIsAudioPlaying(false);
      audioRef.current.onplay = () => setIsAudioPlaying(true);
    }
    audioRef.current.src = url;
    setPlayingTrackTitle(label);
    audioRef.current.play().catch(() => {
      setNoticeModal({
        title: 'Audio Playback',
        message: 'Could not stream audio from CDN. Please verify your network connection.',
      });
    });
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  };

  const playChapterAudio = (chapter: Chapter) => {
    fetch(`https://api.quran.com/api/v4/chapter_recitations/${reciterId}/${chapter.id}`)
      .then((r) => r.json())
      .then((data) => {
        const path = data?.audio_file?.audio_url;
        if (!path) throw new Error('No audio URL');
        const full = path.startsWith('http') ? path : `https://audio.qurancdn.com/${path.replace(/^\//, '')}`;
        playUrl(full, `Surah ${chapter.name_simple}`);
      })
      .catch(() => {
        setNoticeModal({ title: 'Quran Reader', message: 'Recitation could not be started.' });
      });
  };

  const playVerseAudio = (verseKey: string) => {
    fetch(`https://api.quran.com/api/v4/verses/by_key/${verseKey}?audio=${reciterId}&fields=text_uthmani`)
      .then((r) => r.json())
      .then((data) => {
        const path = data?.verse?.audio?.url;
        if (!path) throw new Error('No verse audio');
        const full = path.startsWith('http') ? path : `https://audio.qurancdn.com/${path.replace(/^\//, '')}`;
        playUrl(full, `Ayah ${verseKey}`);
      })
      .catch(() => {
        setNoticeModal({ title: 'Quran Reader', message: 'Ayah recitation could not be started.' });
      });
  };

  const playWordAudio = (word: WordInfo) => {
    if (!word.audioURL) return;
    const full = word.audioURL.startsWith('http')
      ? word.audioURL
      : `https://audio.qurancdn.com/${word.audioURL.replace(/^\//, '')}`;
    playUrl(full, `Word · ${word.transliteration}`);
  };

  const openTafsir = (verseKey: string) => {
    setLoadingTafsir(true);
    setActiveTafsir({ verseKey, resourceName: 'Loading Tafsir…', html: '' });
    fetch(`https://api.quran.com/api/v4/tafsirs/${tafsirId}/by_ayah/${verseKey}`)
      .then((r) => r.json())
      .then((data) => {
        const text = data?.tafsir?.text || '<p>No tafsir text available for this ayah in the selected catalog.</p>';
        const name = data?.tafsir?.resource_name || 'Tafsir';
        setActiveTafsir({ verseKey, resourceName: name, html: text });
        setLoadingTafsir(false);
      })
      .catch(() => {
        setActiveTafsir({
          verseKey,
          resourceName: 'Tafsir',
          html: '<p>Tafsir could not be loaded. Check your connection.</p>',
        });
        setLoadingTafsir(false);
      });
  };

  const toggleBookmark = (verse: Verse) => {
    if (!selectedChapter) return;
    const exists = bookmarks.some((b) => b.verseKey === verse.verseKey);
    const updated = exists
      ? bookmarks.filter((b) => b.verseKey !== verse.verseKey)
      : [
          {
            verseKey: verse.verseKey,
            chapterName: selectedChapter.name_simple,
            arabic: verse.arabic,
            translation: verse.translation,
            createdAt: new Date().toISOString(),
          },
          ...bookmarks,
        ];
    setBookmarks(updated);
    localStorage.setItem('sim_savedQuranBookmarks', JSON.stringify(updated));
  };

  const runQuranSearch = (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearchStatus('Enter at least two characters to search.');
      return;
    }
    setSearching(true);
    setSearchStatus('Searching…');
    fetch(
      `https://api.quran.com/api/v4/search?q=${encodeURIComponent(trimmed)}&language=en&size=25&translations=${translationId}`
    )
      .then((r) => r.json())
      .then((data) => {
        const rows = data?.search?.results || [];
        const mapped: SearchResultItem[] = rows.map((item: any) => ({
          verseKey: item.verse_key,
          arabic: item.text || item.text_uthmani || '',
          translation: cleanHtmlText(item.translations?.[0]?.text || ''),
        }));
        setSearchResults(mapped);
        setSearching(false);
        if (mapped.length === 0) setSearchStatus('No results found.');
      })
      .catch(() => {
        setSearching(false);
        setSearchStatus('Search failed. Check your connection.');
      });
  };

  const filteredChapters = chapters.filter((c) => {
    if (!surahQuery.trim()) return true;
    const q = surahQuery.toLowerCase();
    const transName = typeof c.translated_name === 'string' ? c.translated_name : c.translated_name?.name || '';
    return (
      c.name_simple.toLowerCase().includes(q) ||
      transName.toLowerCase().includes(q) ||
      c.name_arabic.includes(q) ||
      String(c.id) === q
    );
  });

  const getResourceDisplayName = (list: QuranResource[], id: number, fallback: string) => {
    const found = list.find((item) => item.id === id);
    if (!found) return fallback;
    const base = found.translated_name?.name || found.name;
    return found.author_name && found.author_name !== base ? `${base} — ${found.author_name}` : base;
  };

  return (
    <div className="flex flex-col items-center">
      {/* Device Selector Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 w-full mb-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setDeviceIdiom('iphone')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              deviceIdiom === 'iphone' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            iPhone 8 · iOS 12.5.7
          </button>
          <button
            type="button"
            onClick={() => setDeviceIdiom('ipad')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              deviceIdiom === 'ipad' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            iPad mini 2 · iOS 12.5.7
          </button>
        </div>

        {playingTrackTitle && (
          <div className="flex items-center gap-2 text-xs text-emerald-900 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
            <button
              type="button"
              onClick={toggleAudio}
              className="font-semibold flex items-center gap-1 hover:text-emerald-700 whitespace-nowrap shrink-0"
            >
              {isAudioPlaying ? <Pause className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{playingTrackTitle}</span>
            </button>
          </div>
        )}
      </div>

      {/* Hardware Viewport Frame */}
      <div
        className={`relative bg-slate-900 rounded-[36px] p-3.5 shadow-xl border border-slate-800 transition-all duration-200 ${
          deviceIdiom === 'ipad' ? 'w-full max-w-[680px]' : 'w-full max-w-[390px]'
        }`}
      >
        {/* Top Speaker Cutout */}
        <div className="flex justify-center items-center gap-2 pb-2.5 pt-0.5">
          <div className="w-2 h-2 rounded-full bg-slate-800" />
          <div className="w-12 h-1.5 rounded-full bg-slate-800" />
        </div>

        {/* iOS 12 Screen Viewport */}
        <div
          className={`bg-white rounded-[22px] overflow-hidden flex flex-col border border-slate-700/40 relative ${
            deviceIdiom === 'ipad' ? 'h-[620px]' : 'h-[600px]'
          }`}
        >
          {/* iOS 12 Status Bar */}
          <div className="h-6 bg-[#FCFAF5] px-4 flex items-center justify-between text-[11px] font-medium text-slate-800 select-none shrink-0 border-b border-slate-200/60 tabular-nums">
            <span>iPad / iOS 12.5</span>
            <span className="font-semibold">9:41 AM</span>
            <span>100%</span>
          </div>

          {/* UINavigationBar */}
          <div className="h-11 bg-[#FCFAF5] border-b border-slate-200 px-3 flex items-center justify-between shrink-0">
            {activeTab === 'surahs' && activeTafsir ? (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTafsir(null)}
                  className="flex items-center gap-0.5 text-sm font-medium text-[#0D6E5C] hover:opacity-80 whitespace-nowrap shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>{selectedChapter?.name_simple || 'Back'}</span>
                </button>
                <span className="text-sm font-semibold text-slate-900 truncate px-2">
                  {activeTafsir.resourceName} ({activeTafsir.verseKey})
                </span>
                <span className="w-12" />
              </>
            ) : activeTab === 'surahs' && selectedChapter ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedChapter(null);
                    setShowingWords(false);
                  }}
                  className="flex items-center gap-0.5 text-sm font-medium text-[#0D6E5C] hover:opacity-80 whitespace-nowrap shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Surahs</span>
                </button>
                <span className="text-sm font-semibold text-slate-900 truncate">{selectedChapter.name_simple}</span>
                <div className="flex items-center gap-2.5 text-xs font-medium text-[#0D6E5C]">
                  <button
                    type="button"
                    onClick={() => setShowingWords((v) => !v)}
                    className="hover:underline whitespace-nowrap shrink-0"
                  >
                    {showingWords ? 'Hide words' : 'Words'}
                  </button>
                  <button
                    type="button"
                    onClick={() => playChapterAudio(selectedChapter)}
                    className="hover:underline whitespace-nowrap shrink-0"
                  >
                    Audio
                  </button>
                </div>
              </>
            ) : activeTab === 'mushaf' ? (
              <>
                <span className="w-12" />
                <span className="text-sm font-semibold text-slate-900">Mushaf</span>
                <button
                  type="button"
                  onClick={() => {
                    setPageJumpInput(String(mushafPage));
                    setShowPageJumpModal(true);
                  }}
                  className="text-xs font-medium text-[#0D6E5C] hover:underline whitespace-nowrap shrink-0"
                >
                  Go to…
                </button>
              </>
            ) : (
              <>
                <span className="w-8" />
                <span className="text-sm font-semibold text-slate-900">
                  {activeTab === 'surahs' && 'The Holy Quran'}
                  {activeTab === 'bookmarks' && 'Bookmarks'}
                  {activeTab === 'search' && 'Search Quran'}
                  {activeTab === 'settings' && 'Settings'}
                </span>
                <span className="w-8" />
              </>
            )}
          </div>

          {/* Main Tab Content Area */}
          <div className="flex-1 overflow-y-auto bg-white relative">
            {/* TAB 1: SURAHS / READER / TAFSIR */}
            {activeTab === 'surahs' && (
              <>
                {activeTafsir ? (
                  <div className="p-4 text-slate-800 space-y-3">
                    <div className="text-xs font-semibold text-slate-500">Verse {activeTafsir.verseKey}</div>
                    {loadingTafsir ? (
                      <div className="py-16 text-center text-sm text-slate-500">Loading tafsir from Quran.com API…</div>
                    ) : (
                      <div
                        className="prose prose-sm max-w-none text-slate-800 leading-relaxed space-y-2"
                        dangerouslySetInnerHTML={{ __html: activeTafsir.html }}
                      />
                    )}
                  </div>
                ) : selectedChapter ? (
                  <div>
                    {loadingVerses ? (
                      <div className="py-20 text-center text-sm text-slate-500">
                        Loading Surah {selectedChapter.name_simple}…
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-200">
                        {verses.map((verse) => {
                          const isSaved = bookmarks.some((b) => b.verseKey === verse.verseKey);
                          return (
                            <div key={verse.verseKey} className="p-4 space-y-3">
                              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 tabular-nums">
                                <span>{verse.verseKey}</span>
                                <span>{selectedChapter.name_simple}</span>
                              </div>
                              <p
                                dir="rtl"
                                className="font-arabic text-right text-slate-900 leading-[1.95]"
                                style={{ fontSize: `${arabicFontSize}px` }}
                              >
                                {verse.arabic}
                              </p>

                              {showingWords && verse.words && verse.words.length > 0 && (
                                <div className="space-y-1.5 pt-1">
                                  {verse.words.map((w) => (
                                    <button
                                      key={w.position}
                                      type="button"
                                      onClick={() => playWordAudio(w)}
                                      className="w-full text-right px-2.5 py-1.5 rounded bg-slate-100 hover:bg-emerald-50 text-xs text-slate-700 transition-colors block"
                                    >
                                      <span className="font-arabic text-base text-slate-900">{w.arabic}</span>
                                      <span> · {w.transliteration} · </span>
                                      <span className="text-slate-600">{w.translation}</span>
                                    </button>
                                  ))}
                                </div>
                              )}

                              <p
                                className="text-slate-700 leading-relaxed"
                                style={{ fontSize: `${Math.max(14, arabicFontSize - 12)}px` }}
                              >
                                {verse.translation}
                              </p>

                              <div className="flex items-center gap-4 pt-1 text-xs font-medium text-[#0D6E5C]">
                                <button
                                  type="button"
                                  onClick={() => toggleBookmark(verse)}
                                  className="hover:underline whitespace-nowrap shrink-0"
                                >
                                  {isSaved ? '✓ Bookmarked' : '☆ Bookmark'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => playVerseAudio(verse.verseKey)}
                                  className="hover:underline whitespace-nowrap shrink-0"
                                >
                                  Play ayah
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openTafsir(verse.verseKey)}
                                  className="hover:underline whitespace-nowrap shrink-0"
                                >
                                  Tafsir
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {/* UISearchBar */}
                    <div className="p-2.5 bg-[#F4F2ED] border-b border-slate-200 sticky top-0 z-10">
                      <input
                        type="text"
                        value={surahQuery}
                        onChange={(e) => setSurahQuery(e.target.value)}
                        placeholder="Search surahs (e.g., Yasin, Kahf, 36)"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0D6E5C]"
                      />
                    </div>
                    <div className="divide-y divide-slate-200">
                      {filteredChapters.map((ch) => {
                        const trans =
                          typeof ch.translated_name === 'string'
                            ? ch.translated_name
                            : ch.translated_name?.name || ch.name_simple;
                        return (
                          <button
                            key={ch.id}
                            type="button"
                            onClick={() => setSelectedChapter(ch)}
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-7 text-xs font-semibold text-slate-400 tabular-nums shrink-0">
                                {ch.id}
                              </span>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-slate-900 truncate">{ch.name_simple}</div>
                                <div className="text-[11px] text-slate-500 truncate tabular-nums">
                                  {trans} · {ch.verses_count} verses ·{' '}
                                  {ch.revelation_place.charAt(0).toUpperCase() + ch.revelation_place.slice(1)}
                                </div>
                              </div>
                            </div>
                            <span className="font-arabic text-xl text-slate-900 shrink-0 pl-3">{ch.name_arabic}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* TAB 2: MUSHAF (604 MADANI PAGES) */}
            {activeTab === 'mushaf' && (
              <div className="h-full flex flex-col justify-between bg-[#F5F0DD] p-2">
                <div className="flex-1 flex items-center justify-center overflow-hidden bg-[#FAF6E8] rounded border border-amber-900/15 relative">
                  <img
                    key={mushafPage}
                    src={`/api/quran/mushaf-page/${mushafPage}`}
                    alt={`Madani Mushaf Page ${mushafPage}`}
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain select-none"
                  />
                </div>
                <div className="pt-2 px-3 pb-1 flex items-center justify-between text-xs font-semibold text-[#0D6E5C] shrink-0">
                  <button
                    type="button"
                    disabled={mushafPage <= 1}
                    onClick={() => {
                      const next = Math.max(1, mushafPage - 1);
                      setMushafPage(next);
                      localStorage.setItem('sim_lastMushafPage', String(next));
                    }}
                    className="disabled:opacity-40 hover:underline whitespace-nowrap shrink-0"
                  >
                    ‹ Previous
                  </button>
                  <span className="text-slate-800 tabular-nums">Page {mushafPage} of 604</span>
                  <button
                    type="button"
                    disabled={mushafPage >= 604}
                    onClick={() => {
                      const next = Math.min(604, mushafPage + 1);
                      setMushafPage(next);
                      localStorage.setItem('sim_lastMushafPage', String(next));
                    }}
                    className="disabled:opacity-40 hover:underline whitespace-nowrap shrink-0"
                  >
                    Next ›
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: BOOKMARKS */}
            {activeTab === 'bookmarks' && (
              <div>
                {bookmarks.length === 0 ? (
                  <div className="py-24 px-6 text-center text-xs text-slate-500 leading-relaxed">
                    No bookmarked verses yet. Tap “☆ Bookmark” on any verse while reading to save it here.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {bookmarks.map((b) => (
                      <div key={b.verseKey} className="p-4 space-y-2 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              const chId = Number(b.verseKey.split(':')[0]) || 1;
                              const target = chapters.find((c) => c.id === chId);
                              if (target) {
                                setSelectedChapter(target);
                                setActiveTafsir(null);
                                setActiveTab('surahs');
                              }
                            }}
                            className="text-xs font-semibold text-[#0D6E5C] hover:underline tabular-nums"
                          >
                            {b.chapterName} · {b.verseKey}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const next = bookmarks.filter((item) => item.verseKey !== b.verseKey);
                              setBookmarks(next);
                              localStorage.setItem('sim_savedQuranBookmarks', JSON.stringify(next));
                            }}
                            className="text-slate-400 hover:text-red-600 p-1"
                            title="Delete bookmark"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p dir="rtl" className="font-arabic text-xl text-right text-slate-900 leading-relaxed">
                          {b.arabic}
                        </p>
                        <p className="text-xs text-slate-700 leading-relaxed line-clamp-3">{b.translation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: SEARCH QURAN */}
            {activeTab === 'search' && (
              <div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    runQuranSearch(searchQuery);
                  }}
                  className="p-2.5 bg-[#F4F2ED] border-b border-slate-200 flex gap-2 sticky top-0 z-10"
                >
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search translation or Arabic (e.g. mercy, light)"
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0D6E5C]"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-[#0D6E5C] text-white text-xs font-medium rounded-md hover:bg-emerald-800 whitespace-nowrap shrink-0"
                  >
                    Search
                  </button>
                </form>

                {searching || searchResults.length === 0 ? (
                  <div className="py-20 px-6 text-center text-xs text-slate-500">{searchStatus}</div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {searchResults.map((res) => (
                      <button
                        key={res.verseKey}
                        type="button"
                        onClick={() => {
                          const chId = Number(res.verseKey.split(':')[0]) || 1;
                          const target = chapters.find((c) => c.id === chId);
                          if (target) {
                            setSelectedChapter(target);
                            setActiveTafsir(null);
                            setActiveTab('surahs');
                          }
                        }}
                        className="w-full p-4 text-left space-y-2 hover:bg-slate-50 transition-colors block"
                      >
                        <div className="text-xs font-semibold text-[#0D6E5C] tabular-nums">Verse {res.verseKey}</div>
                        <p dir="rtl" className="font-arabic text-lg text-right text-slate-900">
                          {res.arabic}
                        </p>
                        <p className="text-xs text-slate-700 leading-relaxed">{res.translation}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: SETTINGS */}
            {activeTab === 'settings' && (
              <div className="bg-[#F4F2ED] min-h-full py-3 space-y-5 text-xs">
                <div>
                  <div className="px-4 pb-1.5 text-[11px] font-semibold text-slate-500">Reading catalogs</div>
                  <div className="bg-white border-y border-slate-200 divide-y divide-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setCatalogFilter('');
                        setActiveCatalogModal('translations');
                      }}
                      className="w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-slate-50"
                    >
                      <div>
                        <div className="font-medium text-slate-900">Translation</div>
                        <div className="text-[11px] text-slate-500 tabular-nums">
                          {getResourceDisplayName(translationsCatalog, translationId, `Resource ${translationId}`)} ·{' '}
                          {translationsCatalog.length} catalog entries
                        </div>
                      </div>
                      <span className="text-slate-400">›</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCatalogFilter('');
                        setActiveCatalogModal('reciters');
                      }}
                      className="w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-slate-50"
                    >
                      <div>
                        <div className="font-medium text-slate-900">Reciter</div>
                        <div className="text-[11px] text-slate-500 tabular-nums">
                          {getResourceDisplayName(recitersCatalog, reciterId, `Reciter ${reciterId}`)} ·{' '}
                          {recitersCatalog.length} catalog entries
                        </div>
                      </div>
                      <span className="text-slate-400">›</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCatalogFilter('');
                        setActiveCatalogModal('tafsirs');
                      }}
                      className="w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-slate-50"
                    >
                      <div>
                        <div className="font-medium text-slate-900">Tafsir</div>
                        <div className="text-[11px] text-slate-500 tabular-nums">
                          {getResourceDisplayName(tafsirsCatalog, tafsirId, `Tafsir ${tafsirId}`)} ·{' '}
                          {tafsirsCatalog.length} catalog entries
                        </div>
                      </div>
                      <span className="text-slate-400">›</span>
                    </button>

                    <div className="px-4 py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-900">Arabic text size</div>
                        <div className="text-[11px] text-slate-500 tabular-nums">{arabicFontSize} pt</div>
                      </div>
                      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded">
                        {[24, 28, 34].map((pt) => (
                          <button
                            key={pt}
                            type="button"
                            onClick={() => {
                              setArabicFontSize(pt);
                              localStorage.setItem('sim_readingSize', String(pt));
                            }}
                            className={`px-2 py-1 rounded text-[11px] font-medium tabular-nums ${
                              arabicFontSize === pt ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                            }`}
                          >
                            {pt}pt
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="px-4 pb-1.5 text-[11px] font-semibold text-slate-500">Offline Quran &amp; About</div>
                  <div className="bg-white border-y border-slate-200 divide-y divide-slate-200">
                    <button
                      type="button"
                      onClick={() =>
                        setNoticeModal({
                          title: 'About & data sources',
                          message:
                            'Quran text, translation catalogs, tafsir, and recitation catalogs are loaded from Quran.com API services. Madani Mushaf page images stream from files.quran.app. Bundled seed data includes all 114 Surah headers, catalog indexes, and opening Mushaf pages.',
                        })
                      }
                      className="w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-slate-50"
                    >
                      <div>
                        <div className="font-medium text-slate-900">About &amp; data sources</div>
                        <div className="text-[11px] text-slate-500">Service, page-image and attribution information</div>
                      </div>
                      <span className="text-slate-400">›</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setNoticeModal({
                          title: 'Open-source license',
                          message:
                            'This app source is free software under GNU GPL version 3. You may redistribute and modify it under that license.',
                        })
                      }
                      className="w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-slate-50"
                    >
                      <div>
                        <div className="font-medium text-slate-900">Open-source license</div>
                        <div className="text-[11px] text-slate-500">GNU GPL version 3</div>
                      </div>
                      <span className="text-slate-400">›</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Catalog Picker Modal (ResourcePickerViewController) */}
            {activeCatalogModal && (
              <div className="absolute inset-0 bg-white z-20 flex flex-col">
                <div className="h-10 bg-[#FCFAF5] border-b border-slate-200 px-3 flex items-center justify-between shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveCatalogModal(null)}
                    className="text-xs font-medium text-[#0D6E5C]"
                  >
                    Cancel
                  </button>
                  <span className="text-xs font-semibold text-slate-900">
                    {activeCatalogModal === 'translations' && 'Choose translation'}
                    {activeCatalogModal === 'reciters' && 'Choose reciter'}
                    {activeCatalogModal === 'tafsirs' && 'Choose tafsir'}
                  </span>
                  <span className="w-10" />
                </div>
                <div className="p-2 bg-[#F4F2ED] border-b border-slate-200 shrink-0">
                  <input
                    type="text"
                    value={catalogFilter}
                    onChange={(e) => setCatalogFilter(e.target.value)}
                    placeholder="Search the full catalog"
                    className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs"
                  />
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
                  {(activeCatalogModal === 'translations'
                    ? translationsCatalog
                    : activeCatalogModal === 'reciters'
                    ? recitersCatalog
                    : tafsirsCatalog
                  )
                    .filter((r) => {
                      if (!catalogFilter.trim()) return true;
                      const q = catalogFilter.toLowerCase();
                      return (
                        r.name.toLowerCase().includes(q) ||
                        (r.language_name || '').toLowerCase().includes(q) ||
                        (r.author_name || '').toLowerCase().includes(q)
                      );
                    })
                    .map((item) => {
                      const currentSelected =
                        activeCatalogModal === 'translations'
                          ? translationId
                          : activeCatalogModal === 'reciters'
                          ? reciterId
                          : tafsirId;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            if (activeCatalogModal === 'translations') {
                              setTranslationId(item.id);
                              localStorage.setItem('sim_translationID', String(item.id));
                            } else if (activeCatalogModal === 'reciters') {
                              setReciterId(item.id);
                              localStorage.setItem('sim_reciterID', String(item.id));
                            } else {
                              setTafsirId(item.id);
                              localStorage.setItem('sim_tafsirID', String(item.id));
                            }
                            setActiveCatalogModal(null);
                          }}
                          className="w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-slate-50"
                        >
                          <div className="pr-2">
                            <div className="text-xs font-medium text-slate-900">
                              {item.translated_name?.name || item.name}
                            </div>
                            <div className="text-[11px] text-slate-500 tabular-nums">
                              {(item.language_name || 'Standard').charAt(0).toUpperCase() +
                                (item.language_name || 'Standard').slice(1)}{' '}
                              · ID {item.id}
                            </div>
                          </div>
                          {item.id === currentSelected && <Check className="w-4 h-4 text-[#0D6E5C] shrink-0" />}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Go to Mushaf Page Alert Modal */}
            {showPageJumpModal && (
              <div className="absolute inset-0 bg-black/40 z-30 flex items-center justify-center p-6">
                <div className="bg-white rounded-xl w-64 overflow-hidden shadow-lg border border-slate-200 text-center">
                  <div className="p-4 space-y-2">
                    <div className="text-sm font-semibold text-slate-900">Go to Mushaf page</div>
                    <div className="text-xs text-slate-600">Enter a page number from 1 to 604.</div>
                    <input
                      type="number"
                      min={1}
                      max={604}
                      value={pageJumpInput}
                      onChange={(e) => setPageJumpInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm text-center tabular-nums"
                    />
                  </div>
                  <div className="grid grid-cols-2 border-t border-slate-200 divide-x divide-slate-200 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setShowPageJumpModal(false)}
                      className="py-2.5 text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const target = Math.max(1, Math.min(604, Number(pageJumpInput) || 1));
                        setMushafPage(target);
                        localStorage.setItem('sim_lastMushafPage', String(target));
                        setShowPageJumpModal(false);
                      }}
                      className="py-2.5 text-[#0D6E5C] font-semibold hover:bg-slate-50"
                    >
                      Go
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* UIAlertController Notice Modal */}
            {noticeModal && (
              <div className="absolute inset-0 bg-black/40 z-30 flex items-center justify-center p-6">
                <div className="bg-white rounded-xl w-64 overflow-hidden shadow-lg border border-slate-200 text-center">
                  <div className="p-4 space-y-1.5">
                    <div className="text-sm font-semibold text-slate-900">{noticeModal.title}</div>
                    <div className="text-xs text-slate-600 leading-relaxed">{noticeModal.message}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNoticeModal(null)}
                    className="w-full py-2.5 border-t border-slate-200 text-xs font-semibold text-[#0D6E5C] hover:bg-slate-50"
                  >
                    OK
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* UITabBar (MainTabBarController) */}
          <div className="h-12 bg-[#FCFAF5] border-t border-slate-200 grid grid-cols-5 shrink-0 select-none">
            {[
              { id: 'surahs', label: 'Surahs', Icon: BookOpen },
              { id: 'mushaf', label: 'Mushaf', Icon: FileText },
              { id: 'bookmarks', label: 'Bookmarks', Icon: BookmarkIcon },
              { id: 'search', label: 'Search', Icon: SearchIcon },
              { id: 'settings', label: 'Settings', Icon: SettingsIcon },
            ].map(({ id, label, Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id as any)}
                  className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    active ? 'text-[#0D6E5C]' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[10px] font-medium whitespace-nowrap">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Home Button (Touch ID Ring) */}
        <div className="pt-2.5 pb-0.5 flex justify-center">
          <button
            type="button"
            onClick={() => {
              setSelectedChapter(null);
              setActiveTafsir(null);
              setActiveTab('surahs');
            }}
            title="Home Button"
            className="w-9 h-9 rounded-full border-2 border-slate-700 bg-slate-950 hover:border-slate-500 transition-colors"
          />
        </div>
      </div>
    </div>
  );
};
