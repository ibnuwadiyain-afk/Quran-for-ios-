import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  FileText,
  Bookmark as BookmarkIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  Volume2,
  Pause,
  Check,
  Trash2,
  Globe,
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

export type AppLangCode = 'en' | 'ar' | 'id' | 'tr' | 'ur' | 'fr' | 'ru' | 'es' | 'bn';

export const APP_LANGUAGES: { code: AppLangCode; label: string; nativeLabel: string; rtl?: boolean }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية (Arabic)', rtl: true },
  { code: 'id', label: 'Indonesian', nativeLabel: 'Bahasa Indonesia' },
  { code: 'tr', label: 'Turkish', nativeLabel: 'Türkçe (Turkish)' },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اردو (Urdu)', rtl: true },
  { code: 'fr', label: 'French', nativeLabel: 'Français (French)' },
  { code: 'ru', label: 'Russian', nativeLabel: 'Русский (Russian)' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español (Spanish)' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা (Bengali)' },
];

const UI_STRINGS: Record<AppLangCode, Record<string, string>> = {
  en: {
    'app.title': 'The Holy Quran',
    'tab.surahs': 'Surahs',
    'tab.mushaf': 'Mushaf',
    'tab.bookmarks': 'Bookmarks',
    'tab.search': 'Search',
    'tab.settings': 'Settings',
    'common.ok': 'OK',
    'common.cancel': 'Cancel',
    'common.go': 'Go',
    'surahs.search_placeholder': 'Search surahs',
    'surahs.verses': 'verses',
    'reader.audio': 'Audio',
    'reader.words': 'Words',
    'reader.hide_words': 'Hide words',
    'reader.play_ayah': 'Play ayah',
    'reader.tafsir': 'Tafsir',
    'reader.bookmark': '☆ Bookmark',
    'reader.bookmarked': '✓ Bookmarked',
    'mushaf.title': 'Mushaf',
    'mushaf.previous': '‹ Previous',
    'mushaf.next': 'Next ›',
    'mushaf.go_to': 'Go to…',
    'mushaf.page_of': 'Page {page} of 604',
    'mushaf.jump_title': 'Go to Mushaf page',
    'mushaf.jump_message': 'Enter a page number from 1 to 604.',
    'bookmarks.empty': 'No bookmarked verses yet. Tap “☆ Bookmark” on any verse while reading to save it here.',
    'search.title': 'Search Quran',
    'search.placeholder': 'Search translation or Arabic',
    'search.prompt': 'Enter a word or phrase to search the Quran.',
    'search.min_chars': 'Enter at least two characters to search.',
    'search.searching': 'Searching…',
    'search.no_results': 'No results found.',
    'search.verse': 'Verse',
    'catalog.search_placeholder': 'Search the full catalog',
    'settings.section.reading': 'Reading & Language',
    'settings.section.offline': 'Offline Quran & About',
    'settings.language': 'App language',
    'settings.choose_language': 'Choose app language',
    'settings.translation': 'Translation',
    'settings.choose_translation': 'Choose translation',
    'settings.reciter': 'Reciter',
    'settings.choose_reciter': 'Choose reciter',
    'settings.tafsir': 'Tafsir',
    'settings.choose_tafsir': 'Choose tafsir',
    'settings.catalog_entries': 'catalog entries',
    'settings.arabic_size': 'Arabic text size',
    'settings.about.sources_title': 'About & data sources',
    'settings.about.sources_subtitle': 'Service, page-image and attribution information',
    'settings.about.license_title': 'Open-source license',
    'settings.about.license_subtitle': 'GNU GPL version 3',
  },
  ar: {
    'app.title': 'القرآن الكريم',
    'tab.surahs': 'السور',
    'tab.mushaf': 'المصحف',
    'tab.bookmarks': 'الفواصل',
    'tab.search': 'بحث',
    'tab.settings': 'الإعدادات',
    'common.ok': 'حسناً',
    'common.cancel': 'إلغاء',
    'common.go': 'انتقال',
    'surahs.search_placeholder': 'ابحث عن سورة',
    'surahs.verses': 'آية',
    'reader.audio': 'تلاوة',
    'reader.words': 'الكلمات',
    'reader.hide_words': 'إخفاء الكلمات',
    'reader.play_ayah': 'استماع للآية',
    'reader.tafsir': 'التفسير',
    'reader.bookmark': '☆ حفظ فاصلة',
    'reader.bookmarked': '✓ محفوظة',
    'mushaf.title': 'المصحف الشريف',
    'mushaf.previous': '‹ السابقة',
    'mushaf.next': 'التالية ›',
    'mushaf.go_to': 'انتقال…',
    'mushaf.page_of': 'صفحة {page} من 604',
    'mushaf.jump_title': 'الانتقال إلى صفحة',
    'mushaf.jump_message': 'أدخل رقم الصفحة من 1 إلى 604.',
    'bookmarks.empty': 'لا توجد آيات محفوظة بعد. اضغط على «☆ حفظ فاصلة» أسفل أي آية لحفظها هنا.',
    'search.title': 'البحث في القرآن',
    'search.placeholder': 'ابحث في النص القرآني أو الترجمة',
    'search.prompt': 'أدخل كلمة أو عبارة للبحث في القرآن الكريم.',
    'search.min_chars': 'أدخل حرفين على الأقل للبحث.',
    'search.searching': 'جاري البحث…',
    'search.no_results': 'لم يتم العثور على نتائج.',
    'search.verse': 'آية',
    'catalog.search_placeholder': 'ابحث في القائمة الكاملة',
    'settings.section.reading': 'القراءة واللغة',
    'settings.section.offline': 'القرآن بدون إنترنت وحول التطبيق',
    'settings.language': 'لغة التطبيق',
    'settings.choose_language': 'اختر لغة التطبيق',
    'settings.translation': 'الترجمة',
    'settings.choose_translation': 'اختر الترجمة',
    'settings.reciter': 'القارئ',
    'settings.choose_reciter': 'اختر القارئ',
    'settings.tafsir': 'التفسير',
    'settings.choose_tafsir': 'اختر التفسير',
    'settings.catalog_entries': 'في القائمة',
    'settings.arabic_size': 'حجم الخط العربي',
    'settings.about.sources_title': 'حول التطبيق ومصادر البيانات',
    'settings.about.sources_subtitle': 'معلومات الخدمة وصور صفحات المصحف والتوثيق',
    'settings.about.license_title': 'ترخيص المصدر المفتوح',
    'settings.about.license_subtitle': 'رخصة جنو العمومية الإصدار 3 (GPLv3)',
  },
  id: {
    'app.title': "Al-Qur'an Al-Karim",
    'tab.surahs': 'Surah',
    'tab.mushaf': 'Mushaf',
    'tab.bookmarks': 'Penanda',
    'tab.search': 'Cari',
    'tab.settings': 'Pengaturan',
    'common.ok': 'OK',
    'common.cancel': 'Batal',
    'common.go': 'Buka',
    'surahs.search_placeholder': 'Cari surah',
    'surahs.verses': 'ayat',
    'reader.audio': 'Audio',
    'reader.words': 'Per Kata',
    'reader.hide_words': 'Sembunyikan Kata',
    'reader.play_ayah': 'Putar ayat',
    'reader.tafsir': 'Tafsir',
    'reader.bookmark': '☆ Tandai',
    'reader.bookmarked': '✓ Ditandai',
    'mushaf.title': 'Mushaf',
    'mushaf.previous': '‹ Sebelumnya',
    'mushaf.next': 'Berikutnya ›',
    'mushaf.go_to': 'Ke Hal…',
    'mushaf.page_of': 'Halaman {page} dari 604',
    'mushaf.jump_title': 'Buka Halaman Mushaf',
    'mushaf.jump_message': 'Masukkan nomor halaman dari 1 hingga 604.',
    'bookmarks.empty': 'Belum ada ayat yang ditandai. Ketuk “☆ Tandai” pada ayat saat membaca untuk menyimpannya.',
    'search.title': "Cari Al-Qur'an",
    'search.placeholder': 'Cari terjemahan atau teks Arab',
    'search.prompt': "Masukkan kata atau frasa untuk mencari di Al-Qur'an.",
    'search.min_chars': 'Masukkan minimal dua karakter untuk mencari.',
    'search.searching': 'Mencari…',
    'search.no_results': 'Tidak ada hasil ditemukan.',
    'search.verse': 'Ayat',
    'catalog.search_placeholder': 'Cari di katalog lengkap',
    'settings.section.reading': 'Bacaan & Bahasa',
    'settings.section.offline': "Al-Qur'an Offline & Tentang",
    'settings.language': 'Bahasa aplikasi',
    'settings.choose_language': 'Pilih bahasa aplikasi',
    'settings.translation': 'Terjemahan',
    'settings.choose_translation': 'Pilih terjemahan',
    'settings.reciter': 'Qari',
    'settings.choose_reciter': 'Pilih qari',
    'settings.tafsir': 'Tafsir',
    'settings.choose_tafsir': 'Pilih tafsir',
    'settings.catalog_entries': 'entri katalog',
    'settings.arabic_size': 'Ukuran teks Arab',
    'settings.about.sources_title': 'Tentang & sumber data',
    'settings.about.sources_subtitle': 'Informasi layanan, gambar halaman, dan atribusi',
    'settings.about.license_title': 'Lisensi sumber terbuka',
    'settings.about.license_subtitle': 'GNU GPL versi 3',
  },
  tr: {
    'app.title': "Kur'an-ı Kerim",
    'tab.surahs': 'Sureler',
    'tab.mushaf': 'Mushaf',
    'tab.bookmarks': 'Yer İmleri',
    'tab.search': 'Arama',
    'tab.settings': 'Ayarlar',
    'common.ok': 'Tamam',
    'common.cancel': 'İptal',
    'common.go': 'Git',
    'surahs.search_placeholder': 'Sure ara',
    'surahs.verses': 'ayet',
    'reader.audio': 'Ses',
    'reader.words': 'Kelimeler',
    'reader.hide_words': 'Kelimeleri gizle',
    'reader.play_ayah': 'Ayeti dinle',
    'reader.tafsir': 'Tefsir',
    'reader.bookmark': '☆ Yer İmi',
    'reader.bookmarked': '✓ Kaydedildi',
    'mushaf.title': 'Mushaf',
    'mushaf.previous': '‹ Önceki',
    'mushaf.next': 'Sonraki ›',
    'mushaf.go_to': 'Sayfaya git…',
    'mushaf.page_of': 'Sayfa {page} / 604',
    'mushaf.jump_title': 'Mushaf sayfasına git',
    'mushaf.jump_message': '1 ile 604 arasında bir sayfa numarası girin.',
    'bookmarks.empty': 'Henüz kaydedilmiş ayet yok. Kaydetmek için okurken herhangi bir ayette “☆ Yer İmi”ne dokunun.',
    'search.title': "Kur'an'da Ara",
    'search.placeholder': 'Meal veya Arapça ara',
    'search.prompt': "Kur'an'da aramak için bir kelime veya ifade girin.",
    'search.min_chars': 'Aramak için en az iki karakter girin.',
    'search.searching': 'Aranıyor…',
    'search.no_results': 'Sonuç bulunamadı.',
    'search.verse': 'Ayet',
    'catalog.search_placeholder': 'Tüm katalogda ara',
    'settings.section.reading': 'Okuma ve Dil',
    'settings.section.offline': "Çevrimdışı Kur'an ve Hakkında",
    'settings.language': 'Uygulama dili',
    'settings.choose_language': 'Uygulama dilini seçin',
    'settings.translation': 'Meal / Çeviri',
    'settings.choose_translation': 'Meal seçin',
    'settings.reciter': 'Kari (Okuyucu)',
    'settings.choose_reciter': 'Kari seçin',
    'settings.tafsir': 'Tefsir',
    'settings.choose_tafsir': 'Tefsir seçin',
    'settings.catalog_entries': 'katalog kaydı',
    'settings.arabic_size': 'Arapça yazı boyutu',
    'settings.about.sources_title': 'Hakkında ve veri kaynakları',
    'settings.about.sources_subtitle': 'Servis, sayfa görselleri ve kaynak bilgileri',
    'settings.about.license_title': 'Açık kaynak lisansı',
    'settings.about.license_subtitle': 'GNU GPL sürüm 3',
  },
  ur: {
    'app.title': 'قرآنِ کریم',
    'tab.surahs': 'سورتیں',
    'tab.mushaf': 'مصحف',
    'tab.bookmarks': 'نشانیاں',
    'tab.search': 'تلاش',
    'tab.settings': 'ترتیبات',
    'common.ok': 'ٹھیک ہے',
    'common.cancel': 'منسوخ',
    'common.go': 'جائیں',
    'surahs.search_placeholder': 'سورت تلاش کریں',
    'surahs.verses': 'آیات',
    'reader.audio': 'تلاوت',
    'reader.words': 'الفاظ',
    'reader.hide_words': 'الفاظ چھپائیں',
    'reader.play_ayah': 'آیت سنیں',
    'reader.tafsir': 'تفسیر',
    'reader.bookmark': '☆ نشانی لگائیں',
    'reader.bookmarked': '✓ محفوظ شدہ',
    'mushaf.title': 'مصحف شریف',
    'mushaf.previous': '‹ پچھلا',
    'mushaf.next': 'اگلا ›',
    'mushaf.go_to': 'صفحہ پر…',
    'mushaf.page_of': 'صفحہ {page} از 604',
    'mushaf.jump_title': 'مصحف کے صفحے پر جائیں',
    'mushaf.jump_message': '1 سے 604 کے درمیان صفحہ نمبر درج کریں۔',
    'bookmarks.empty': 'ابھی تک کوئی آیت محفوظ نہیں کی گئی۔ مطالعہ کے دوران کسی بھی آیت پر “☆ نشانی لگائیں” دبائیں۔',
    'search.title': 'قرآن میں تلاش',
    'search.placeholder': 'ترجمہ یا عربی تلاش کریں',
    'search.prompt': 'قرآن میں تلاش کے لیے کوئی لفظ یا جملہ لکھیں۔',
    'search.min_chars': 'تلاش کے لیے کم از کم دو حروف درج کریں۔',
    'search.searching': 'تلاش جاری ہے…',
    'search.no_results': 'کوئی نتیجہ نہیں ملا۔',
    'search.verse': 'آیت',
    'catalog.search_placeholder': 'مکمل فہرست میں تلاش کریں',
    'settings.section.reading': 'مطالعہ اور زبان',
    'settings.section.offline': 'آف لائن قرآن اور تعارف',
    'settings.language': 'ایپ کی زبان',
    'settings.choose_language': 'ایپ کی زبان منتخب کریں',
    'settings.translation': 'ترجمہ',
    'settings.choose_translation': 'ترجمہ منتخب کریں',
    'settings.reciter': 'قاری',
    'settings.choose_reciter': 'قاری منتخب کریں',
    'settings.tafsir': 'تفسیر',
    'settings.choose_tafsir': 'تفسیر منتخب کریں',
    'settings.catalog_entries': 'فہرست میں موجود',
    'settings.arabic_size': 'عربی خط کا سائز',
    'settings.about.sources_title': 'تعارف اور ڈیٹا کے ذرائع',
    'settings.about.sources_subtitle': 'سروس، مصحف صفحات اور حوالہ جات کی معلومات',
    'settings.about.license_title': 'اوپن سورس لائسنس',
    'settings.about.license_subtitle': 'GNU GPL ورژن 3',
  },
  fr: {
    'app.title': 'Le Noble Coran',
    'tab.surahs': 'Sourates',
    'tab.mushaf': 'Mushaf',
    'tab.bookmarks': 'Favoris',
    'tab.search': 'Recherche',
    'tab.settings': 'Réglages',
    'common.ok': 'OK',
    'common.cancel': 'Annuler',
    'common.go': 'Aller',
    'surahs.search_placeholder': 'Rechercher une sourate',
    'surahs.verses': 'versets',
    'reader.audio': 'Audio',
    'reader.words': 'Mots',
    'reader.hide_words': 'Masquer mots',
    'reader.play_ayah': 'Écouter le verset',
    'reader.tafsir': 'Tafsir',
    'reader.bookmark': '☆ Favori',
    'reader.bookmarked': '✓ Enregistré',
    'mushaf.title': 'Mushaf',
    'mushaf.previous': '‹ Précédent',
    'mushaf.next': 'Suivant ›',
    'mushaf.go_to': 'Aller à…',
    'mushaf.page_of': 'Page {page} sur 604',
    'mushaf.jump_title': 'Aller à la page du Mushaf',
    'mushaf.jump_message': 'Entrez un numéro de page entre 1 et 604.',
    'bookmarks.empty': 'Aucun verset enregistré. Touchez « ☆ Favori » sous un verset pour le sauvegarder.',
    'search.title': 'Rechercher dans le Coran',
    'search.placeholder': 'Rechercher une traduction ou en arabe',
    'search.prompt': 'Entrez un mot ou une phrase pour rechercher dans le Coran.',
    'search.min_chars': 'Entrez au moins deux caractères.',
    'search.searching': 'Recherche en cours…',
    'search.no_results': 'Aucun résultat trouvé.',
    'search.verse': 'Verset',
    'catalog.search_placeholder': 'Rechercher dans le catalogue',
    'settings.section.reading': 'Lecture et langue',
    'settings.section.offline': 'Coran hors ligne et À propos',
    'settings.language': 'Langue de l’application',
    'settings.choose_language': 'Choisir la langue',
    'settings.translation': 'Traduction',
    'settings.choose_translation': 'Choisir la traduction',
    'settings.reciter': 'Récitateur',
    'settings.choose_reciter': 'Choisir le récitateur',
    'settings.tafsir': 'Tafsir',
    'settings.choose_tafsir': 'Choisir le tafsir',
    'settings.catalog_entries': 'entrées',
    'settings.arabic_size': 'Taille du texte arabe',
    'settings.about.sources_title': 'À propos et sources de données',
    'settings.about.sources_subtitle': 'Informations sur les services et attributions',
    'settings.about.license_title': 'Licence open-source',
    'settings.about.license_subtitle': 'GNU GPL version 3',
  },
  ru: {
    'app.title': 'Священный Коран',
    'tab.surahs': 'Суры',
    'tab.mushaf': 'Мусхаф',
    'tab.bookmarks': 'Закладки',
    'tab.search': 'Поиск',
    'tab.settings': 'Настройки',
    'common.ok': 'ОК',
    'common.cancel': 'Отмена',
    'common.go': 'Перейти',
    'surahs.search_placeholder': 'Поиск сур',
    'surahs.verses': 'аятов',
    'reader.audio': 'Аудио',
    'reader.words': 'По словам',
    'reader.hide_words': 'Скрыть слова',
    'reader.play_ayah': 'Слушать аят',
    'reader.tafsir': 'Тафсир',
    'reader.bookmark': '☆ В закладки',
    'reader.bookmarked': '✓ В закладках',
    'mushaf.title': 'Мусхаф',
    'mushaf.previous': '‹ Назад',
    'mushaf.next': 'Далее ›',
    'mushaf.go_to': 'Перейти…',
    'mushaf.page_of': 'Стр. {page} из 604',
    'mushaf.jump_title': 'Перейти к странице Мусхафа',
    'mushaf.jump_message': 'Введите номер страницы от 1 до 604.',
    'bookmarks.empty': 'Закладок пока нет. Нажмите «☆ В закладки» под любым аятом, чтобы сохранить его.',
    'search.title': 'Поиск по Корану',
    'search.placeholder': 'Поиск по переводу или арабскому тексту',
    'search.prompt': 'Введите слово или фразу для поиска по Корану.',
    'search.min_chars': 'Введите не менее двух символов.',
    'search.searching': 'Поиск…',
    'search.no_results': 'Ничего не найдено.',
    'search.verse': 'Аят',
    'catalog.search_placeholder': 'Поиск по каталогу',
    'settings.section.reading': 'Чтение и язык',
    'settings.section.offline': 'Офлайн Коран и О приложении',
    'settings.language': 'Язык приложения',
    'settings.choose_language': 'Выберите язык',
    'settings.translation': 'Перевод',
    'settings.choose_translation': 'Выберите перевод',
    'settings.reciter': 'Чтец',
    'settings.choose_reciter': 'Выберите чтеца',
    'settings.tafsir': 'Тафсир',
    'settings.choose_tafsir': 'Выберите тафсир',
    'settings.catalog_entries': 'в каталоге',
    'settings.arabic_size': 'Размер арабского шрифта',
    'settings.about.sources_title': 'О приложении и источниках данных',
    'settings.about.sources_subtitle': 'Сведения о сервисах и атрибуции',
    'settings.about.license_title': 'Открытая лицензия',
    'settings.about.license_subtitle': 'GNU GPL версии 3',
  },
  es: {
    'app.title': 'El Sagrado Corán',
    'tab.surahs': 'Suras',
    'tab.mushaf': 'Mushaf',
    'tab.bookmarks': 'Marcadores',
    'tab.search': 'Buscar',
    'tab.settings': 'Ajustes',
    'common.ok': 'Aceptar',
    'common.cancel': 'Cancelar',
    'common.go': 'Ir',
    'surahs.search_placeholder': 'Buscar suras',
    'surahs.verses': 'aleyas',
    'reader.audio': 'Audio',
    'reader.words': 'Palabras',
    'reader.hide_words': 'Ocultar palabras',
    'reader.play_ayah': 'Escuchar aleya',
    'reader.tafsir': 'Tafsir',
    'reader.bookmark': '☆ Guardar',
    'reader.bookmarked': '✓ Guardado',
    'mushaf.title': 'Mushaf',
    'mushaf.previous': '‹ Anterior',
    'mushaf.next': 'Siguiente ›',
    'mushaf.go_to': 'Ir a…',
    'mushaf.page_of': 'Página {page} de 604',
    'mushaf.jump_title': 'Ir a página del Mushaf',
    'mushaf.jump_message': 'Introduzca un número de página del 1 al 604.',
    'bookmarks.empty': 'Aún no hay aleyas guardadas. Toque «☆ Guardar» en cualquier aleya mientras lee.',
    'search.title': 'Buscar en el Corán',
    'search.placeholder': 'Buscar traducción o árabe',
    'search.prompt': 'Escriba una palabra o frase para buscar en el Corán.',
    'search.min_chars': 'Escriba al menos dos caracteres.',
    'search.searching': 'Buscando…',
    'search.no_results': 'No se encontraron resultados.',
    'search.verse': 'Aleya',
    'catalog.search_placeholder': 'Buscar en el catálogo',
    'settings.section.reading': 'Lectura e idioma',
    'settings.section.offline': 'Corán sin conexión y Acerca de',
    'settings.language': 'Idioma de la aplicación',
    'settings.choose_language': 'Elegir idioma',
    'settings.translation': 'Traducción',
    'settings.choose_translation': 'Elegir traducción',
    'settings.reciter': 'Recitador',
    'settings.choose_reciter': 'Elegir recitador',
    'settings.tafsir': 'Tafsir',
    'settings.choose_tafsir': 'Elegir tafsir',
    'settings.catalog_entries': 'en catálogo',
    'settings.arabic_size': 'Tamaño de texto árabe',
    'settings.about.sources_title': 'Acerca de y fuentes de datos',
    'settings.about.sources_subtitle': 'Información del servicio y atribuciones',
    'settings.about.license_title': 'Licencia de código abierto',
    'settings.about.license_subtitle': 'GNU GPL versión 3',
  },
  bn: {
    'app.title': 'আল-কুরআনুল কারীম',
    'tab.surahs': 'সূরা',
    'tab.mushaf': 'মুসহাফ',
    'tab.bookmarks': 'বুকমার্ক',
    'tab.search': 'অনুসন্ধান',
    'tab.settings': 'সেটিংস',
    'common.ok': 'ঠিক আছে',
    'common.cancel': 'বাতিল',
    'common.go': 'যান',
    'surahs.search_placeholder': 'সূরা অনুসন্ধান করুন',
    'surahs.verses': 'আয়াত',
    'reader.audio': 'অডিও',
    'reader.words': 'শব্দে শব্দে',
    'reader.hide_words': 'শব্দ লুকান',
    'reader.play_ayah': 'আয়াত শুনুন',
    'reader.tafsir': 'তাফসীর',
    'reader.bookmark': '☆ বুকমার্ক',
    'reader.bookmarked': '✓ সংরক্ষিত',
    'mushaf.title': 'মুসহাফ',
    'mushaf.previous': '‹ পূর্ববর্তী',
    'mushaf.next': 'পরবর্তী ›',
    'mushaf.go_to': 'পৃষ্ঠায় যান…',
    'mushaf.page_of': 'পৃষ্ঠা {page} / 604',
    'mushaf.jump_title': 'মুসহাফ পৃষ্ঠায় যান',
    'mushaf.jump_message': '১ থেকে ৬০৪ এর মধ্যে পৃষ্ঠা নম্বর লিখুন।',
    'bookmarks.empty': 'এখনও কোনো আয়াত বুকমার্ক করা হয়নি। পড়ার সময় যেকোনো আয়াতে “☆ বুকমার্ক” ট্যাপ করুন।',
    'search.title': 'কুরআন অনুসন্ধান',
    'search.placeholder': 'অনুবাদ বা আরবি অনুসন্ধান করুন',
    'search.prompt': 'কুরআনে অনুসন্ধানের জন্য একটি শব্দ বা বাক্যাংশ লিখুন।',
    'search.min_chars': 'অনুসন্ধানের জন্য অন্তত দুটি অক্ষর লিখুন।',
    'search.searching': 'অনুসন্ধান করা হচ্ছে…',
    'search.no_results': 'কোনো ফলাফল পাওয়া যায়নি।',
    'search.verse': 'আয়াত',
    'catalog.search_placeholder': 'সম্পূর্ণ ক্যাটালগে খুঁজুন',
    'settings.section.reading': 'পাঠ ও ভাষা',
    'settings.section.offline': 'অফলাইন কুরআন ও সম্পর্কে',
    'settings.language': 'অ্যাপের ভাষা',
    'settings.choose_language': 'অ্যাপের ভাষা নির্বাচন করুন',
    'settings.translation': 'অনুবাদ',
    'settings.choose_translation': 'অনুবাদ নির্বাচন করুন',
    'settings.reciter': 'ক্বারী',
    'settings.choose_reciter': 'ক্বারী নির্বাচন করুন',
    'settings.tafsir': 'তাফসীর',
    'settings.choose_tafsir': 'তাফসীর নির্বাচন করুন',
    'settings.catalog_entries': 'টি ক্যাটালগ এন্ট্রি',
    'settings.arabic_size': 'আরবি লেখার আকার',
    'settings.about.sources_title': 'সম্পর্কে ও ডেটা উৎস',
    'settings.about.sources_subtitle': 'সার্ভিস, পৃষ্ঠার ছবি এবং কৃতজ্ঞতা তথ্য',
    'settings.about.license_title': 'ওপেন সোর্স লাইসেন্স',
    'settings.about.license_subtitle': 'GNU GPL সংস্করণ ৩',
  },
};

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
  const [uiLang, setUiLang] = useState<AppLangCode>(() => {
    const saved = localStorage.getItem('sim_appUILanguageCode') as AppLangCode;
    return saved && UI_STRINGS[saved] ? saved : 'en';
  });
  const [translationId, setTranslationId] = useState<number>(() => Number(localStorage.getItem('sim_translationID')) || 20);
  const [reciterId, setReciterId] = useState<number>(() => Number(localStorage.getItem('sim_reciterID')) || 7);
  const [tafsirId, setTafsirId] = useState<number>(() => Number(localStorage.getItem('sim_tafsirID')) || 169);
  const [arabicFontSize, setArabicFontSize] = useState<number>(() => Number(localStorage.getItem('sim_readingSize')) || 28);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const tr = (key: string): string => {
    return UI_STRINGS[uiLang]?.[key] || UI_STRINGS.en[key] || key;
  };
  const isRTL = uiLang === 'ar' || uiLang === 'ur';

  const handleSelectLanguage = (code: AppLangCode) => {
    setUiLang(code);
    localStorage.setItem('sim_appUILanguageCode', code);
    setShowLanguageModal(false);
  };

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
  const [searchStatus, setSearchStatus] = useState('');

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

  // Load Bundled Catalogs on Mount
  useEffect(() => {
    fetch('/api/quran/bundled-catalog')
      .then((r) => r.json())
      .then((data) => {
        if (data.translations?.translations) setTranslationsCatalog(data.translations.translations);
        if (data.chapter_reciters?.reciters) setRecitersCatalog(data.chapter_reciters.reciters);
        if (data.tafsirs?.tafsirs) setTafsirsCatalog(data.tafsirs.tafsirs);
      })
      .catch(() => {});
  }, []);

  // Load 114 Chapters whenever UI Language changes
  useEffect(() => {
    fetch(`https://api.quran.com/api/v4/chapters?language=${uiLang}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.chapters) setChapters(data.chapters);
      })
      .catch(() => {
        fetch('/api/quran/bundled-chapters')
          .then((r) => r.json())
          .then((data) => {
            if (data.chapters) setChapters(data.chapters);
          });
      });
  }, [uiLang]);

  // Load Verses when a Chapter is selected
  useEffect(() => {
    if (!selectedChapter) return;
    let cancelled = false;
    setLoadingVerses(true);
    const params = new URLSearchParams({
      language: uiLang,
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
  }, [selectedChapter, translationId, showingWords, uiLang]);

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
        title: tr('app.title'),
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
        setNoticeModal({ title: tr('app.title'), message: 'Recitation could not be started.' });
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
        setNoticeModal({ title: tr('app.title'), message: 'Ayah recitation could not be started.' });
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
    setActiveTafsir({ verseKey, resourceName: `${tr('reader.tafsir')}…`, html: '' });
    fetch(`https://api.quran.com/api/v4/tafsirs/${tafsirId}/by_ayah/${verseKey}`)
      .then((r) => r.json())
      .then((data) => {
        const text = data?.tafsir?.text || '<p>No tafsir text available for this ayah in the selected catalog.</p>';
        const name = data?.tafsir?.resource_name || tr('reader.tafsir');
        setActiveTafsir({ verseKey, resourceName: name, html: text });
        setLoadingTafsir(false);
      })
      .catch(() => {
        setActiveTafsir({
          verseKey,
          resourceName: tr('reader.tafsir'),
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
      setSearchStatus(tr('search.min_chars'));
      return;
    }
    setSearching(true);
    setSearchStatus(tr('search.searching'));
    fetch(
      `https://api.quran.com/api/v4/search?q=${encodeURIComponent(trimmed)}&language=${uiLang}&size=25&translations=${translationId}`
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
        if (mapped.length === 0) setSearchStatus(tr('search.no_results'));
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

  const currentLangObj = APP_LANGUAGES.find((l) => l.code === uiLang) || APP_LANGUAGES[0];
  const BackChevron = isRTL ? ChevronRight : ChevronLeft;

  return (
    <div className="flex flex-col items-center">
      {/* Device & Multilingual Selector Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 w-full mb-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setDeviceIdiom('iphone')}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              deviceIdiom === 'iphone' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            iPhone 8 · iOS 12.5.7
          </button>
          <button
            type="button"
            onClick={() => setDeviceIdiom('ipad')}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              deviceIdiom === 'ipad' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            iPad mini 2 · iOS 12.5.7
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/80">
            <Globe className="w-3.5 h-3.5 text-[#0D6E5C] shrink-0" />
            <select
              aria-label="UI Language"
              value={uiLang}
              onChange={(e) => handleSelectLanguage(e.target.value as AppLangCode)}
              className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none cursor-pointer"
            >
              {APP_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeLabel}
                </option>
              ))}
            </select>
          </div>

          {playingTrackTitle && (
            <div className="flex items-center gap-2 text-xs text-emerald-900 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
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
          dir={isRTL ? 'rtl' : 'ltr'}
          className={`bg-white rounded-[22px] overflow-hidden flex flex-col border border-slate-700/40 relative ${
            deviceIdiom === 'ipad' ? 'h-[620px]' : 'h-[600px]'
          }`}
        >
          {/* iOS 12 Status Bar */}
          <div
            dir="ltr"
            className="h-6 bg-[#FCFAF5] px-4 flex items-center justify-between text-[11px] font-medium text-slate-800 select-none shrink-0 border-b border-slate-200/60 tabular-nums"
          >
            <span>iOS 12.5 · {uiLang.toUpperCase()}</span>
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
                  <BackChevron className="w-4 h-4" />
                  <span>{selectedChapter?.name_simple || tr('tab.surahs')}</span>
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
                  <BackChevron className="w-4 h-4" />
                  <span>{tr('tab.surahs')}</span>
                </button>
                <span className="text-sm font-semibold text-slate-900 truncate">{selectedChapter.name_simple}</span>
                <div className="flex items-center gap-2.5 text-xs font-medium text-[#0D6E5C]">
                  <button
                    type="button"
                    onClick={() => setShowingWords((v) => !v)}
                    className="hover:underline whitespace-nowrap shrink-0"
                  >
                    {showingWords ? tr('reader.hide_words') : tr('reader.words')}
                  </button>
                  <button
                    type="button"
                    onClick={() => playChapterAudio(selectedChapter)}
                    className="hover:underline whitespace-nowrap shrink-0"
                  >
                    {tr('reader.audio')}
                  </button>
                </div>
              </>
            ) : activeTab === 'mushaf' ? (
              <>
                <span className="w-12" />
                <span className="text-sm font-semibold text-slate-900">{tr('mushaf.title')}</span>
                <button
                  type="button"
                  onClick={() => {
                    setPageJumpInput(String(mushafPage));
                    setShowPageJumpModal(true);
                  }}
                  className="text-xs font-medium text-[#0D6E5C] hover:underline whitespace-nowrap shrink-0"
                >
                  {tr('mushaf.go_to')}
                </button>
              </>
            ) : (
              <>
                <span className="w-8" />
                <span className="text-sm font-semibold text-slate-900">
                  {activeTab === 'surahs' && tr('app.title')}
                  {activeTab === 'bookmarks' && tr('tab.bookmarks')}
                  {activeTab === 'search' && tr('search.title')}
                  {activeTab === 'settings' && tr('tab.settings')}
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
                    <div className="text-xs font-semibold text-slate-500">
                      {tr('search.verse')} {activeTafsir.verseKey}
                    </div>
                    {loadingTafsir ? (
                      <div className="py-16 text-center text-sm text-slate-500">{tr('search.searching')}</div>
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
                        {selectedChapter.name_simple}…
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
                                  {isSaved ? tr('reader.bookmarked') : tr('reader.bookmark')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => playVerseAudio(verse.verseKey)}
                                  className="hover:underline whitespace-nowrap shrink-0"
                                >
                                  {tr('reader.play_ayah')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openTafsir(verse.verseKey)}
                                  className="hover:underline whitespace-nowrap shrink-0"
                                >
                                  {tr('reader.tafsir')}
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
                        placeholder={tr('surahs.search_placeholder')}
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
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-start"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-7 text-xs font-semibold text-slate-400 tabular-nums shrink-0">
                                {ch.id}
                              </span>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-slate-900 truncate">{ch.name_simple}</div>
                                <div className="text-[11px] text-slate-500 truncate tabular-nums">
                                  {trans} · {ch.verses_count} {tr('surahs.verses')} ·{' '}
                                  {ch.revelation_place.charAt(0).toUpperCase() + ch.revelation_place.slice(1)}
                                </div>
                              </div>
                            </div>
                            <span className="font-arabic text-xl text-slate-900 shrink-0 ps-3">{ch.name_arabic}</span>
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
                    {tr('mushaf.previous')}
                  </button>
                  <span className="text-slate-800 tabular-nums">
                    {tr('mushaf.page_of').replace('{page}', String(mushafPage))}
                  </span>
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
                    {tr('mushaf.next')}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: BOOKMARKS */}
            {activeTab === 'bookmarks' && (
              <div>
                {bookmarks.length === 0 ? (
                  <div className="py-24 px-6 text-center text-xs text-slate-500 leading-relaxed">
                    {tr('bookmarks.empty')}
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
                    placeholder={tr('search.placeholder')}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0D6E5C]"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-[#0D6E5C] text-white text-xs font-medium rounded-md hover:bg-emerald-800 whitespace-nowrap shrink-0"
                  >
                    {tr('tab.search')}
                  </button>
                </form>

                {searching || searchResults.length === 0 ? (
                  <div className="py-20 px-6 text-center text-xs text-slate-500">
                    {searchStatus || tr('search.prompt')}
                  </div>
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
                        className="w-full p-4 text-start space-y-2 hover:bg-slate-50 transition-colors block"
                      >
                        <div className="text-xs font-semibold text-[#0D6E5C] tabular-nums">
                          {tr('search.verse')} {res.verseKey}
                        </div>
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

            {/* TAB 5: SETTINGS (including App Language row at (0,0)) */}
            {activeTab === 'settings' && (
              <div className="bg-[#F4F2ED] min-h-full py-3 space-y-5 text-xs">
                <div>
                  <div className="px-4 pb-1.5 text-[11px] font-semibold text-slate-500">
                    {tr('settings.section.reading')}
                  </div>
                  <div className="bg-white border-y border-slate-200 divide-y divide-slate-200">
                    <button
                      type="button"
                      onClick={() => setShowLanguageModal(true)}
                      className="w-full px-4 py-2.5 text-start flex items-center justify-between hover:bg-slate-50"
                    >
                      <div>
                        <div className="font-medium text-slate-900">{tr('settings.language')}</div>
                        <div className="text-[11px] text-[#0D6E5C] font-medium">
                          {currentLangObj.nativeLabel}
                        </div>
                      </div>
                      <span className="text-slate-400">{isRTL ? '‹' : '›'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCatalogFilter('');
                        setActiveCatalogModal('translations');
                      }}
                      className="w-full px-4 py-2.5 text-start flex items-center justify-between hover:bg-slate-50"
                    >
                      <div>
                        <div className="font-medium text-slate-900">{tr('settings.translation')}</div>
                        <div className="text-[11px] text-slate-500 tabular-nums">
                          {getResourceDisplayName(translationsCatalog, translationId, `Resource ${translationId}`)} ·{' '}
                          {translationsCatalog.length} {tr('settings.catalog_entries')}
                        </div>
                      </div>
                      <span className="text-slate-400">{isRTL ? '‹' : '›'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCatalogFilter('');
                        setActiveCatalogModal('reciters');
                      }}
                      className="w-full px-4 py-2.5 text-start flex items-center justify-between hover:bg-slate-50"
                    >
                      <div>
                        <div className="font-medium text-slate-900">{tr('settings.reciter')}</div>
                        <div className="text-[11px] text-slate-500 tabular-nums">
                          {getResourceDisplayName(recitersCatalog, reciterId, `Reciter ${reciterId}`)} ·{' '}
                          {recitersCatalog.length} {tr('settings.catalog_entries')}
                        </div>
                      </div>
                      <span className="text-slate-400">{isRTL ? '‹' : '›'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCatalogFilter('');
                        setActiveCatalogModal('tafsirs');
                      }}
                      className="w-full px-4 py-2.5 text-start flex items-center justify-between hover:bg-slate-50"
                    >
                      <div>
                        <div className="font-medium text-slate-900">{tr('settings.tafsir')}</div>
                        <div className="text-[11px] text-slate-500 tabular-nums">
                          {getResourceDisplayName(tafsirsCatalog, tafsirId, `Tafsir ${tafsirId}`)} ·{' '}
                          {tafsirsCatalog.length} {tr('settings.catalog_entries')}
                        </div>
                      </div>
                      <span className="text-slate-400">{isRTL ? '‹' : '›'}</span>
                    </button>

                    <div className="px-4 py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-900">{tr('settings.arabic_size')}</div>
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
                  <div className="px-4 pb-1.5 text-[11px] font-semibold text-slate-500">
                    {tr('settings.section.offline')}
                  </div>
                  <div className="bg-white border-y border-slate-200 divide-y divide-slate-200">
                    <button
                      type="button"
                      onClick={() =>
                        setNoticeModal({
                          title: tr('settings.about.sources_title'),
                          message:
                            'Quran text, translation catalogs, tafsir, and recitation catalogs are loaded from Quran.com API services. Madani Mushaf page images stream from files.quran.app. Bundled seed data includes all 114 Surah headers, catalog indexes, and opening Mushaf pages.',
                        })
                      }
                      className="w-full px-4 py-2.5 text-start flex items-center justify-between hover:bg-slate-50"
                    >
                      <div>
                        <div className="font-medium text-slate-900">{tr('settings.about.sources_title')}</div>
                        <div className="text-[11px] text-slate-500">{tr('settings.about.sources_subtitle')}</div>
                      </div>
                      <span className="text-slate-400">{isRTL ? '‹' : '›'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setNoticeModal({
                          title: tr('settings.about.license_title'),
                          message:
                            'This app source is free software under GNU GPL version 3. You may redistribute and modify it under that license.',
                        })
                      }
                      className="w-full px-4 py-2.5 text-start flex items-center justify-between hover:bg-slate-50"
                    >
                      <div>
                        <div className="font-medium text-slate-900">{tr('settings.about.license_title')}</div>
                        <div className="text-[11px] text-slate-500">{tr('settings.about.license_subtitle')}</div>
                      </div>
                      <span className="text-slate-400">{isRTL ? '‹' : '›'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* App Language Picker Action Sheet Modal */}
            {showLanguageModal && (
              <div className="absolute inset-0 bg-black/40 z-30 flex flex-col justify-end p-3">
                <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-slate-200 divide-y divide-slate-200">
                  <div className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 bg-[#FCFAF5]">
                    {tr('settings.choose_language')}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {APP_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleSelectLanguage(lang.code)}
                        className="w-full px-4 py-2.5 text-xs font-medium text-slate-900 hover:bg-slate-50 flex items-center justify-between"
                      >
                        <span>{lang.nativeLabel}</span>
                        {uiLang === lang.code && <Check className="w-4 h-4 text-[#0D6E5C]" />}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLanguageModal(false)}
                    className="w-full py-2.5 text-xs font-semibold text-[#0D6E5C] bg-[#FCFAF5] hover:bg-slate-50"
                  >
                    {tr('common.cancel')}
                  </button>
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
                    {tr('common.cancel')}
                  </button>
                  <span className="text-xs font-semibold text-slate-900">
                    {activeCatalogModal === 'translations' && tr('settings.choose_translation')}
                    {activeCatalogModal === 'reciters' && tr('settings.choose_reciter')}
                    {activeCatalogModal === 'tafsirs' && tr('settings.choose_tafsir')}
                  </span>
                  <span className="w-10" />
                </div>
                <div className="p-2 bg-[#F4F2ED] border-b border-slate-200 shrink-0">
                  <input
                    type="text"
                    value={catalogFilter}
                    onChange={(e) => setCatalogFilter(e.target.value)}
                    placeholder={tr('catalog.search_placeholder')}
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
                          className="w-full px-4 py-2.5 text-start flex items-center justify-between hover:bg-slate-50"
                        >
                          <div className="pe-2">
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
                    <div className="text-sm font-semibold text-slate-900">{tr('mushaf.jump_title')}</div>
                    <div className="text-xs text-slate-600">{tr('mushaf.jump_message')}</div>
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
                      {tr('common.cancel')}
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
                      {tr('common.go')}
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
                    {tr('common.ok')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* UITabBar (MainTabBarController) */}
          <div className="h-12 bg-[#FCFAF5] border-t border-slate-200 grid grid-cols-5 shrink-0 select-none">
            {[
              { id: 'surahs', label: tr('tab.surahs'), Icon: BookOpen },
              { id: 'mushaf', label: tr('tab.mushaf'), Icon: FileText },
              { id: 'bookmarks', label: tr('tab.bookmarks'), Icon: BookmarkIcon },
              { id: 'search', label: tr('tab.search'), Icon: SearchIcon },
              { id: 'settings', label: tr('tab.settings'), Icon: SettingsIcon },
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
