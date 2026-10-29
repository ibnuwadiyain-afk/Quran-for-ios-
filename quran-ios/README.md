# Quran Reader for iOS 12

A native UIKit Quran-reader project targeting iOS 12 and 64-bit iPad/iPhone hardware, including iPad mini 2. This is an independent iOS implementation inspired by the feature set of [Quran for Android](https://github.com/quran/quran_android); it is not a direct build of the Android/Kotlin project.

## Included features

This is a native UIKit implementation targeting iOS 12, with the Android app’s principal Quran-reading feature families represented. It is not a line-by-line port of Android-specific UI, services, or every Android-only integration.

- Surah index with Arabic names, English names, verse counts, and revelation-place labels.
- Verse-by-verse Arabic Uthmani reading with translation catalogs loaded dynamically from the API.
- Word-by-word Arabic, transliteration, and translation display with playable word-audio links when the provider supplies them; per-ayah recitation as well as chapter playback.
- Mushaf page-image reader for all 604 Madani pages, with swipe and page-number navigation.
- Per-ayah tafsir view and searchable tafsir catalog.
- Full translation, chapter-reciter, and tafsir resource catalogs with in-app search/pickers.
- Quran translation search, on-device bookmarks, last-read tracking, and adjustable text size.
- Chapter recitation playback and audio downloads for offline playback.
- User-triggered offline download of all 604 Mushaf page images and page-by-page Quran data (Arabic, the currently selected translation, and word-by-word fields), indexed into local chapter caches.
- Resume-friendly offline download: successfully saved page data/images are reused on retry; previously loaded content remains locally cached.
- Settings/about/license screens and removal of downloaded Quran content.

## Build the unsigned IPA with GitHub Actions

1. Push this folder to a GitHub repository.
2. Open **Actions → Build unsigned iOS app → Run workflow** (or push to `main`/`master`).
3. Download the `QuranReader-unsigned-ipa` artifact from the workflow run.
4. Sign/re-sign the IPA with your own Apple Developer certificate and provisioning profile before installing it on a device.

The included workflow runs on a macOS GitHub runner, installs XcodeGen, generates the Xcode project, builds for the iOS device SDK with code signing disabled, and packages the `.app` in an `.ipa` ZIP. An unsigned IPA is not directly installable on a physical iPad; it must be signed first. This environment cannot execute Xcode, so the workflow is provided as the reproducible macOS build path rather than claiming a tested IPA was produced here.

## Build locally on a Mac

Requirements: macOS with Xcode and Homebrew.

```sh
brew install xcodegen
xcodegen generate --spec project.yml
xcodebuild -project QuranForiOS12.xcodeproj \
  -scheme QuranForiOS12 -sdk iphoneos -configuration Release \
  -derivedDataPath build CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO build
```

The app bundle is under `build/Build/Products/Release-iphoneos/`. For a local unsigned IPA, place the `.app` in a directory named `Payload` and zip that directory with an `.ipa` extension; then sign it before installing.

## Google AI Studio

AI Studio can be used to inspect or edit the Swift source, but it does not replace an Apple toolchain for compiling an iOS app. Use the included GitHub Actions workflow (a macOS runner with Xcode) or a Mac with Xcode to build it.

## Network, content, and licensing notes

- Chapter metadata, verse/word data, translation/reciter/tafsir catalogs, tafsir text, search, and recitation URLs are retrieved from Quran.com API services. Mushaf page images stream from the Quran for Android data host. Internet is needed until the user downloads the full offline set; tafsir/search/resource catalog refreshes still require internet.
- The full-offline action saves the 604 Madani page images and complete Arabic text, selected translation, and word-level Arabic/transliteration/translation data. It does not bundle every translation, every tafsir, or every recitation offline.
- Service endpoints, translation/reciter IDs, availability, rate limits, and content terms can change. Check the provider's current terms and the license/permission of each selected translation and recitation before redistribution. The source app repository itself notes that data assets have their own licenses and credits; non-profit use does not automatically grant reuse rights.
- The Android source project is GPL-3.0. Its README credits Madani page images to the quran.com-images project; image/text/audio/translation licenses and permissions are separate from the app code. This source is provided under GPL-3.0; see `LICENSE`. If you distribute a modified/derived app, comply with the license, preserve required notices, and make the corresponding source available as required.
- This code has not been compiled or exercised with Xcode in this Linux workspace. Validate API responses, audio playback, Arabic rendering, and signing on a Mac/device before distribution.
